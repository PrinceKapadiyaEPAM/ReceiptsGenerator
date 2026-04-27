import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import './App.css'
import { GenerateReceiptsScreen } from './features/receipts/components/GenerateReceiptsScreen'
import { TableUploadScreen } from './features/receipts/components/TableUploadScreen'
import { UploadScreen } from './features/receipts/components/UploadScreen'
import { FIELD_ALIASES } from './features/receipts/constants'
import { downloadErrorCsv } from './features/receipts/services/downloadService'
import { generateMergedReceiptsPdf } from './features/receipts/services/pdfService'
import { type BulkCreateResult, uploadReceiptsToTable } from './features/receipts/services/receiptApiService'
import { parseSpreadsheetFile } from './features/receipts/services/spreadsheetService'
import { parseMappedRows } from './features/receipts/services/validationService'
import type { AppScreen, RawRow } from './features/receipts/types'
import { normalizeHeader } from './features/receipts/utils'

function App() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('upload')
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingError, setProcessingError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isUploadingToTable, setIsUploadingToTable] = useState(false)
  const [tableUploadError, setTableUploadError] = useState('')
  const [tableUploadResult, setTableUploadResult] = useState<BulkCreateResult | null>(null)

  const autoMapping = useMemo(() => {
    const map: Record<string, string> = {}
    const normalized = headers.map((header) => ({
      original: header,
      key: normalizeHeader(header),
    }))

    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      const match = normalized.find((entry) => aliases.some((alias) => normalizeHeader(alias) === entry.key))
      if (match) {
        map[field] = match.original
      }
    })

    return map
  }, [headers])

  const effectiveMapping = useMemo(() => ({ ...autoMapping, ...mapping }), [autoMapping, mapping])

  const parsed = useMemo(() => parseMappedRows(rawRows, effectiveMapping), [rawRows, effectiveMapping])

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setLoading(true)
    setProcessingError('')
    setTableUploadError('')
    setTableUploadResult(null)

    try {
      const { rows, headers: parsedHeaders } = await parseSpreadsheetFile(selectedFile)
      setHeaders(parsedHeaders)
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

  async function handleUploadToTable(): Promise<void> {
    if (parsed.validRows.length === 0) {
      setTableUploadError('No valid rows available to upload. Please fix validation errors first.')
      return
    }

    setIsUploadingToTable(true)
    setTableUploadError('')
    setTableUploadResult(null)

    try {
      const result = await uploadReceiptsToTable(parsed.validRows)
      setTableUploadResult(result)
    } catch (error) {
      setTableUploadError(error instanceof Error ? error.message : 'Failed to upload rows to database table.')
    } finally {
      setIsUploadingToTable(false)
    }
  }

  async function handleGenerateMergedPdf(): Promise<void> {
    if (parsed.validRows.length === 0) {
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setProcessingError('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 180))
      const pages = Array.from(document.querySelectorAll('.pdf-receipt-page')) as HTMLElement[]
      await generateMergedReceiptsPdf(pages, setProgress)
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to generate PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    document.body.classList.add('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary')

    return () => {
      document.body.classList.remove('layout-fixed', 'sidebar-expand-lg', 'bg-body-tertiary', 'sidebar-open')
    }
  }, [])

  function handleScreenChange(screen: AppScreen): void {
    setActiveScreen(screen)

    if (window.innerWidth < 992) {
      document.body.classList.remove('sidebar-open')
      document.body.classList.add('sidebar-collapse')
    }
  }

  return (
    <div className="app-wrapper app-admin-layout">
      <nav className="app-header navbar navbar-expand bg-body border-bottom">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link app-menu-toggle" href="#" data-lte-toggle="sidebar" role="button" aria-label="Toggle sidebar">
                <i className="fas fa-bars" aria-hidden="true" />
              </a>
            </li>
            <li className="nav-item d-none d-sm-block">
              <span className="navbar-brand mb-0 h5">ReceiptsGen</span>
            </li>
          </ul>
        </div>
      </nav>

      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div className="sidebar-brand">
          <span className="brand-text fw-light">Swastik Rise</span>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2" aria-label="Main navigation">
            <ul className="nav sidebar-menu flex-column" role="tablist" data-lte-toggle="treeview" data-accordion="false">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link nav-link-btn ${activeScreen === 'upload' ? 'active' : ''}`}
                  onClick={() => handleScreenChange('upload')}
                >
                  <i className="nav-icon fas fa-file-upload" aria-hidden="true" />
                  <p>Upload from Sheet</p>
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link nav-link-btn ${activeScreen === 'table-upload' ? 'active' : ''}`}
                  onClick={() => handleScreenChange('table-upload')}
                >
                  <i className="nav-icon fas fa-database" aria-hidden="true" />
                  <p>Upload to Table</p>
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link nav-link-btn ${activeScreen === 'generate' ? 'active' : ''}`}
                  onClick={() => handleScreenChange('generate')}
                >
                  <i className="nav-icon fas fa-list-check" aria-hidden="true" />
                  <p>Generate Receipts</p>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-content">
          <div className="container-fluid app-shell py-3">
            {activeScreen === 'upload' ? (
              <UploadScreen
                loading={loading}
                isGenerating={isGenerating}
                fileName={fileName}
                processingError={processingError}
                headers={headers}
                mapping={mapping}
                rawRowsCount={rawRows.length}
                validRows={parsed.validRows}
                invalidRows={parsed.invalidRows}
                progress={progress}
                onFileUpload={handleFileUpload}
                onMappingChange={(field, value) => {
                  setMapping((prev) => ({
                    ...prev,
                    [field]: value,
                  }))
                }}
                onGenerateMergedPdf={handleGenerateMergedPdf}
                onDownloadErrorCsv={() => downloadErrorCsv(parsed.invalidRows)}
              />
            ) : activeScreen === 'table-upload' ? (
              <TableUploadScreen
                loading={loading}
                isUploading={isUploadingToTable}
                fileName={fileName}
                processingError={processingError}
                uploadError={tableUploadError}
                uploadResult={tableUploadResult}
                headers={headers}
                mapping={mapping}
                rawRowsCount={rawRows.length}
                validRows={parsed.validRows}
                invalidRows={parsed.invalidRows}
                onFileUpload={handleFileUpload}
                onMappingChange={(field, value) => {
                  setMapping((prev) => ({
                    ...prev,
                    [field]: value,
                  }))
                }}
                onUploadToTable={handleUploadToTable}
              />
            ) : (
              <GenerateReceiptsScreen />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
