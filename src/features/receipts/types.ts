export type RawRow = Record<string, string>

export type AmountBreakdown = {
  maintContribution: number
  shareCapital: number
  entranceFees: number
  developmentsFund: number
  penaltyInterest: number
}

export type ReceiptRow = {
  sourceRow: number
  receiptNumber: string
  date: string
  name: string
  flatShopNo: string
  rupeesText: string
  cashOrChequeNo: string
  dated: string
  bank: string
  amountBreakdown: AmountBreakdown
  totalAmount: number
}

export type RowError = {
  sourceRow: number
  reason: string
}

export type ReceiptField =
  | 'receiptNumber'
  | 'date'
  | 'name'
  | 'flatShopNo'
  | 'rupeesText'
  | 'cashOrChequeNo'
  | 'dated'
  | 'bank'
  | 'maintContribution'
  | 'shareCapital'
  | 'entranceFees'
  | 'developmentsFund'
  | 'penaltyInterest'
  | 'totalAmount'

export type ReceiptMapping = Record<string, string>

export type ParsedReceipts = {
  validRows: ReceiptRow[]
  invalidRows: RowError[]
}
