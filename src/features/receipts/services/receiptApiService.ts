import type { DbReceipt, ReceiptListFilters, ReceiptListPage, ReceiptRow } from '../types'

type BulkCreatePayloadItem = {
  receiptNumber: string
  receiptDate: string
  memberName: string
  flatShopNo: string
  totalAmount: number
  maintContribution: number
  shareCapital: number
  entranceFees: number
  developmentsFund: number
  penaltyInterest: number
  mobileNo?: string
  notes?: string
}

export type BulkCreateResult = {
  totalReceived: number
  insertedCount: number
  failedCount: number
  failed: Array<{
    rowIndex: number
    receiptNumber: string
    reason: string
  }>
}

const API_BASE_URL = (import.meta.env.VITE_RECEIPTS_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8788/api/v1'

function mapReceiptForApi(row: ReceiptRow): BulkCreatePayloadItem {
  return {
    receiptNumber: row.receiptNumber,
    receiptDate: row.date,
    memberName: row.name,
    flatShopNo: row.flatShopNo,
    totalAmount: row.totalAmount,
    maintContribution: row.maintContribution,
    shareCapital: row.shareCapital,
    entranceFees: row.entranceFees,
    developmentsFund: row.developmentsFund,
    penaltyInterest: row.penaltyInterest,
    mobileNo: row.mobileNo?.trim() || undefined,
  }
}

export type UpdateReceiptPayload = {
  receiptNumber?: string
  receiptDate?: string
  memberName?: string
  flatShopNo?: string
  totalAmount?: number
  maintContribution?: number
  shareCapital?: number
  entranceFees?: number
  developmentsFund?: number
  penaltyInterest?: number
  mobileNo?: string | null
  notes?: string | null
}

export async function updateReceipt(id: number, payload: UpdateReceiptPayload): Promise<DbReceipt> {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let reason = `Update failed with status ${response.status}`
    try {
      const errorPayload = (await response.json()) as { message?: string }
      if (errorPayload.message) reason = errorPayload.message
    } catch { /* ignore */ }
    throw new Error(reason)
  }

  const item = (await response.json()) as DbReceipt
  return {
    ...item,
    totalAmount: Number(item.totalAmount),
    maintContribution: Number(item.maintContribution ?? 0),
    shareCapital: Number(item.shareCapital ?? 0),
    entranceFees: Number(item.entranceFees ?? 0),
    developmentsFund: Number(item.developmentsFund ?? 0),
    penaltyInterest: Number(item.penaltyInterest ?? 0),
  }
}

export async function uploadReceiptsToTable(rows: ReceiptRow[]): Promise<BulkCreateResult> {
  const payload = {
    items: rows.map(mapReceiptForApi),
  }

  const response = await fetch(`${API_BASE_URL}/receipts/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let reason = `Upload failed with status ${response.status}`
    try {
      const errorPayload = (await response.json()) as { message?: string; reason?: string }
      if (errorPayload.message) {
        reason = errorPayload.reason ? `${errorPayload.message}: ${errorPayload.reason}` : errorPayload.message
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(reason)
  }

  return (await response.json()) as BulkCreateResult
}

type FetchReceiptPageParams = {
  page: number
  limit: number
  filters?: ReceiptListFilters
}

export async function fetchReceiptPage({ page, limit, filters }: FetchReceiptPageParams): Promise<ReceiptListPage> {
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, Math.min(200, limit))
  const offset = (safePage - 1) * safeLimit

  const params = new URLSearchParams({
    limit: String(safeLimit),
    offset: String(offset),
  })

  if (filters?.month?.trim()) {
    params.set('month', filters.month.trim())
  }

  if (filters?.query?.trim()) {
    params.set('query', filters.query.trim())
  }

  const response = await fetch(`${API_BASE_URL}/receipts?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch receipts. Status: ${response.status}`)
  }

  const payload = (await response.json()) as ReceiptListPage
  const normalizedItems: DbReceipt[] = payload.items.map((item) => ({
    ...item,
    totalAmount: Number(item.totalAmount),
    maintContribution: Number(item.maintContribution ?? 0),
    shareCapital: Number(item.shareCapital ?? 0),
    entranceFees: Number(item.entranceFees ?? 0),
    developmentsFund: Number(item.developmentsFund ?? 0),
    penaltyInterest: Number(item.penaltyInterest ?? 0),
  }))

  return {
    ...payload,
    items: normalizedItems,
  }
}
