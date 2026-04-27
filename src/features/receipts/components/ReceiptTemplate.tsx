import type { ReceiptRow } from '../types'
import { formatDate } from '../utils'

export function ReceiptTemplate({ row }: { row: ReceiptRow }) {
  const items = [
    ['Maint. Contribution', row.maintContribution],
    ['Share Capital', row.shareCapital],
    ['Entrances Fees', row.entranceFees],
    ['Developments Fund', row.developmentsFund],
    ['Penalty-Interest', row.penaltyInterest],
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
              <strong>Payment For:</strong> <span>{row.paymentForMonth}</span>
            </p>
            <p>
              <strong>Payment Mode:</strong> <span>{row.paymentMode}</span>
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
            <span className="amount-value">{row.totalAmount.toLocaleString('en-IN')}</span>
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
