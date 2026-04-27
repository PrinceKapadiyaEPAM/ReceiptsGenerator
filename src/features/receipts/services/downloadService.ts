import type { RowError } from '../types'

export function downloadErrorCsv(errors: RowError[]): void {
  const lines = ['Row,Reason', ...errors.map((item) => `${item.sourceRow},"${item.reason.replace(/"/g, '""')}"`)]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'receipt-validation-errors.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

export function downloadSampleCsv(): void {
  const sample = [
    'Receipt No,Date,Name,Flat / Shop No,Payment For Month,Payment Mode,Rupees,Maint. Contribution,Share Capital,Entrance Fees,Developments Fund,Penalty Interest,Total Amount',
    'R-1001,2026-04-01,Amit Shah,A-101,April 2026,Online,,2500,1000,500,750,250,5000',
    'R-1002,2026-04-01,Neha Desai,B-202,April 2026,UPI,,3000,1000,500,1000,500,6000',
  ]
  const blob = new Blob([sample.join('\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'receipts-sample.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}
