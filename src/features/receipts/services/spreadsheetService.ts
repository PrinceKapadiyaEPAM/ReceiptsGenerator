import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { RawRow } from '../types'

export async function parseSpreadsheetFile(selectedFile: File): Promise<{ rows: RawRow[]; headers: string[] }> {
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

  return {
    rows,
    headers: Object.keys(rows[0]),
  }
}
