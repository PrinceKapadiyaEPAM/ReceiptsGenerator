export type DeliveryLogStatus = 'sent' | 'failed' | 'retry'

export type DeliveryLogEntry = {
  receiptId?: number
  receiptNumber: string
  mobileNo?: string
  channel?: 'whatsapp'
  status: DeliveryLogStatus
  errorMessage?: string
}

export type DeliveryLogRecord = {
  id: number
  receiptId: number | null
  receiptNumber: string
  mobileNo?: string | null
  channel: string
  status: DeliveryLogStatus
  errorMessage?: string | null
  attemptedAt: string
}

export type DeliveryLogPage = {
  items: DeliveryLogRecord[]
  paging: {
    limit: number
    offset: number
    total: number
  }
}

type FetchDeliveryLogsFilters = {
  status?: DeliveryLogStatus
  month?: string
  receiptId?: number
  limit?: number
  offset?: number
}

const API_BASE_URL = (import.meta.env.VITE_RECEIPTS_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8788/api/v1'

export async function createDeliveryLogs(logs: DeliveryLogEntry[]): Promise<void> {
  if (logs.length === 0) {
    return
  }

  const response = await fetch(`${API_BASE_URL}/delivery-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ logs }),
  })

  if (!response.ok) {
    let reason = `Failed to create delivery logs. Status: ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string; reason?: string }
      if (payload.message) {
        reason = payload.reason ? `${payload.message}: ${payload.reason}` : payload.message
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(reason)
  }
}

export async function fetchDeliveryLogs(filters: FetchDeliveryLogsFilters = {}): Promise<DeliveryLogPage> {
  const params = new URLSearchParams()

  if (filters.status) {
    params.set('status', filters.status)
  }
  if (filters.month?.trim()) {
    params.set('month', filters.month.trim())
  }
  if (typeof filters.receiptId === 'number' && Number.isInteger(filters.receiptId) && filters.receiptId > 0) {
    params.set('receiptId', String(filters.receiptId))
  }
  if (typeof filters.limit === 'number') {
    params.set('limit', String(filters.limit))
  }
  if (typeof filters.offset === 'number') {
    params.set('offset', String(filters.offset))
  }

  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/delivery-logs${query ? `?${query}` : ''}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch delivery logs. Status: ${response.status}`)
  }

  return (await response.json()) as DeliveryLogPage
}
