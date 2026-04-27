const { Router } = require('express')
const PDFDocument = require('pdfkit')
const { z } = require('zod')
const { pool } = require('../db/client')

const publicReceiptPdfRouter = Router()

const querySchema = z
  .object({
    receiptId: z.coerce.number().int().positive().optional(),
    receiptNumber: z.string().trim().min(1).max(120).optional(),
    accessKey: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.receiptId) || Boolean(value.receiptNumber), {
    message: 'Provide either receiptId or receiptNumber',
    path: ['receiptId'],
  })

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildFileName(receiptNumber) {
  const safe = String(receiptNumber || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${safe}.pdf`
}

function writeAmountRow(doc, label, amount, y) {
  doc.font('Helvetica').fontSize(11).text(label, 56, y)
  doc.font('Helvetica-Bold').fontSize(11).text(`Rs. ${formatCurrency(amount)}`, 380, y, {
    width: 160,
    align: 'right',
  })
}

function renderReceiptPdf(doc, receipt) {
  doc.font('Helvetica-Bold').fontSize(18).text('Swastik Rise Society', 50, 42)
  doc.font('Helvetica').fontSize(10).text('Maintenance Receipt', 50, 68)

  doc
    .lineWidth(1)
    .moveTo(50, 86)
    .lineTo(545, 86)
    .stroke()

  doc.font('Helvetica').fontSize(11)
  doc.text(`Receipt No: ${receipt.receiptNumber}`, 50, 102)
  doc.text(`Date: ${receipt.receiptDate}`, 360, 102)

  doc.text(`Member Name: ${receipt.memberName}`, 50, 128)
  doc.text(`Flat / Shop No: ${receipt.flatShopNo}`, 50, 148)

  doc
    .lineWidth(0.6)
    .rect(50, 180, 495, 185)
    .stroke()

  writeAmountRow(doc, 'Maintenance Contribution', receipt.maintContribution, 198)
  writeAmountRow(doc, 'Share Capital', receipt.shareCapital, 222)
  writeAmountRow(doc, 'Entrance Fees', receipt.entranceFees, 246)
  writeAmountRow(doc, 'Developments Fund', receipt.developmentsFund, 270)
  writeAmountRow(doc, 'Penalty / Interest', receipt.penaltyInterest, 294)

  doc
    .lineWidth(0.5)
    .moveTo(56, 322)
    .lineTo(539, 322)
    .stroke()

  doc.font('Helvetica-Bold').fontSize(12)
  doc.text('Total Amount', 56, 334)
  doc.text(`Rs. ${formatCurrency(receipt.totalAmount)}`, 380, 334, {
    width: 160,
    align: 'right',
  })

  doc.font('Helvetica').fontSize(10)
  if (receipt.mobileNo) {
    doc.text(`Mobile: ${receipt.mobileNo}`, 50, 390)
  }

  if (receipt.notes) {
    doc.text(`Notes: ${receipt.notes}`, 50, 408, { width: 495 })
  }

  doc.font('Helvetica').fontSize(10).text(`Generated: ${new Date().toISOString()}`, 50, 760)
}

publicReceiptPdfRouter.get('/receipt-pdf', async (req, res) => {
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid query parameters',
      issues: parsed.error.issues,
    })
  }

  const requiredAccessKey = process.env.PUBLIC_RECEIPT_API_KEY?.trim()
  if (requiredAccessKey && parsed.data.accessKey !== requiredAccessKey) {
    return res.status(403).json({ message: 'Invalid access key' })
  }

  const { receiptId, receiptNumber } = parsed.data
  const values = []
  let whereClause = ''

  if (receiptId) {
    values.push(receiptId)
    whereClause = `id = $${values.length}`
  } else {
    values.push(receiptNumber)
    whereClause = `receipt_number = $${values.length}`
  }

  const result = await pool.query(
    `SELECT id, receipt_number AS "receiptNumber", receipt_date::text AS "receiptDate", member_name AS "memberName",
            flat_shop_no AS "flatShopNo", total_amount::numeric AS "totalAmount",
            maint_contribution::numeric AS "maintContribution", share_capital::numeric AS "shareCapital",
            entrance_fees::numeric AS "entranceFees", developments_fund::numeric AS "developmentsFund",
            penalty_interest::numeric AS "penaltyInterest", mobile_no AS "mobileNo", notes
     FROM receipts
     WHERE ${whereClause}
     LIMIT 1`,
    values,
  )

  const row = result.rows[0]
  if (!row) {
    return res.status(404).json({ message: 'Receipt not found' })
  }

  const receipt = {
    ...row,
    totalAmount: Number(row.totalAmount),
    maintContribution: Number(row.maintContribution ?? 0),
    shareCapital: Number(row.shareCapital ?? 0),
    entranceFees: Number(row.entranceFees ?? 0),
    developmentsFund: Number(row.developmentsFund ?? 0),
    penaltyInterest: Number(row.penaltyInterest ?? 0),
  }

  const filename = buildFileName(receipt.receiptNumber)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  doc.on('error', (error) => {
    console.error('PDF generation failed:', error)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate PDF' })
    }
  })

  doc.pipe(res)
  renderReceiptPdf(doc, receipt)
  doc.end()
})

module.exports = {
  publicReceiptPdfRouter,
}
