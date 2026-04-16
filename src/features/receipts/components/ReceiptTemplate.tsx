import type { ReceiptRow } from '../types'
import { formatDate } from '../utils'

type ReceiptTemplateProps = {
  row: ReceiptRow
}

export function ReceiptTemplate({ row }: ReceiptTemplateProps) {
  const items = [
    ['Maint. Contribution', row.amountBreakdown.maintContribution],
    ['Share Capital', row.amountBreakdown.shareCapital],
    ['Entrances Fees', row.amountBreakdown.entranceFees],
    ['Developments Fund', row.amountBreakdown.developmentsFund],
    ['Penalty-Interest', row.amountBreakdown.penaltyInterest],
  ]

  return (
    <article className="receipt-frame">
      <div className="receipt-inner">
        <header className="receipt-header">
          <h3>Swastik Rise Co. Op. Housing &amp; Commercial Society Ltd.</h3>
          <p>Registration No : REG/AHD/SA(HAA)19819/2024</p>
          <p>Swastik Rise, Nr. Kavisha Urbania, South Bopal, Ahmedabad. 380058.</p>
        </header>

        <section className="top-fields">
          <div className="box-field">Receipt No: {row.receiptNumber}</div>
          <div className="box-field">Date: {formatDate(row.date)}</div>
        </section>

        <section className="receipt-body">
          <div className="left-body">
            <p>
              <strong>Name:</strong> <span>{row.name}</span>
            </p>
            <p>
              <strong>Flat / Shop No:</strong> <span>{row.flatShopNo}</span>
            </p>
            <p>
              <strong>Rupees:</strong> <span>{row.rupeesText}</span>
            </p>
            <p>
              <strong>Cash / Cheque No:</strong> <span>{row.cashOrChequeNo || '-'}</span>
              <strong className="inline-gap">Dated:</strong> <span>{formatDate(row.dated)}</span>
            </p>
            <p>
              <strong>Bank:</strong> <span>{row.bank || '-'}</span>
            </p>
          </div>

          <div className="amount-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Details</th>
                  <th>Amount ₹</th>
                </tr>
              </thead>
              <tbody>
                {items.map(([label, amount]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{Number(amount).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Amount</td>
                  <td>{row.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="receipt-footer">
          <div className="amount-box">
            <span className="currency">₹</span>
            <span>{row.totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="sign-block">
            <p>For, Swastik Rise Co. Op. Housing &amp; Commercial Society Ltd.</p>
            <strong>Receiver Signature</strong>
          </div>
        </footer>
      </div>
    </article>
  )
}
