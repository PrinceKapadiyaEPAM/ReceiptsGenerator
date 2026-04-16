import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ColumnMappingSection } from '../components/ColumnMappingSection'
import { ReceiptPreview } from '../components/ReceiptPreview'
import { ReceiptTemplate } from '../components/ReceiptTemplate'
import { ValidationSummary } from '../components/ValidationSummary'
import { downloadSampleCsv } from '../services/downloadFiles'
import { exportMergedReceiptPdf } from '../services/pdfExport'
import { parseSpreadsheetFile } from '../services/parseSpreadsheetFile'
import { buildReceiptRows, getAutoMapping } from '../services/receiptValidation'
import type { RawRow, ReceiptMapping } from '../types'

export function ReceiptGeneratorPage() {
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ReceiptMapping>({})
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingError, setProcessingError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const autoMapping = useMemo(() => getAutoMapping(headers), [headers])
  const effectiveMapping = useMemo(() => ({ ...autoMapping, ...mapping }), [autoMapping, mapping])
  const parsed = useMemo(() => buildReceiptRows(rawRows, effectiveMapping), [effectiveMapping, rawRows])

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setLoading(true)
    setProcessingError('')

    try {
      const rows = await parseSpreadsheetFile(selectedFile)
      if (rows.length === 0) {
        throw new Error('No rows found in the uploaded sheet.')
      }

      setHeaders(Object.keys(rows[0]))
      setRawRows(rows)
      setMapping({})
      setFileName(selectedFile.name)
    } catch (error) {
      setRawRows([])
      setHeaders([])
      setMapping({})
      setFileName('')
      setProcessingError(error instanceof Error ? error.message : 'Failed to parse file.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePdf(): Promise<void> {
    if (parsed.validRows.length === 0) {
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setProcessingError('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 180))
      const pages = Array.from(document.querySelectorAll('.pdf-receipt-page')) as HTMLElement[]
      await exportMergedReceiptPdf(pages, setProgress)
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to generate PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="panel top-panel">
        <div>
          <h1>Receipts Generator</h1>
          <p className="subline">Upload CSV/XLSX, map columns, validate rows, and export one merged PDF.</p>
        </div>
        <div className="actions-row">
          <label className="upload-btn">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} disabled={loading || isGenerating} />
            {loading ? 'Reading file...' : 'Upload Sheet'}
          </label>
          <button type="button" className="sample-btn" onClick={downloadSampleCsv} disabled={loading || isGenerating}>
            Download Sample CSV
          </button>
        </div>
        {fileName && <p className="file-meta">Loaded file: {fileName}</p>}
        {processingError && <p className="error-text">{processingError}</p>}
      </section>

      {headers.length > 0 && (
        <ColumnMappingSection
          headers={headers}
          mapping={mapping}
          disabled={isGenerating}
          onChange={(field, value) => {
            setMapping((prev) => ({
              ...prev,
              [field]: value,
            }))
          }}
        />
      )}

      {rawRows.length > 0 && (
        <ValidationSummary
          rawRows={rawRows}
          parsed={parsed}
          isGenerating={isGenerating}
          progress={progress}
          onGenerate={handleGeneratePdf}
        />
      )}

      {parsed.validRows.length > 0 && <ReceiptPreview row={parsed.validRows[0]} />}

      <section className="pdf-staging" aria-hidden="true">
        {parsed.validRows.map((row) => (
          <div key={`${row.sourceRow}-${row.receiptNumber}`} className="pdf-receipt-page">
            <div className="receipt-slot">
              <ReceiptTemplate row={row} />
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
