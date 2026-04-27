import type { QuickFormErrors, QuickFormValues, ReceiptRow } from '../types'
import { ReceiptTemplate } from './ReceiptTemplate'

type QuickGenerateScreenProps = {
  quickForm: QuickFormValues
  quickErrors: QuickFormErrors
  quickProcessingError: string
  isQuickGenerating: boolean
  isSendingEmail: boolean
  emailTo: string
  emailSubject: string
  emailMessage: string
  emailStatusMessage: string
  quickTotalAmount: number
  quickPreviewRow: ReceiptRow
  onFieldChange: (field: keyof QuickFormValues, value: string) => void
  onGeneratePdf: () => Promise<void>
  onSendEmail: () => Promise<void>
  onEmailToChange: (value: string) => void
  onEmailSubjectChange: (value: string) => void
  onEmailMessageChange: (value: string) => void
  onReset: () => void
}

export function QuickGenerateScreen({
  quickForm,
  quickErrors,
  quickProcessingError,
  isQuickGenerating,
  isSendingEmail,
  emailTo,
  emailSubject,
  emailMessage,
  emailStatusMessage,
  quickTotalAmount,
  quickPreviewRow,
  onFieldChange,
  onGeneratePdf,
  onSendEmail,
  onEmailToChange,
  onEmailSubjectChange,
  onEmailMessageChange,
  onReset,
}: QuickGenerateScreenProps) {
  return (
    <>
      <section className="card card-primary card-outline quick-panel">
        <div className="card-header">
          <h3 className="card-title">Quick Generate Receipt</h3>
        </div>
        <div className="card-body">
          <p className="text-muted">Fill the form and generate one receipt PDF instantly.</p>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Receipt Number <strong>*</strong>
              </label>
              <input
                className="form-control"
                value={quickForm.receiptNumber}
                onChange={(event) => onFieldChange('receiptNumber', event.target.value)}
                placeholder="R-2026-001"
              />
              {quickErrors.receiptNumber && <small className="text-danger d-block mt-1">{quickErrors.receiptNumber}</small>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Date <strong>*</strong>
              </label>
              <input
                className="form-control"
                type="date"
                value={quickForm.date}
                onChange={(event) => onFieldChange('date', event.target.value)}
              />
              {quickErrors.date && <small className="text-danger d-block mt-1">{quickErrors.date}</small>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Name <strong>*</strong>
              </label>
              <input className="form-control" value={quickForm.name} onChange={(event) => onFieldChange('name', event.target.value)} />
              {quickErrors.name && <small className="text-danger d-block mt-1">{quickErrors.name}</small>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Flat / Shop No <strong>*</strong>
              </label>
              <input
                className="form-control"
                value={quickForm.flatShopNo}
                onChange={(event) => onFieldChange('flatShopNo', event.target.value)}
              />
              {quickErrors.flatShopNo && <small className="text-danger d-block mt-1">{quickErrors.flatShopNo}</small>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Payment For Month <strong>*</strong>
              </label>
              <input
                className="form-control"
                value={quickForm.paymentForMonth}
                onChange={(event) => onFieldChange('paymentForMonth', event.target.value)}
                placeholder="April 2026"
              />
              {quickErrors.paymentForMonth && (
                <small className="text-danger d-block mt-1">{quickErrors.paymentForMonth}</small>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Payment Mode <strong>*</strong>
              </label>
              <input
                className="form-control"
                value={quickForm.paymentMode}
                onChange={(event) => onFieldChange('paymentMode', event.target.value)}
                placeholder="Online"
              />
              {quickErrors.paymentMode && <small className="text-danger d-block mt-1">{quickErrors.paymentMode}</small>}
            </div>

            <div className="col-12">
              <label className="form-label mb-1">Rupees (Text)</label>
              <input
                className="form-control"
                value={quickForm.rupeesText}
                onChange={(event) => onFieldChange('rupeesText', event.target.value)}
                placeholder="Auto-generated from total if left empty"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label mb-1">Maint. Contribution</label>
              <input
                className="form-control"
                value={quickForm.maintContribution}
                onChange={(event) => onFieldChange('maintContribution', event.target.value)}
                placeholder="0"
              />
              {quickErrors.maintContribution && (
                <small className="text-danger d-block mt-1">{quickErrors.maintContribution}</small>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label mb-1">Share Capital</label>
              <input
                className="form-control"
                value={quickForm.shareCapital}
                onChange={(event) => onFieldChange('shareCapital', event.target.value)}
                placeholder="0"
              />
              {quickErrors.shareCapital && <small className="text-danger d-block mt-1">{quickErrors.shareCapital}</small>}
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label mb-1">Entrance Fees</label>
              <input
                className="form-control"
                value={quickForm.entranceFees}
                onChange={(event) => onFieldChange('entranceFees', event.target.value)}
                placeholder="0"
              />
              {quickErrors.entranceFees && <small className="text-danger d-block mt-1">{quickErrors.entranceFees}</small>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">Developments Fund</label>
              <input
                className="form-control"
                value={quickForm.developmentsFund}
                onChange={(event) => onFieldChange('developmentsFund', event.target.value)}
                placeholder="0"
              />
              {quickErrors.developmentsFund && (
                <small className="text-danger d-block mt-1">{quickErrors.developmentsFund}</small>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">Penalty Interest</label>
              <input
                className="form-control"
                value={quickForm.penaltyInterest}
                onChange={(event) => onFieldChange('penaltyInterest', event.target.value)}
                placeholder="0"
              />
              {quickErrors.penaltyInterest && (
                <small className="text-danger d-block mt-1">{quickErrors.penaltyInterest}</small>
              )}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label mb-1">
              Total Amount <strong>*</strong>
              </label>
              <input
                className="form-control"
                value={quickTotalAmount.toLocaleString('en-IN')}
                readOnly
                aria-readonly="true"
                title="Auto-calculated from breakup amounts"
              />
              <small className="text-muted">Auto-calculated from amount breakup fields</small>
            </div>
          </div>

          <div className="actions-row mt-4">
            <button type="button" className="btn btn-primary" onClick={onGeneratePdf} disabled={isQuickGenerating}>
              <i className="fas fa-file-pdf me-2" aria-hidden="true" />
              {isQuickGenerating ? 'Generating PDF...' : 'Generate Receipt PDF'}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onReset} disabled={isQuickGenerating}>
              Reset Form
            </button>
            <span className="badge text-bg-light border">Output: single receipt PDF</span>
          </div>

          <hr className="my-4" />

          <h4 className="h6 mb-3">Email Receipt</h4>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label mb-1">Send To Email</label>
              <input
                className="form-control"
                value={emailTo}
                onChange={(event) => onEmailToChange(event.target.value)}
                placeholder="owner@example.com"
              />
            </div>
            <div className="col-12">
              <label className="form-label mb-1">Email Subject</label>
              <input
                className="form-control"
                value={emailSubject}
                onChange={(event) => onEmailSubjectChange(event.target.value)}
                placeholder="Receipt from Society"
              />
            </div>
            <div className="col-12">
              <label className="form-label mb-1">Email Message</label>
              <input
                className="form-control"
                value={emailMessage}
                onChange={(event) => onEmailMessageChange(event.target.value)}
                placeholder="Please find your receipt attached."
              />
            </div>
          </div>

          <div className="actions-row mt-3">
            <button type="button" className="btn btn-success" onClick={onSendEmail} disabled={isSendingEmail}>
              <i className="fas fa-paper-plane me-2" aria-hidden="true" />
              {isSendingEmail ? 'Sending Email...' : 'Send Receipt Email'}
            </button>
          </div>

          {quickProcessingError && <div className="alert alert-danger mt-3 mb-0">{quickProcessingError}</div>}
          {emailStatusMessage && <div className="alert alert-success mt-3 mb-0">{emailStatusMessage}</div>}
        </div>
      </section>

      <section className="card card-outline card-dark preview-panel">
        <div className="card-header">
          <h3 className="card-title">Quick Receipt Preview</h3>
        </div>
        <div className="card-body">
          <p className="text-muted">This preview is used to generate your single receipt PDF.</p>
          <div className="preview-wrap">
            <div className="preview-receipt-page">
              <div className="receipt-slot">
                <ReceiptTemplate row={quickPreviewRow} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pdf-staging" aria-hidden="true">
        <div className="quick-pdf-page">
          <div className="receipt-slot">
            <ReceiptTemplate row={quickPreviewRow} />
          </div>
        </div>
      </section>
    </>
  )
}
