import { useEffect, useMemo, useState } from 'react'
import { createDeliveryLogs, fetchDeliveryLogs, type DeliveryLogEntry, type DeliveryLogStatus } from '../services/deliveryLogService'
import { fetchReceiptPage, updateReceipt, type UpdateReceiptPayload } from '../services/receiptApiService'
import { createSingleReceiptPdfBlob, generateMergedReceiptsPdf, getReceiptFileName } from '../services/pdfService'
import { sendReceiptOnWhatsApp } from '../services/whatsappService'
import type { DbReceipt, ReceiptListFilters, ReceiptListPage, ReceiptRow } from '../types'
import { ReceiptTemplate } from './ReceiptTemplate'
import { formatPaymentMonth, toIndianWords } from '../utils'

const PAGE_SIZE = 20

function getCurrentMonthFilter(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function toReceiptRow(receipt: DbReceipt): ReceiptRow {
  const monthLabel = formatPaymentMonth('', receipt.receiptDate)

  return {
    sourceRow: receipt.id,
    receiptNumber: receipt.receiptNumber,
    date: receipt.receiptDate,
    name: receipt.memberName,
    flatShopNo: receipt.flatShopNo,
    paymentForMonth: monthLabel,
    paymentMode: 'Online',
    rupeesText: toIndianWords(receipt.totalAmount),
    cashOrChequeNo: '',
    dated: receipt.receiptDate,
    bank: '',
    maintContribution: receipt.maintContribution,
    shareCapital: receipt.shareCapital,
    entranceFees: receipt.entranceFees,
    developmentsFund: receipt.developmentsFund,
    penaltyInterest: receipt.penaltyInterest,
    totalAmount: receipt.totalAmount,
  }
}

function sanitizeMobile(value?: string | null): string {
  if (!value) {
    return ''
  }
  return value.replace(/[^0-9]/g, '')
}

type WhatsAppFlag = DeliveryLogStatus | 'not-sent' | 'checking'

function getWhatsAppFlagMeta(flag: WhatsAppFlag): { label: string; className: string } {
  if (flag === 'sent') {
    return { label: 'Sent', className: 'text-bg-success' }
  }
  if (flag === 'failed') {
    return { label: 'Failed', className: 'text-bg-danger' }
  }
  if (flag === 'retry') {
    return { label: 'Retry', className: 'text-bg-warning' }
  }
  if (flag === 'checking') {
    return { label: 'Checking...', className: 'text-bg-secondary' }
  }
  return { label: 'Not Sent', className: 'text-bg-light border text-dark' }
}

export function GenerateReceiptsScreen() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<ReceiptListFilters>({
    month: getCurrentMonthFilter(),
    query: '',
  })
  const [draftFilters, setDraftFilters] = useState<ReceiptListFilters>({
    month: getCurrentMonthFilter(),
    query: '',
  })

  const [data, setData] = useState<ReceiptListPage>({
    items: [],
    paging: {
      limit: PAGE_SIZE,
      offset: 0,
      total: 0,
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isGeneratingBulkPdf, setIsGeneratingBulkPdf] = useState(false)
  const [isSendingToMobile, setIsSendingToMobile] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<DbReceipt | null>(null)
  const [editForm, setEditForm] = useState<UpdateReceiptPayload>({})
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [whatsAppFlags, setWhatsAppFlags] = useState<Record<number, WhatsAppFlag>>({})

  async function refreshWhatsAppFlags(items: DbReceipt[]): Promise<void> {
    if (items.length === 0) {
      setWhatsAppFlags({})
      return
    }

    const entries = await Promise.all(
      items.map(async (item) => {
        try {
          const logPage = await fetchDeliveryLogs({ receiptId: item.id, limit: 1, offset: 0 })
          const latestStatus = logPage.items[0]?.status ?? 'not-sent'
          return [item.id, latestStatus] as const
        } catch {
          return [item.id, 'not-sent'] as const
        }
      }),
    )

    setWhatsAppFlags(Object.fromEntries(entries))
  }

  async function loadReceipts(requestedPage: number, requestFilters: ReceiptListFilters): Promise<void> {
    setLoading(true)
    setError('')

    try {
      const result = await fetchReceiptPage({
        page: requestedPage,
        limit: PAGE_SIZE,
        filters: requestFilters,
      })
      setData(result)
      setSelectedIds(new Set())
      setWhatsAppFlags(
        Object.fromEntries(result.items.map((item) => [item.id, 'checking' as WhatsAppFlag])),
      )
      void refreshWhatsAppFlags(result.items)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load receipts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReceipts(page, filters)
  }, [page, filters])

  const selectedReceipts = useMemo(
    () => data.items.filter((item) => selectedIds.has(item.id)),
    [data.items, selectedIds],
  )

  const selectedRows = useMemo(() => selectedReceipts.map(toReceiptRow), [selectedReceipts])

  const editTotalAmount = useMemo(
    () =>
      Number(editForm.maintContribution ?? 0) +
      Number(editForm.shareCapital ?? 0) +
      Number(editForm.entranceFees ?? 0) +
      Number(editForm.developmentsFund ?? 0) +
      Number(editForm.penaltyInterest ?? 0),
    [
      editForm.maintContribution,
      editForm.shareCapital,
      editForm.entranceFees,
      editForm.developmentsFund,
      editForm.penaltyInterest,
    ],
  )

  const totalPages = Math.max(1, Math.ceil(data.paging.total / PAGE_SIZE))
  const allVisibleSelected = data.items.length > 0 && data.items.every((item) => selectedIds.has(item.id))

  function openEdit(receipt: DbReceipt) {
    setEditingReceipt(receipt)
    setEditForm({
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate,
      memberName: receipt.memberName,
      flatShopNo: receipt.flatShopNo,
      totalAmount: receipt.totalAmount,
      maintContribution: receipt.maintContribution,
      shareCapital: receipt.shareCapital,
      entranceFees: receipt.entranceFees,
      developmentsFund: receipt.developmentsFund,
      penaltyInterest: receipt.penaltyInterest,
      mobileNo: receipt.mobileNo ?? '',
      notes: receipt.notes ?? '',
    })
    setEditError('')
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editingReceipt) {
      return
    }

    setIsSavingEdit(true)
    setEditError('')

    try {
      const payload: UpdateReceiptPayload = {
        ...editForm,
        totalAmount: editTotalAmount,
        mobileNo: editForm.mobileNo?.trim() || null,
        notes: editForm.notes?.trim() || null,
      }
      const updated = await updateReceipt(editingReceipt.id, payload)
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
      }))
      setEditingReceipt(null)
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : 'Failed to save changes.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleGenerateSelectedPdf(): Promise<void> {
    if (selectedRows.length === 0) {
      setStatusMessage('Select at least one receipt to generate PDF.')
      return
    }

    setIsGeneratingBulkPdf(true)
    setStatusMessage('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 120))
      const pages = Array.from(document.querySelectorAll('.db-pdf-receipt-page')) as HTMLElement[]
      await generateMergedReceiptsPdf(pages)
      setStatusMessage(`Generated merged PDF for ${selectedRows.length} selected receipt(s).`)
    } catch (pdfError) {
      setStatusMessage(pdfError instanceof Error ? pdfError.message : 'Failed to generate selected receipts PDF.')
    } finally {
      setIsGeneratingBulkPdf(false)
    }
  }

  async function handleSendToMobile(): Promise<void> {
    if (selectedReceipts.length === 0) {
      setStatusMessage('Select at least one receipt to send to mobile.')
      return
    }

    setIsSendingToMobile(true)
    setStatusMessage('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 120))
      const pages = Array.from(document.querySelectorAll('.db-pdf-receipt-page')) as HTMLElement[]
      if (pages.length !== selectedReceipts.length) {
        throw new Error('Unable to prepare all selected receipt pages for WhatsApp send.')
      }

      const logs: DeliveryLogEntry[] = []
      let sentCount = 0
      let failedCount = 0

      for (let index = 0; index < selectedReceipts.length; index += 1) {
        const item = selectedReceipts[index]
        const page = pages[index]
        const mobile = sanitizeMobile(item.mobileNo)

        if (!page) {
          failedCount += 1
          logs.push({
            receiptId: item.id,
            receiptNumber: item.receiptNumber,
            mobileNo: item.mobileNo ?? undefined,
            channel: 'whatsapp' as const,
            status: 'failed' as const,
            errorMessage: 'Receipt page is not available for PDF generation',
          })
          continue
        }

        if (mobile.length < 7) {
          failedCount += 1
          logs.push({
            receiptId: item.id,
            receiptNumber: item.receiptNumber,
            mobileNo: item.mobileNo ?? undefined,
            channel: 'whatsapp' as const,
            status: 'failed' as const,
            errorMessage: 'No valid mobile number',
          })
          continue
        }

        try {
          const pdfBlob = await createSingleReceiptPdfBlob(page)
          const message = `Receipt ${item.receiptNumber} of amount Rs.${item.totalAmount.toLocaleString('en-IN')} has been generated.`
          await sendReceiptOnWhatsApp({
            to: mobile,
            message,
            pdfBlob,
            fileName: getReceiptFileName(item.receiptNumber),
          })

          sentCount += 1
          logs.push({
            receiptId: item.id,
            receiptNumber: item.receiptNumber,
            mobileNo: mobile,
            channel: 'whatsapp' as const,
            status: 'sent' as const,
          })
        } catch (sendError) {
          failedCount += 1
          logs.push({
            receiptId: item.id,
            receiptNumber: item.receiptNumber,
            mobileNo: mobile,
            channel: 'whatsapp' as const,
            status: 'failed' as const,
            errorMessage: sendError instanceof Error ? sendError.message : 'Failed to send via Twilio WhatsApp',
          })
        }
      }

      createDeliveryLogs(logs).catch((logError) => {
        console.error('Delivery log write failed:', logError)
      })

      setWhatsAppFlags((prev) => {
        const next = { ...prev }
        logs.forEach((log) => {
          if (typeof log.receiptId === 'number') {
            next[log.receiptId] = log.status
          }
        })
        return next
      })

      if (sentCount === 0) {
        setStatusMessage('No receipts were sent. Check mobile numbers and Twilio configuration.')
      } else if (failedCount > 0) {
        setStatusMessage(`Sent ${sentCount} receipt(s). Failed ${failedCount} receipt(s). Check delivery logs for details.`)
      } else {
        setStatusMessage(`Successfully sent ${sentCount} receipt(s) via Twilio WhatsApp.`)
      }
    } catch (mobileError) {
      setStatusMessage(mobileError instanceof Error ? mobileError.message : 'Failed to send selected receipts to mobile.')
    } finally {
      setIsSendingToMobile(false)
    }
  }

  return (
    <>
      <section className="card card-warning card-outline">
        <div className="card-header">
          <h3 className="card-title">Generate Receipts</h3>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">View saved receipts, filter by month, paginate results, and run bulk actions.</p>

          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label mb-1">Month</label>
              <input
                type="month"
                className="form-control"
                value={draftFilters.month ?? ''}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, month: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label mb-1">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Receipt no, name, flat/shop, mobile"
                value={draftFilters.query ?? ''}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, query: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-4">
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => {
                    setPage(1)
                    setFilters({ month: draftFilters.month || undefined, query: draftFilters.query || undefined })
                  }}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    const reset = { month: getCurrentMonthFilter(), query: '' }
                    setDraftFilters(reset)
                    setPage(1)
                    setFilters(reset)
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="export-row mt-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateSelectedPdf}
              disabled={isGeneratingBulkPdf || selectedRows.length === 0}
            >
              <i className="fas fa-file-pdf me-2" aria-hidden="true" />
              {isGeneratingBulkPdf ? 'Generating...' : `Generate PDF (${selectedRows.length})`}
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleSendToMobile}
              disabled={isSendingToMobile || selectedRows.length === 0}
            >
              <i className="fas fa-mobile-alt me-2" aria-hidden="true" />
              {isSendingToMobile ? 'Sending...' : 'Send to Mobile'}
            </button>
            <span className="badge text-bg-light border">Default view: current month</span>
          </div>

          {statusMessage && <div className="alert alert-info mt-3 mb-0">{statusMessage}</div>}
          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </section>

      <section className="card card-outline card-dark">
        <div className="card-header">
          <h3 className="card-title">Receipts Table</h3>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '44px' }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setSelectedIds((prev) => {
                          const next = new Set(prev)
                          data.items.forEach((item) => {
                            if (checked) {
                              next.add(item.id)
                            } else {
                              next.delete(item.id)
                            }
                          })
                          return next
                        })
                      }}
                    />
                  </th>
                  <th scope="col">Receipt No</th>
                  <th scope="col">Date</th>
                  <th scope="col">Member</th>
                  <th scope="col">Flat/Shop</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">WhatsApp</th>
                  <th scope="col" style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      Loading receipts...
                    </td>
                  </tr>
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      No receipts found for selected filter.
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(event) => {
                            const checked = event.target.checked
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (checked) {
                                next.add(item.id)
                              } else {
                                next.delete(item.id)
                              }
                              return next
                            })
                          }}
                        />
                      </td>
                      <td>{item.receiptNumber}</td>
                      <td>{item.receiptDate}</td>
                      <td>{item.memberName}</td>
                      <td>{item.flatShopNo}</td>
                      <td>{item.totalAmount.toLocaleString('en-IN')}</td>
                      <td>{item.mobileNo || '-'}</td>
                      <td>
                        <span className={`badge ${getWhatsAppFlagMeta(whatsAppFlags[item.id] ?? 'checking').className}`}>
                          {getWhatsAppFlagMeta(whatsAppFlags[item.id] ?? 'checking').label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          title="Edit"
                          onClick={() => openEdit(item)}
                        >
                          <i className="fas fa-pencil-alt" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span className="text-muted small">
            Showing {data.items.length} of {data.paging.total} receipts
          </span>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
              Page {page} / {totalPages}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {editingReceipt && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Receipt #{editingReceipt.receiptNumber}</h5>
                <button type="button" className="btn-close" onClick={() => setEditingReceipt(null)} />
              </div>
              <div className="modal-body">
                {editError && <div className="alert alert-danger">{editError}</div>}
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label">Receipt Number</label>
                    <input className="form-control" value={editForm.receiptNumber ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, receiptNumber: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={editForm.receiptDate ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, receiptDate: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Member Name</label>
                    <input className="form-control" value={editForm.memberName ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, memberName: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Flat / Shop No</label>
                    <input className="form-control" value={editForm.flatShopNo ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, flatShopNo: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Total Amount</label>
                    <input type="number" min="0" className="form-control" value={editTotalAmount} readOnly aria-readonly="true" />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Maint. Contribution</label>
                    <input type="number" min="0" className="form-control" value={editForm.maintContribution ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, maintContribution: Number(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Share Capital</label>
                    <input type="number" min="0" className="form-control" value={editForm.shareCapital ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, shareCapital: Number(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Entrance Fees</label>
                    <input type="number" min="0" className="form-control" value={editForm.entranceFees ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, entranceFees: Number(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Developments Fund</label>
                    <input type="number" min="0" className="form-control" value={editForm.developmentsFund ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, developmentsFund: Number(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Penalty Interest</label>
                    <input type="number" min="0" className="form-control" value={editForm.penaltyInterest ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, penaltyInterest: Number(e.target.value) }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Mobile No</label>
                    <input className="form-control" value={editForm.mobileNo ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, mobileNo: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" rows={2} value={editForm.notes ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingReceipt(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="pdf-staging" aria-hidden="true">
        {selectedRows.map((row) => (
          <div key={`${row.receiptNumber}-${row.sourceRow}`} className="db-pdf-receipt-page pdf-receipt-page">
            <div className="receipt-slot">
              <ReceiptTemplate row={row} />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
