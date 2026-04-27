import type { QuickFormValues } from './types'

export const FIELD_LABELS: Record<string, string> = {
  receiptNumber: 'Receipt Number',
  date: 'Date',
  name: 'Name',
  flatShopNo: 'Flat / Shop No',
  paymentForMonth: 'Payment For Month',
  paymentMode: 'Payment Mode',
  rupeesText: 'Rupees (Text)',
  cashOrChequeNo: 'Cash / Cheque No',
  dated: 'Dated',
  bank: 'Bank',
  maintContribution: 'Maint. Contribution',
  shareCapital: 'Share Capital',
  entranceFees: 'Entrance Fees',
  developmentsFund: 'Developments Fund',
  penaltyInterest: 'Penalty Interest',
  totalAmount: 'Total Amount',
  mobileNo: 'Mobile Number',
}

export const REQUIRED_FIELDS = ['receiptNumber', 'date', 'name', 'flatShopNo']

export const QUICK_REQUIRED_FIELDS: Array<keyof QuickFormValues> = [
  'receiptNumber',
  'date',
  'name',
  'flatShopNo',
  'paymentForMonth',
  'paymentMode',
]

export const QUICK_BREAKDOWN_FIELDS: Array<
  keyof Pick<
    QuickFormValues,
    'maintContribution' | 'shareCapital' | 'entranceFees' | 'developmentsFund' | 'penaltyInterest'
  >
> = ['maintContribution', 'shareCapital', 'entranceFees', 'developmentsFund', 'penaltyInterest']

export const QUICK_LABELS: Record<keyof QuickFormValues, string> = {
  receiptNumber: 'Receipt Number',
  date: 'Date',
  name: 'Name',
  flatShopNo: 'Flat / Shop No',
  paymentForMonth: 'Payment For Month',
  paymentMode: 'Payment Mode',
  rupeesText: 'Rupees (Text)',
  maintContribution: 'Maint. Contribution',
  shareCapital: 'Share Capital',
  entranceFees: 'Entrance Fees',
  developmentsFund: 'Developments Fund',
  penaltyInterest: 'Penalty Interest',
}

export const FIELD_ALIASES: Record<string, string[]> = {
  receiptNumber: ['receipt no', 'receipt number', 'receipt_no', 'receiptnumber'],
  date: ['date', 'receipt date', 'payment date'],
  name: ['name', 'member name', 'owner name', 'customer name'],
  flatShopNo: ['flat / shop no', 'flat/shop no', 'flat no', 'shop no', 'unit no', 'flatshopno'],
  paymentForMonth: ['payment for month', 'payment month', 'month', 'for month', 'billing month'],
  paymentMode: ['payment mode', 'mode', 'payment type', 'mode of payment'],
  rupeesText: ['rupees', 'amount in words', 'rupees text'],
  cashOrChequeNo: ['cash / cheque no', 'cheque no', 'cash no', 'instrument no'],
  dated: ['dated', 'cheque date'],
  bank: ['bank', 'bank name'],
  maintContribution: ['maint. contribution', 'maintenance', 'maintenance contribution'],
  shareCapital: ['share capital'],
  entranceFees: ['entrance fees', 'entrance fee'],
  developmentsFund: ['developments fund', 'development fund'],
  penaltyInterest: ['penalty-interest', 'penalty interest'],
  totalAmount: ['total amount', 'amount', 'total'],
  mobileNo: ['mobile no', 'mobile number', 'phone', 'phone no', 'phone number', 'contact no'],
}
