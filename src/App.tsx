import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import './App.css'

type RawRow = Record<string, string>

type ReceiptRow = {
  sourceRow: number
  receiptNumber: string
  date: string
  name: string
  flatShopNo: string
  paymentForMonth: string
  paymentMode: string
  rupeesText: string
  cashOrChequeNo: string
  dated: string
  bank: string
  maintContribution: number
  shareCapital: number
  entranceFees: number
  developmentsFund: number
  penaltyInterest: number
  totalAmount: number
}

type RowError = {
  sourceRow: number
  reason: string
}

type AppScreen = 'upload' | 'quick'

type QuickFormValues = {
  receiptNumber: string
  date: string
  name: string
  flatShopNo: string
  paymentForMonth: string
  paymentMode: string
  rupeesText: string
  maintContribution: string
  shareCapital: string
  entranceFees: string
  developmentsFund: string
  penaltyInterest: string
}

const FIELD_LABELS: Record<string, string> = {
  receiptNumber: 'Receipt Number',
  date: 'Date',
  name: 'Name',
  flatShopNo: 'Flat / Shop No',
  paymentForMonth: 'Payment For Month',
  paymentMode: 'Payment Mode',
  rupeesText: 'Rupees (Text)',
  cashOrChequeNo: 'Cash / Cheque No',
  dated: 'Dated',
  bank: 'Bank',
  maintContribution: 'Maint. Contribution',
  shareCapital: 'Share Capital',
  entranceFees: 'Entrance Fees',
  developmentsFund: 'Developments Fund',
  penaltyInterest: 'Penalty Interest',
  totalAmount: 'Total Amount',
}

const REQUIRED_FIELDS = ['receiptNumber', 'date', 'name', 'flatShopNo', 'totalAmount']

const QUICK_REQUIRED_FIELDS: Array<keyof QuickFormValues> = [
  'receiptNumber',
  'date',
  'name',
  'flatShopNo',
  'paymentForMonth',
  'paymentMode',
]

const QUICK_BREAKDOWN_FIELDS: Array<
  keyof Pick<
    QuickFormValues,
    'maintContribution' | 'shareCapital' | 'entranceFees' | 'developmentsFund' | 'penaltyInterest'
  >
> = ['maintContribution', 'shareCapital', 'entranceFees', 'developmentsFund', 'penaltyInterest']

const QUICK_LABELS: Record<keyof QuickFormValues, string> = {
  receiptNumber: 'Receipt Number',
  date: 'Date',
  name: 'Name',
  flatShopNo: 'Flat / Shop No',
  paymentForMonth: 'Payment For Month',
  paymentMode: 'Payment Mode',
  rupeesText: 'Rupees (Text)',
  maintContribution: 'Maint. Contribution',
  shareCapital: 'Share Capital',
  entranceFees: 'Entrance Fees',
  developmentsFund: 'Developments Fund',
  penaltyInterest: 'Penalty Interest',
}

const FIELD_ALIASES: Record<string, string[]> = {
  receiptNumber: ['receipt no', 'receipt number', 'receipt_no', 'receiptnumber'],
  date: ['date', 'receipt date', 'payment date'],
  name: ['name', 'member name', 'owner name', 'customer name'],
  flatShopNo: ['flat / shop no', 'flat/shop no', 'flat no', 'shop no', 'unit no', 'flatshopno'],
  paymentForMonth: ['payment for month', 'payment month', 'month', 'for month', 'billing month'],
  paymentMode: ['payment mode', 'mode', 'payment type', 'mode of payment'],
  rupeesText: ['rupees', 'amount in words', 'rupees text'],
  cashOrChequeNo: ['cash / cheque no', 'cheque no', 'cash no', 'instrument no'],
  dated: ['dated', 'cheque date'],
  bank: ['bank', 'bank name'],
  maintContribution: ['maint. contribution', 'maintenance', 'maintenance contribution'],
  shareCapital: ['share capital'],
  entranceFees: ['entrance fees', 'entrance fee'],
  developmentsFund: ['developments fund', 'development fund'],
  penaltyInterest: ['penalty-interest', 'penalty interest'],
  totalAmount: ['total amount', 'amount', 'total'],
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/,/g, '').trim()
  if (!cleaned) {
    return 0
  }
  const numberValue = Number(cleaned)
  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

function formatDate(value: string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) {
    return value
  }
  const day = String(dt.getDate()).padStart(2, '0')
  const month = dt.toLocaleString('en-US', { month: 'short' })
  const year = dt.getFullYear()
  return `${day}-${month}-${year}`
}

