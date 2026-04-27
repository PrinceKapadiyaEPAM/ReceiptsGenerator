import type { ChangeEvent } from 'react'
import { FIELD_LABELS, REQUIRED_FIELDS } from '../constants'
import type { ReceiptRow, RowError } from '../types'
import { ReceiptTemplate } from './ReceiptTemplate'

type UploadScreenProps = {
  loading: boolean
  isGenerating: boolean
  fileName: string
  processingError: string
  headers: string[]
  mapping: Record<string, string>
  rawRowsCount: number
  validRows: ReceiptRow[]
  invalidRows: RowError[]
  progress: number
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onMappingChange: (field: string, value: string) => void
  onGenerateMergedPdf: () => Promise<void>
  onDownloadErrorCsv: () => void
}

export function UploadScreen({
  loading,
  isGenerating,
  fileName,
  processingError,
  headers,
  mapping,
  rawRowsCount,
  validRows,
  invalidRows,
  progress,
  onFileUpload,
  onMappingChange,
  onGenerateMergedPdf,
  onDownloadErrorCsv,
}: UploadScreenProps) {
  return (
    <>
      <section className="card card-primary card-outline">
        <div className="card-header">
          <h3 className="card-title">Upload and Export</h3>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">Upload CSV/XLSX, map columns, validate rows, and export one merged PDF.</p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <label className="btn btn-primary mb-0">
              <input
                type="file"
                className="d-none"
                accept=".csv,.xlsx,.xls"
                onChange={onFileUpload}
                disabled={loading || isGenerating}
              />
              <i className="fas fa-upload me-2" aria-hidden="true" />
              {loading ? 'Reading file...' : 'Upload Sheet'}
            </label>
            <span className="badge text-bg-light border">Accepted: .csv, .xlsx, .xls</span>
          </div>
          {fileName && <p className="file-meta">Loaded file: {fileName}</p>}
          {processingError && <div className="alert alert-danger mt-3 mb-0">{processingError}</div>}
        </div>
      </section>

      {headers.length > 0 && (
        <section className="card card-secondary card-outline">
          <div className="card-header">
            <h3 className="card-title">Column Mapping</h3>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">Adjust only if your header names differ from expected receipt fields.</p>
            <div className="row g-3">
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <div key={field} className="col-12 col-md-6">
                  <label className="form-label mb-1">
                    {label}
                    {REQUIRED_FIELDS.includes(field) && <strong> *</strong>}
                  </label>
                  <select
                    className="form-select"
                    value={mapping[field] ?? ''}
                    onChange={(event) => onMappingChange(field, event.target.value)}
                  >
                    <option value="">Auto</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {rawRowsCount > 0 && (
        <section className="card card-info card-outline results-panel">
          <div className="card-header">
            <h3 className="card-title">Validation Summary</h3>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="small-box text-bg-secondary mb-0">
                  <div className="inner">
                    <h4 className="mb-1">{rawRowsCount}</h4>
                    <p className="mb-0">Total Rows</p>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small-box text-bg-success mb-0">
                  <div className="inner">
                    <h4 className="mb-1">{validRows.length}</h4>
                    <p className="mb-0">Valid Rows</p>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="small-box text-bg-danger mb-0">
                  <div className="inner">
                    <h4 className="mb-1">{invalidRows.length}</h4>
                    <p className="mb-0">Invalid Rows</p>
                  </div>
                </div>
              </div>
            </div>

            {invalidRows.length > 0 && (
              <div className="mt-4">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <h4 className="h6 mb-0">Invalid Rows</h4>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onDownloadErrorCsv}>
                    <i className="fas fa-file-download me-1" aria-hidden="true" />
                    Download Error CSV
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: '110px' }}>
                          Source Row
                        </th>
                        <th scope="col">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invalidRows.slice(0, 8).map((item) => (
                        <tr key={`${item.sourceRow}-${item.reason}`}>
                          <td>{item.sourceRow}</td>
                          <td>{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invalidRows.length > 8 && <p className="text-muted small mt-2 mb-0">Showing first 8 errors.</p>}
              </div>
            )}

            <div className="export-row mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onGenerateMergedPdf}
                disabled={validRows.length === 0 || isGenerating}
              >
                <i className="fas fa-file-pdf me-2" aria-hidden="true" />
                {isGenerating ? 'Generating PDF...' : 'Generate Merged PDF'}
              </button>
              <span className="badge text-bg-light border">Output: 2 receipts per A4 page (half-page each)</span>
              {isGenerating && <p className="progress-text mb-0">Progress: {progress}%</p>}
            </div>
          </div>
        </section>
      )}

      {validRows.length > 0 && (
        <section className="card card-outline card-dark preview-panel">
          <div className="card-header">
            <h3 className="card-title">Receipt Preview</h3>
          </div>
          <div className="card-body">
            <p className="text-muted">Half-page receipt preview. Export places 2 receipts on each A4 page.</p>
            <div className="preview-wrap">
              <div className="preview-receipt-page">
                <div className="receipt-slot">
                  <ReceiptTemplate row={validRows[0]} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="pdf-staging" aria-hidden="true">
        {validRows.map((row) => (
          <div key={`${row.sourceRow}-${row.receiptNumber}`} className="pdf-receipt-page">
            <div className="receipt-slot">
              <ReceiptTemplate row={row} />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
