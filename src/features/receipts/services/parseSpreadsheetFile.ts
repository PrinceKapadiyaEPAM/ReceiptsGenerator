import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { RawRow } from '../types'

function mapRow(row: Record<string, unknown>): RawRow {
  const mapped: RawRow = {}
  Object.entries(row).forEach(([key, value]) => {
    mapped[key] = (value ?? '').toString()
  })
  return mapped
}

export async function parseSpreadsheetFile(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const text = await file.text()
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    })
    return result.data.map((row: Record<string, unknown>) => mapRow(row))
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })
    return json.map((row) => mapRow(row))
  }

  throw new Error('Unsupported format. Upload .csv, .xlsx, or .xls only.')
}
