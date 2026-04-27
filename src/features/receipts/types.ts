export type RawRow = Record<string, string>

export type ReceiptRow = {
  sourceRow: number
  receiptNumber: string
  date: string
  name: string
  flatShopNo: string
  paymentForMonth: string
  paymentMode: string
  rupeesText: string
  cashOrChequeNo: string
  dated: string
  bank: string
  mobileNo?: string
  maintContribution: number
  shareCapital: number
  entranceFees: number
  developmentsFund: number
  penaltyInterest: number
  totalAmount: number
}

export type RowError = {
  sourceRow: number
  reason: string
}

export type ValidationResult = {
  validRows: ReceiptRow[]
  invalidRows: RowError[]
}

export type DbReceipt = {
  id: number
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
  mobileNo?: string | null
  notes?: string | null
  createdAt: string
}

export type ReceiptListFilters = {
  month?: string
  query?: string
}

export type ReceiptListPage = {
  items: DbReceipt[]
  paging: {
    limit: number
    offset: number
    total: number
  }
}

export type AppScreen = 'upload' | 'quick' | 'table-upload' | 'generate'

export type QuickFormValues = {
  receiptNumber: string
  date: string
  name: string
  flatShopNo: string
  paymentForMonth: string
  paymentMode: string
  rupeesText: string
  maintContribution: string
  shareCapital: string
  entranceFees: string
  developmentsFund: string
  penaltyInterest: string
}

export type QuickFormErrors = Partial<Record<keyof QuickFormValues, string>>
