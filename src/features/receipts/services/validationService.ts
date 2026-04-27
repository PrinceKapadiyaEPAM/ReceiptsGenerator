import {
  QUICK_BREAKDOWN_FIELDS,
  QUICK_LABELS,
  QUICK_REQUIRED_FIELDS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
} from '../constants'
import type { QuickFormErrors, QuickFormValues, RawRow, ReceiptRow, ValidationResult } from '../types'
import { formatPaymentMonth, parseAmount, toIndianWords } from '../utils'

export function getInitialQuickForm(): QuickFormValues {
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

export function getQuickTotalFromBreakdown(form: QuickFormValues): number {
  const values = QUICK_BREAKDOWN_FIELDS.map((field) => parseAmount(form[field]))
  return values.reduce((sum, value) => (Number.isNaN(value) ? sum : sum + value), 0)
}

export function buildQuickPreviewRow(form: QuickFormValues, totalAmount: number): ReceiptRow {
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

export function validateQuickForm(
  form: QuickFormValues,
  totalAmount: number,
): { errors: QuickFormErrors; row: ReceiptRow | null; formError: string } {
  const errors: QuickFormErrors = {}
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

export function parseMappedRows(rawRows: RawRow[], effectiveMapping: Record<string, string>): ValidationResult {
  const validRows: ReceiptRow[] = []
  const invalidRows: Array<{ sourceRow: number; reason: string }> = []

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
    const mobileNo = getField('mobileNo')

    const maintContribution = parseAmount(getField('maintContribution'))
    const shareCapital = parseAmount(getField('shareCapital'))
    const entranceFees = parseAmount(getField('entranceFees'))
    const developmentsFund = parseAmount(getField('developmentsFund'))
    const penaltyInterest = parseAmount(getField('penaltyInterest'))
    const totalAmountRaw = getField('totalAmount')

    const breakdownValues = [maintContribution, shareCapital, entranceFees, developmentsFund, penaltyInterest]
    const hasBreakdownInput = ['maintContribution', 'shareCapital', 'entranceFees', 'developmentsFund', 'penaltyInterest']
      .some((field) => getField(field).trim().length > 0)
    const breakdownTotal = breakdownValues.reduce(
      (sum, value) => (Number.isNaN(value) ? sum : sum + value),
      0,
    )

    const totalAmount = hasBreakdownInput ? breakdownTotal : parseAmount(totalAmountRaw)

    REQUIRED_FIELDS.forEach((field) => {
      const fieldValue = getField(field)
      if (!fieldValue) {
        errors.push(`${FIELD_LABELS[field]} is required`)
      }
    })

    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      errors.push('Total Amount must be a valid positive number')
    }

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
      mobileNo,
      maintContribution,
      shareCapital,
      entranceFees,
      developmentsFund,
      penaltyInterest,
      totalAmount,
    })
  })

  return { validRows, invalidRows }
}
