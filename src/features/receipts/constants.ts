import type { ReceiptField } from './types'

export const FIELD_LABELS: Record<ReceiptField, string> = {
  receiptNumber: 'Receipt Number',
  date: 'Date',
  name: 'Name',
  flatShopNo: 'Flat / Shop No',
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
}

export const REQUIRED_FIELDS: ReceiptField[] = ['receiptNumber', 'date', 'name', 'flatShopNo', 'totalAmount']

export const FIELD_ALIASES: Record<ReceiptField, string[]> = {
  receiptNumber: ['receipt no', 'receipt number', 'receipt_no', 'receiptnumber'],
  date: ['date', 'receipt date', 'payment date'],
  name: ['name', 'member name', 'owner name', 'customer name'],
  flatShopNo: ['flat / shop no', 'flat/shop no', 'flat no', 'shop no', 'unit no', 'flatshopno'],
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
}

export const SAMPLE_CSV_LINES = [
  'Receipt No,Date,Name,Flat / Shop No,Rupees,Cash / Cheque No,Dated,Bank,Maint. Contribution,Share Capital,Entrance Fees,Developments Fund,Penalty Interest,Total Amount',
  'R-1001,2026-04-01,Amit Shah,A-101,,CHQ-8891,2026-04-01,HDFC,2500,1000,500,750,250,5000',
  'R-1002,2026-04-01,Neha Desai,B-202,,CHQ-8892,2026-04-01,ICICI,3000,1000,500,1000,500,6000',
]
