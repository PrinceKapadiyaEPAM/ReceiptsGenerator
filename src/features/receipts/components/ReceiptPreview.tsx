import type { ReceiptRow } from '../types'
import { ReceiptTemplate } from './ReceiptTemplate'

type ReceiptPreviewProps = {
  row: ReceiptRow
}

export function ReceiptPreview({ row }: ReceiptPreviewProps) {
  return (
    <section className="panel preview-panel">
      <h2>Receipt Preview</h2>
      <p className="subline">Half-page receipt preview. Export places 2 receipts on each A4 page.</p>
      <div className="preview-wrap">
        <div className="preview-receipt-page">
          <div className="receipt-slot">
            <ReceiptTemplate row={row} />
          </div>
        </div>
      </div>
    </section>
  )
}