function formatPaymentMonth(value: string, fallbackDate: string): string {
  const rawValue = value.trim()
  if (rawValue) {
    const parsedDate = new Date(rawValue)
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    }
    return rawValue
  }

  const fallback = new Date(fallbackDate)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }

  return ''
}

function toIndianWords(value: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function twoDigits(n: number): string {
    if (n < 20) return ones[n]
    const t = Math.floor(n / 10)
    const o = n % 10
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100)
    const rest = n % 100
    const head = h ? `${ones[h]} Hundred` : ''
    const tail = rest ? twoDigits(rest) : ''
    return [head, tail].filter(Boolean).join(' ')
  }

  if (!Number.isFinite(value) || value <= 0) {
    return 'Zero Rupees Only'
  }

  const num = Math.floor(value)
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundredPart = num % 1000

  const parts = [
    crore ? `${threeDigits(crore)} Crore` : '',
    lakh ? `${threeDigits(lakh)} Lakh` : '',
    thousand ? `${threeDigits(thousand)} Thousand` : '',
    hundredPart ? threeDigits(hundredPart) : '',
  ].filter(Boolean)

  return `${parts.join(' ')} Rupees Only`
}

function downloadErrorCsv(errors: RowError[]): void {
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

function downloadSampleCsv(): void {
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

function getInitialQuickForm(): QuickFormValues {
  return {
    receiptNumber: '',
    date: new Date().toISOString().slice(0, 10),
    name: '',
    flatShopNo: '',
    paymentForMonth: '',
    paymentMode: 'Online',
    rupeesText: '',
    maintContribution: '',
    shareCapital: '',
    entranceFees: '',
    developmentsFund: '',
    penaltyInterest: '',
  }
}

function getQuickTotalFromBreakdown(form: QuickFormValues): number {
  const values = QUICK_BREAKDOWN_FIELDS.map((field) => parseAmount(form[field]))

  return values.reduce((sum, value) => (Number.isNaN(value) ? sum : sum + value), 0)
}

function buildQuickPreviewRow(form: QuickFormValues, totalAmount: number): ReceiptRow {
  const maintContribution = parseAmount(form.maintContribution)
  const shareCapital = parseAmount(form.shareCapital)
  const entranceFees = parseAmount(form.entranceFees)
  const developmentsFund = parseAmount(form.developmentsFund)
  const penaltyInterest = parseAmount(form.penaltyInterest)

  const safeTotal = Number.isNaN(totalAmount) ? 0 : totalAmount

  return {
    sourceRow: 1,
    receiptNumber: form.receiptNumber.trim(),
    date: form.date.trim(),
    name: form.name.trim(),
    flatShopNo: form.flatShopNo.trim(),
    paymentForMonth: formatPaymentMonth(form.paymentForMonth, form.date),
    paymentMode: form.paymentMode.trim() || 'Online',
    rupeesText: form.rupeesText.trim() || toIndianWords(safeTotal),
    cashOrChequeNo: '',
    dated: form.date.trim(),
    bank: '',
    maintContribution: Number.isNaN(maintContribution) ? 0 : maintContribution,
    shareCapital: Number.isNaN(shareCapital) ? 0 : shareCapital,
    entranceFees: Number.isNaN(entranceFees) ? 0 : entranceFees,
    developmentsFund: Number.isNaN(developmentsFund) ? 0 : developmentsFund,
    penaltyInterest: Number.isNaN(penaltyInterest) ? 0 : penaltyInterest,
    totalAmount: safeTotal,
  }
}

function validateQuickForm(form: QuickFormValues, totalAmount: number): {
  errors: Partial<Record<keyof QuickFormValues, string>>
  row: ReceiptRow | null
  formError: string
} {
  const errors: Partial<Record<keyof QuickFormValues, string>> = {}
  let formError = ''

  QUICK_REQUIRED_FIELDS.forEach((field) => {
    if (!form[field].trim()) {
      errors[field] = `${QUICK_LABELS[field]} is required`
    }
  })

  const maintContribution = parseAmount(form.maintContribution)
  const shareCapital = parseAmount(form.shareCapital)
  const entranceFees = parseAmount(form.entranceFees)
  const developmentsFund = parseAmount(form.developmentsFund)
  const penaltyInterest = parseAmount(form.penaltyInterest)

  if (Number.isNaN(totalAmount) || totalAmount <= 0) {
    formError = 'Total Amount must be greater than zero'
  }

  if (Number.isNaN(maintContribution)) {
    errors.maintContribution = 'Maint. Contribution must be a valid number'
  }
  if (Number.isNaN(shareCapital)) {
    errors.shareCapital = 'Share Capital must be a valid number'
  }
  if (Number.isNaN(entranceFees)) {
    errors.entranceFees = 'Entrance Fees must be a valid number'
  }
  if (Number.isNaN(developmentsFund)) {
    errors.developmentsFund = 'Developments Fund must be a valid number'
  }
  if (Number.isNaN(penaltyInterest)) {
    errors.penaltyInterest = 'Penalty Interest must be a valid number'
  }

  if (Object.keys(errors).length > 0) {
    return { errors, row: null, formError }
  }

  return {
    errors,
    formError,
    row: {
      sourceRow: 1,
      receiptNumber: form.receiptNumber.trim(),
      date: form.date.trim(),
      name: form.name.trim(),
      flatShopNo: form.flatShopNo.trim(),
      paymentForMonth: formatPaymentMonth(form.paymentForMonth, form.date),
      paymentMode: form.paymentMode.trim() || 'Online',
      rupeesText: form.rupeesText.trim() || toIndianWords(totalAmount),
      cashOrChequeNo: '',
      dated: form.date.trim(),
      bank: '',
      maintContribution,
      shareCapital,
      entranceFees,
      developmentsFund,
      penaltyInterest,
      totalAmount,
    },
  }
}

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
  const [quickForm, setQuickForm] = useState<QuickFormValues>(getInitialQuickForm)
  const [quickErrors, setQuickErrors] = useState<Partial<Record<keyof QuickFormValues, string>>>({})
  const [quickProcessingError, setQuickProcessingError] = useState('')
  const [isQuickGenerating, setIsQuickGenerating] = useState(false)

  const quickTotalAmount = useMemo(
    () => getQuickTotalFromBreakdown(quickForm),
    [
      quickForm.maintContribution,
      quickForm.shareCapital,
      quickForm.entranceFees,
      quickForm.developmentsFund,
      quickForm.penaltyInterest,
    ],
  )

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

  const parsed = useMemo(() => {
    const validRows: ReceiptRow[] = []
    const invalidRows: RowError[] = []

    rawRows.forEach((row, index) => {
      const sourceRow = index + 2
      const errors: string[] = []

      const getField = (field: string): string => {
        const header = effectiveMapping[field]
        if (!header) return ''
        return (row[header] ?? '').toString().trim()
      }

      const receiptNumber = getField('receiptNumber')
      const date = getField('date')
      const name = getField('name')
      const flatShopNo = getField('flatShopNo')
      const cashOrChequeNo = getField('cashOrChequeNo')
      const dated = getField('dated') || date
      const bank = getField('bank')

      const maintContribution = parseAmount(getField('maintContribution'))
      const shareCapital = parseAmount(getField('shareCapital'))
      const entranceFees = parseAmount(getField('entranceFees'))
      const developmentsFund = parseAmount(getField('developmentsFund'))
      const penaltyInterest = parseAmount(getField('penaltyInterest'))
      const totalAmount = parseAmount(getField('totalAmount'))

      REQUIRED_FIELDS.forEach((field) => {
        const fieldValue = getField(field)
        if (!fieldValue) {
          errors.push(`${FIELD_LABELS[field]} is required`)
        }
      })

      if (Number.isNaN(totalAmount) || totalAmount <= 0) {
        errors.push('Total Amount must be a valid positive number')
      }

      const breakdownValues = [maintContribution, shareCapital, entranceFees, developmentsFund, penaltyInterest]
      if (breakdownValues.some((value) => Number.isNaN(value))) {
        errors.push('One or more breakdown amounts are invalid')
      }

      if (errors.length > 0) {
        invalidRows.push({ sourceRow, reason: errors.join('; ') })
        return
      }

      validRows.push({
        sourceRow,
        receiptNumber,
        date,
        name,
        flatShopNo,
        paymentForMonth: formatPaymentMonth(getField('paymentForMonth'), date),
        paymentMode: getField('paymentMode') || 'Online',
        rupeesText: getField('rupeesText') || toIndianWords(totalAmount),
        cashOrChequeNo,
        dated,
        bank,
        maintContribution,
        shareCapital,
        entranceFees,
        developmentsFund,
        penaltyInterest,
        totalAmount,
      })
    })

    return { validRows, invalidRows }
  }, [effectiveMapping, rawRows])

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    setLoading(true)
    setProcessingError('')

    try {
      const name = selectedFile.name.toLowerCase()
      let rows: RawRow[] = []

      if (name.endsWith('.csv')) {
        const text = await selectedFile.text()
        const result = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
        })
        rows = result.data.map((row: Record<string, unknown>) => {
          const mapped: RawRow = {}
          Object.entries(row).forEach(([key, value]) => {
            mapped[key] = (value ?? '').toString()
          })
          return mapped
        })
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buffer = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw: false,
        })
        rows = json.map((row) => {
          const mapped: RawRow = {}
          Object.entries(row).forEach(([key, value]) => {
            mapped[key] = (value ?? '').toString()
          })
          return mapped
        })
      } else {
        throw new Error('Unsupported format. Upload .csv, .xlsx, or .xls only.')
      }

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

  async function generateMergedPdf(): Promise<void> {
    if (parsed.validRows.length === 0) {
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setProcessingError('')

    try {
      await new Promise((resolve) => setTimeout(resolve, 180))
      const pages = Array.from(document.querySelectorAll('.pdf-receipt-page')) as HTMLElement[]
      if (pages.length === 0) {
        throw new Error('No receipt pages found for export.')
      }

      const pageWidthMm = 210
      const pageHeightMm = 297
      const slotWidthMm = 210
      const slotHeightMm = 148.5

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
      })

      for (let i = 0; i < pages.length; i += 2) {
        if (i > 0) {
          pdf.addPage([pageWidthMm, pageHeightMm], 'portrait')
        }

        const topCanvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: '#ffffff',
        })
        if (topCanvas.width === 0 || topCanvas.height === 0) {
          throw new Error('Failed to capture receipt content for PDF. Please try again.')
        }
        pdf.addImage(topCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, slotWidthMm, slotHeightMm)

        let processedCount = i + 1

        if (i + 1 < pages.length) {
          const bottomCanvas = await html2canvas(pages[i + 1], {
            scale: 2,
            backgroundColor: '#ffffff',
          })
          if (bottomCanvas.width === 0 || bottomCanvas.height === 0) {
            throw new Error('Failed to capture receipt content for PDF. Please try again.')
          }
          pdf.addImage(bottomCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, slotHeightMm, slotWidthMm, slotHeightMm)
          processedCount = i + 2
        }

        setProgress(Math.round((processedCount / pages.length) * 100))
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      const dateTag = new Date().toISOString().slice(0, 10)
      pdf.save(`receipts-merged-${dateTag}.pdf`)
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to generate PDF.')
    } finally {
      setIsGenerating(false)
    }
  }

  const quickPreviewRow = useMemo(() => buildQuickPreviewRow(quickForm, quickTotalAmount), [quickForm, quickTotalAmount])

  async function generateQuickPdf(): Promise<void> {
    const { row, errors, formError } = validateQuickForm(quickForm, quickTotalAmount)
    setQuickErrors(errors)

    if (!row) {
      setQuickProcessingError(formError || 'Please fix form errors before generating the receipt PDF.')
      return
    }

    setQuickProcessingError('')
    setIsQuickGenerating(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 120))
      const quickPage = document.querySelector('.quick-pdf-page') as HTMLElement | null
      if (!quickPage) {
        throw new Error('Quick receipt preview is not available for export.')
      }

      const canvas = await html2canvas(quickPage, {
        scale: 2,
        backgroundColor: '#ffffff',
      })
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture quick receipt content for PDF. Please try again.')
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const imageWidth = 210
      const imageHeight = (canvas.height / canvas.width) * imageWidth
      const imageY = Math.max(0, (297 - imageHeight) / 2)

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, imageY, imageWidth, imageHeight)
      const dateTag = new Date().toISOString().slice(0, 10)
      const safeReceiptNumber = row.receiptNumber.replace(/[^a-zA-Z0-9-_]/g, '') || 'single'
      pdf.save(`receipt-${safeReceiptNumber}-${dateTag}.pdf`)
    } catch (error) {
      setQuickProcessingError(error instanceof Error ? error.message : 'Failed to generate quick receipt PDF.')
    } finally {
      setIsQuickGenerating(false)
    }
  }

  function onQuickFieldChange(field: keyof QuickFormValues, value: string): void {
    setQuickForm((prev) => ({
      ...prev,
      [field]: value,
    }))

    setQuickErrors((prev) => {
      if (!prev[field]) {
        return prev
      }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function resetQuickForm(): void {
    setQuickForm(getInitialQuickForm())
    setQuickErrors({})
    setQuickProcessingError('')
  }

  return (
    <main className="app-shell">
      <section className="panel app-header">
        <div>
          <h1>Receipts Generator</h1>
          <p className="subline">Switch between sheet upload and quick manual receipt generation.</p>
        </div>
        <div className="screen-tabs" role="tablist" aria-label="Receipt screens">
          <button type="button" className="sample-btn" onClick={downloadSampleCsv} disabled={loading || isGenerating}>
            Download Sample CSV
          </button>
          <button
            type="button"
            className={`screen-tab ${activeScreen === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveScreen('upload')}
          >
            Upload from Sheet
          </button>
          <button
            type="button"
            className={`screen-tab ${activeScreen === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveScreen('quick')}
          >
            Quick Generate
          </button>
        </div>
      </section>

      {activeScreen === 'upload' && (
        <>
          <section className="panel top-panel">
            <h2>Upload and Export</h2>
            <p className="subline">Upload CSV/XLSX, map columns, validate rows, and export one merged PDF.</p>
            <div className="actions-row">
              <label className="upload-btn">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading || isGenerating}
                />
                {loading ? 'Reading file...' : 'Upload Sheet'}
              </label>
            </div>
            {fileName && <p className="file-meta">Loaded file: {fileName}</p>}
            {processingError && <p className="error-text">{processingError}</p>}
          </section>

          {headers.length > 0 && (
            <section className="panel">
              <h2>Column Mapping</h2>
              <p className="subline">Adjust only if your header names differ from expected receipt fields.</p>
              <div className="mapping-grid">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <label key={field} className="mapping-item">
                    <span>
                      {label}
                      {REQUIRED_FIELDS.includes(field) && <strong> *</strong>}
                    </span>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value
                        setMapping((prev) => ({
                          ...prev,
                          [field]: value,
                        }))
                      }}
                      disabled={isGenerating}
                    >
                      <option value="">Auto</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          )}

          {rawRows.length > 0 && (
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
                <button
                  type="button"
                  className="export-btn"
                  onClick={generateMergedPdf}
                  disabled={parsed.validRows.length === 0 || isGenerating}
                >
                  {isGenerating ? 'Generating PDF...' : 'Generate Merged PDF'}
                </button>
                <p className="size-note">Output: 2 receipts per A4 page (half-page each)</p>
                {isGenerating && <p className="progress-text">Progress: {progress}%</p>}
              </div>
            </section>
          )}

          {parsed.validRows.length > 0 && (
            <section className="panel preview-panel">
              <h2>Receipt Preview</h2>
              <p className="subline">Half-page receipt preview. Export places 2 receipts on each A4 page.</p>
              <div className="preview-wrap">
                <div className="preview-receipt-page">
                  <div className="receipt-slot">
                    <ReceiptTemplate row={parsed.validRows[0]} />
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="pdf-staging" aria-hidden="true">
            {parsed.validRows.map((row) => (
              <div key={`${row.sourceRow}-${row.receiptNumber}`} className="pdf-receipt-page">
                <div className="receipt-slot">
                  <ReceiptTemplate row={row} />
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {activeScreen === 'quick' && (
        <>
          <section className="panel quick-panel">
            <h2>Quick Generate Receipt</h2>
            <p className="subline">Fill the form and generate one receipt PDF instantly.</p>

            <div className="quick-grid">
              <label className="quick-item">
                <span>
                  Receipt Number <strong>*</strong>
                </span>
                <input
                  value={quickForm.receiptNumber}
                  onChange={(event) => onQuickFieldChange('receiptNumber', event.target.value)}
                  placeholder="R-2026-001"
                />
                {quickErrors.receiptNumber && <small className="error-text">{quickErrors.receiptNumber}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Date <strong>*</strong>
                </span>
                <input
                  type="date"
                  value={quickForm.date}
                  onChange={(event) => onQuickFieldChange('date', event.target.value)}
                />
                {quickErrors.date && <small className="error-text">{quickErrors.date}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Name <strong>*</strong>
                </span>
                <input value={quickForm.name} onChange={(event) => onQuickFieldChange('name', event.target.value)} />
                {quickErrors.name && <small className="error-text">{quickErrors.name}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Flat / Shop No <strong>*</strong>
                </span>
                <input
                  value={quickForm.flatShopNo}
                  onChange={(event) => onQuickFieldChange('flatShopNo', event.target.value)}
                />
                {quickErrors.flatShopNo && <small className="error-text">{quickErrors.flatShopNo}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Payment For Month <strong>*</strong>
                </span>
                <input
                  value={quickForm.paymentForMonth}
                  onChange={(event) => onQuickFieldChange('paymentForMonth', event.target.value)}
                  placeholder="April 2026"
                />
                {quickErrors.paymentForMonth && <small className="error-text">{quickErrors.paymentForMonth}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Payment Mode <strong>*</strong>
                </span>
                <input
                  value={quickForm.paymentMode}
                  onChange={(event) => onQuickFieldChange('paymentMode', event.target.value)}
                  placeholder="Online"
                />
                {quickErrors.paymentMode && <small className="error-text">{quickErrors.paymentMode}</small>}
              </label>

              <label className="quick-item quick-wide">
                <span>Rupees (Text)</span>
                <input
                  value={quickForm.rupeesText}
                  onChange={(event) => onQuickFieldChange('rupeesText', event.target.value)}
                  placeholder="Auto-generated from total if left empty"
                />
              </label>

              <label className="quick-item">
                <span>Maint. Contribution</span>
                <input
                  value={quickForm.maintContribution}
                  onChange={(event) => onQuickFieldChange('maintContribution', event.target.value)}
                  placeholder="0"
                />
                {quickErrors.maintContribution && <small className="error-text">{quickErrors.maintContribution}</small>}
              </label>

              <label className="quick-item">
                <span>Share Capital</span>
                <input
                  value={quickForm.shareCapital}
                  onChange={(event) => onQuickFieldChange('shareCapital', event.target.value)}
                  placeholder="0"
                />
                {quickErrors.shareCapital && <small className="error-text">{quickErrors.shareCapital}</small>}
              </label>

              <label className="quick-item">
                <span>Entrance Fees</span>
                <input
                  value={quickForm.entranceFees}
                  onChange={(event) => onQuickFieldChange('entranceFees', event.target.value)}
                  placeholder="0"
                />
                {quickErrors.entranceFees && <small className="error-text">{quickErrors.entranceFees}</small>}
              </label>

              <label className="quick-item">
                <span>Developments Fund</span>
                <input
                  value={quickForm.developmentsFund}
                  onChange={(event) => onQuickFieldChange('developmentsFund', event.target.value)}
                  placeholder="0"
                />
                {quickErrors.developmentsFund && <small className="error-text">{quickErrors.developmentsFund}</small>}
              </label>

              <label className="quick-item">
                <span>Penalty Interest</span>
                <input
                  value={quickForm.penaltyInterest}
                  onChange={(event) => onQuickFieldChange('penaltyInterest', event.target.value)}
                  placeholder="0"
                />
                {quickErrors.penaltyInterest && <small className="error-text">{quickErrors.penaltyInterest}</small>}
              </label>

              <label className="quick-item">
                <span>
                  Total Amount <strong>*</strong>
                </span>
                <input
                  value={quickTotalAmount.toLocaleString('en-IN')}
                  readOnly
                  aria-readonly="true"
                  title="Auto-calculated from breakup amounts"
                />
                <small className="subline">Auto-calculated from amount breakup fields</small>
              </label>
            </div>

            <div className="actions-row">
              <button type="button" className="export-btn" onClick={generateQuickPdf} disabled={isQuickGenerating}>
                {isQuickGenerating ? 'Generating PDF...' : 'Generate Receipt PDF'}
              </button>
              <button type="button" className="sample-btn" onClick={resetQuickForm} disabled={isQuickGenerating}>
                Reset Form
              </button>
              <p className="size-note">Output: single receipt PDF</p>
            </div>

            {quickProcessingError && <p className="error-text">{quickProcessingError}</p>}
          </section>

          <section className="panel preview-panel">
            <h2>Quick Receipt Preview</h2>
            <p className="subline">This preview is used to generate your single receipt PDF.</p>
            <div className="preview-wrap">
              <div className="preview-receipt-page">
                <div className="receipt-slot">
                  <ReceiptTemplate row={quickPreviewRow} />
                </div>
              </div>
            </div>
          </section>

          <section className="pdf-staging" aria-hidden="true">
            <div className="quick-pdf-page">
              <div className="receipt-slot">
                <ReceiptTemplate row={quickPreviewRow} />
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function ReceiptTemplate({ row }: { row: ReceiptRow }) {
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

export default App
