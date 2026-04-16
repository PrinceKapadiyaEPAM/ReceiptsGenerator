import { FIELD_ALIASES, FIELD_LABELS, REQUIRED_FIELDS } from '../constants'
import type { ParsedReceipts, RawRow, ReceiptField, ReceiptMapping, ReceiptRow } from '../types'
import { normalizeHeader, parseAmount, toIndianWords } from '../utils'

export function getAutoMapping(headers: string[]): ReceiptMapping {
  const map: ReceiptMapping = {}
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    key: normalizeHeader(header),
  }))

  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const match = normalizedHeaders.find((entry) => aliases.some((alias) => normalizeHeader(alias) === entry.key))
    if (match) {
      map[field] = match.original
    }
  })

  return map
}

export function buildReceiptRows(rawRows: RawRow[], mapping: ReceiptMapping): ParsedReceipts {
  const validRows: ReceiptRow[] = []
  const invalidRows: ParsedReceipts['invalidRows'] = []

  rawRows.forEach((row, index) => {
    const sourceRow = index + 2
    const errors: string[] = []

    const getFieldValue = (field: ReceiptField): string => {
      const header = mapping[field]
      if (!header) {
        return ''
      }

      return (row[header] ?? '').toString().trim()
    }

    REQUIRED_FIELDS.forEach((field) => {
      if (!getFieldValue(field)) {
        errors.push(`${FIELD_LABELS[field]} is required`)
      }
    })

    const amountBreakdown = {
      maintContribution: parseAmount(getFieldValue('maintContribution')),
      shareCapital: parseAmount(getFieldValue('shareCapital')),
      entranceFees: parseAmount(getFieldValue('entranceFees')),
      developmentsFund: parseAmount(getFieldValue('developmentsFund')),
      penaltyInterest: parseAmount(getFieldValue('penaltyInterest')),
    }

    const totalAmount = parseAmount(getFieldValue('totalAmount'))
    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      errors.push('Total Amount must be a valid positive number')
    }

    if (Object.values(amountBreakdown).some((value) => Number.isNaN(value))) {
      errors.push('One or more breakdown amounts are invalid')
    }

    if (errors.length > 0) {
      invalidRows.push({ sourceRow, reason: errors.join('; ') })
      return
    }

    validRows.push({
      sourceRow,
      receiptNumber: getFieldValue('receiptNumber'),
      date: getFieldValue('date'),
      name: getFieldValue('name'),
      flatShopNo: getFieldValue('flatShopNo'),
      rupeesText: getFieldValue('rupeesText') || toIndianWords(totalAmount),
      cashOrChequeNo: getFieldValue('cashOrChequeNo'),
      dated: getFieldValue('dated') || getFieldValue('date'),
      bank: getFieldValue('bank'),
      amountBreakdown,
      totalAmount,
    })
  })

  return { validRows, invalidRows }
}
