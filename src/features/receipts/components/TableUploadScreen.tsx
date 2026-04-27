import type { ChangeEvent } from 'react'
import { FIELD_LABELS, REQUIRED_FIELDS } from '../constants'
import type { BulkCreateResult } from '../services/receiptApiService'
import type { ReceiptRow, RowError } from '../types'

type TableUploadScreenProps = {
  loading: boolean
  isUploading: boolean
  fileName: string
  processingError: string
  uploadError: string
  uploadResult: BulkCreateResult | null
  headers: string[]
  mapping: Record<string, string>
  rawRowsCount: number
  validRows: ReceiptRow[]
  invalidRows: RowError[]
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onMappingChange: (field: string, value: string) => void
  onUploadToTable: () => Promise<void>
}

export function TableUploadScreen({
  loading,
  isUploading,
  fileName,
  processingError,
  uploadError,
  uploadResult,
  headers,
  mapping,
  rawRowsCount,
  validRows,
  invalidRows,
  onFileUpload,
  onMappingChange,
  onUploadToTable,
}: TableUploadScreenProps) {
  return (
    <>
      <section className="card card-success card-outline">
        <div className="card-header">
          <h3 className="card-title">Sheet to Database Table</h3>
        </div>
        <div className="card-body">
          <p className="text-muted mb-3">Upload CSV/XLSX and insert all valid rows into the receipts table.</p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <label className="btn btn-success mb-0">
              <input
                type="file"
                className="d-none"
                accept=".csv,.xlsx,.xls"
                onChange={onFileUpload}
                disabled={loading || isUploading}
              />
              <i className="fas fa-upload me-2" aria-hidden="true" />
              {loading ? 'Reading file...' : 'Upload Sheet'}
            </label>
            <button type="button" className="btn btn-primary" onClick={onUploadToTable} disabled={validRows.length === 0 || isUploading}>
              <i className="fas fa-database me-2" aria-hidden="true" />
              {isUploading ? 'Uploading to Table...' : 'Upload Valid Rows to Table'}
            </button>
          </div>
          {fileName && <p className="file-meta">Loaded file: {fileName}</p>}
          {processingError && <div className="alert alert-danger mt-3 mb-0">{processingError}</div>}
          {uploadError && <div className="alert alert-danger mt-3 mb-0">{uploadError}</div>}
          {uploadResult && (
            <div className="alert alert-info mt-3 mb-0">
              Received: {uploadResult.totalReceived} | Inserted: {uploadResult.insertedCount} | Failed: {uploadResult.failedCount}
            </div>
          )}
        </div>
      </section>

      {headers.length > 0 && (
        <section className="card card-secondary card-outline">
          <div className="card-header">
            <h3 className="card-title">Column Mapping</h3>
          </div>
          <div className="card-body">
            <p className="text-muted mb-3">Adjust mapping if source headers differ from expected receipt fields.</p>
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
                    disabled={isUploading}
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
        <section className="card card-info card-outline">
          <div className="card-header">
            <h3 className="card-title">Import Summary</h3>
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
                    <p className="mb-0">Valid for Insert</p>
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
              <div className="table-responsive mt-4">
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
                    {invalidRows.slice(0, 10).map((item) => (
                      <tr key={`${item.sourceRow}-${item.reason}`}>
                        <td>{item.sourceRow}</td>
                        <td>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {uploadResult && uploadResult.failed.length > 0 && (
              <div className="table-responsive mt-4">
                <h4 className="h6 mb-2">Upload Failures</h4>
                <table className="table table-sm table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '110px' }}>
                        Input Index
                      </th>
                      <th scope="col" style={{ width: '180px' }}>
                        Receipt Number
                      </th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.failed.slice(0, 10).map((item) => (
                      <tr key={`${item.rowIndex}-${item.receiptNumber}-${item.reason}`}>
                        <td>{item.rowIndex + 1}</td>
                        <td>{item.receiptNumber}</td>
                        <td>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadResult.failed.length > 10 && <p className="text-muted small mt-2 mb-0">Showing first 10 failures.</p>}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
