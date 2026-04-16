import { downloadErrorCsv } from '../services/downloadFiles'
import type { ParsedReceipts, RawRow } from '../types'

type ValidationSummaryProps = {
  rawRows: RawRow[]
  parsed: ParsedReceipts
  isGenerating: boolean
  progress: number
  onGenerate: () => void
}

export function ValidationSummary({ rawRows, parsed, isGenerating, progress, onGenerate }: ValidationSummaryProps) {
  return (
    <section className="panel results-panel">
      <h2>Validation Summary</h2>
      <div className="summary-grid">
        <article>
          <h3>Total Rows</h3>
          <p>{rawRows.length}</p>
        </article>
        <article>
          <h3>Valid</h3>
          <p className="good">{parsed.validRows.length}</p>
        </article>
        <article>
          <h3>Invalid</h3>
          <p className="bad">{parsed.invalidRows.length}</p>
        </article>
      </div>

      {parsed.invalidRows.length > 0 && (
        <div className="error-list">
          <div className="error-list-head">
            <h3>Invalid Rows</h3>
            <button type="button" className="sample-btn" onClick={() => downloadErrorCsv(parsed.invalidRows)}>
              Download Error CSV
            </button>
          </div>
          <ul>
            {parsed.invalidRows.slice(0, 8).map((item) => (
              <li key={`${item.sourceRow}-${item.reason}`}>
                Row {item.sourceRow}: {item.reason}
              </li>
            ))}
          </ul>
          {parsed.invalidRows.length > 8 && <p>Showing first 8 errors.</p>}
        </div>
      )}

      <div className="export-row">
        <button type="button" className="export-btn" onClick={onGenerate} disabled={parsed.validRows.length === 0 || isGenerating}>
          {isGenerating ? 'Generating PDF...' : 'Generate Merged PDF'}
        </button>
        <p className="size-note">Output: 2 receipts per A4 page (half-page each)</p>
        {isGenerating && <p className="progress-text">Progress: {progress}%</p>}
      </div>
    </section>
  )
}
