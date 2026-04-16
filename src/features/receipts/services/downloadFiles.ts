import type { RowError } from '../types'
import { SAMPLE_CSV_LINES } from '../constants'

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}

export function downloadErrorCsv(errors: RowError[]): void {
  const lines = ['Row,Reason', ...errors.map((item) => `${item.sourceRow},"${item.reason.replace(/"/g, '""')}"`)]
  downloadTextFile('receipt-validation-errors.csv', lines.join('\n'), 'text/csv;charset=utf-8')
}

export function downloadSampleCsv(): void {
  downloadTextFile('receipts-sample.csv', SAMPLE_CSV_LINES.join('\n'), 'text/csv;charset=utf-8')
}
