const { Router } = require('express')
const { z } = require('zod')
const { pool } = require('../db/client')

const receiptRouter = Router()

const breakdownFields = {
  maintContribution: z.number().finite().nonnegative().default(0),
  shareCapital: z.number().finite().nonnegative().default(0),
  entranceFees: z.number().finite().nonnegative().default(0),
  developmentsFund: z.number().finite().nonnegative().default(0),
  penaltyInterest: z.number().finite().nonnegative().default(0),
}

const createReceiptSchema = z.object({
  receiptNumber: z.string().trim().min(1),
  receiptDate: z.string().trim().min(1),
  memberName: z.string().trim().min(1),
  flatShopNo: z.string().trim().min(1),
  totalAmount: z.number().finite().nonnegative(),
  mobileNo: z.string().trim().min(7).max(20).optional(),
  notes: z.string().trim().max(500).optional(),
  ...breakdownFields,
})

const bulkCreateSchema = z.object({
  items: z.array(createReceiptSchema).min(1).max(500),
})

const pagingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  query: z.string().trim().max(120).optional(),
})

function mapReceiptRow(row) {
  return {
    id: Number(row.id),
    receiptNumber: row.receiptNumber,
    receiptDate: row.receiptDate,
    memberName: row.memberName,
    flatShopNo: row.flatShopNo,
    totalAmount: Number(row.totalAmount),
    maintContribution: Number(row.maintContribution ?? 0),
    shareCapital: Number(row.shareCapital ?? 0),
    entranceFees: Number(row.entranceFees ?? 0),
    developmentsFund: Number(row.developmentsFund ?? 0),
    penaltyInterest: Number(row.penaltyInterest ?? 0),
    mobileNo: row.mobileNo,
    notes: row.notes,
    createdAt: row.createdAt,
  }
}

receiptRouter.get('/', async (req, res) => {
  const parsedPaging = pagingSchema.safeParse(req.query)
  if (!parsedPaging.success) {
    return res.status(400).json({
      message: 'Invalid paging options',
      issues: parsedPaging.error.issues,
    })
  }

  const { limit, offset, month, query } = parsedPaging.data
  const conditions = []
  const values = []

  if (month) {
    values.push(`${month}-01`)
    conditions.push(`date_trunc('month', receipt_date) = date_trunc('month', $${values.length}::date)`)
  }

  if (query) {
    values.push(`%${query}%`)
    const queryParam = `$${values.length}`
    conditions.push(
      `(receipt_number ILIKE ${queryParam} OR member_name ILIKE ${queryParam} OR flat_shop_no ILIKE ${queryParam} OR COALESCE(mobile_no, '') ILIKE ${queryParam})`,
    )
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  values.push(limit)
  const limitParam = `$${values.length}`
  values.push(offset)
  const offsetParam = `$${values.length}`

  const { rows } = await pool.query(
    `SELECT id, receipt_number AS "receiptNumber", receipt_date::text AS "receiptDate", member_name AS "memberName",
            flat_shop_no AS "flatShopNo", total_amount::numeric AS "totalAmount",
            maint_contribution::numeric AS "maintContribution", share_capital::numeric AS "shareCapital",
            entrance_fees::numeric AS "entranceFees", developments_fund::numeric AS "developmentsFund",
            penalty_interest::numeric AS "penaltyInterest",
            mobile_no AS "mobileNo", notes, created_at AS "createdAt"
     FROM receipts
     ${whereClause}
     ORDER BY id DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    values,
  )

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM receipts ${whereClause}`, values.slice(0, values.length - 2))
  const total = countResult.rows[0].total

  return res.json({
    items: rows.map(mapReceiptRow),
    paging: { limit, offset, total },
  })
})

receiptRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Receipt id must be a positive integer' })
  }

  const result = await pool.query(
    `SELECT id, receipt_number AS "receiptNumber", receipt_date::text AS "receiptDate", member_name AS "memberName",
            flat_shop_no AS "flatShopNo", total_amount::numeric AS "totalAmount",
            maint_contribution::numeric AS "maintContribution", share_capital::numeric AS "shareCapital",
            entrance_fees::numeric AS "entranceFees", developments_fund::numeric AS "developmentsFund",
            penalty_interest::numeric AS "penaltyInterest",
            mobile_no AS "mobileNo", notes, created_at AS "createdAt"
     FROM receipts
     WHERE id = $1`,
    [id],
  )

  const row = result.rows[0]

  if (!row) {
    return res.status(404).json({ message: `Receipt with id ${id} not found` })
  }

  return res.json(mapReceiptRow(row))
})

receiptRouter.post('/', async (req, res) => {
  const parsed = createReceiptSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid receipt payload',
      issues: parsed.error.issues,
    })
  }

  const payload = parsed.data

  try {
    const result = await pool.query(
      `INSERT INTO receipts (receipt_number, receipt_date, member_name, flat_shop_no, total_amount,
                             maint_contribution, share_capital, entrance_fees, developments_fund, penalty_interest,
                             mobile_no, notes)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, receipt_number AS "receiptNumber", receipt_date::text AS "receiptDate", member_name AS "memberName",
                 flat_shop_no AS "flatShopNo", total_amount::numeric AS "totalAmount",
                 maint_contribution::numeric AS "maintContribution", share_capital::numeric AS "shareCapital",
                 entrance_fees::numeric AS "entranceFees", developments_fund::numeric AS "developmentsFund",
                 penalty_interest::numeric AS "penaltyInterest",
                 mobile_no AS "mobileNo", notes, created_at AS "createdAt"`,
      [
        payload.receiptNumber,
        payload.receiptDate,
        payload.memberName,
        payload.flatShopNo,
        payload.totalAmount,
        payload.maintContribution ?? 0,
        payload.shareCapital ?? 0,
        payload.entranceFees ?? 0,
        payload.developmentsFund ?? 0,
        payload.penaltyInterest ?? 0,
        payload.mobileNo ?? null,
        payload.notes ?? null,
      ],
    )

    return res.status(201).json(mapReceiptRow(result.rows[0]))
  } catch (error) {
    if (error && typeof error === 'object' && error.code === '23505') {
      return res.status(409).json({
        message: `Receipt number '${payload.receiptNumber}' already exists`,
      })
    }

    return res.status(500).json({ message: 'Failed to create receipt record' })
  }
})

const updateReceiptSchema = z.object({
  receiptNumber: z.string().trim().min(1).optional(),
  receiptDate: z.string().trim().min(1).optional(),
  memberName: z.string().trim().min(1).optional(),
  flatShopNo: z.string().trim().min(1).optional(),
  totalAmount: z.number().finite().nonnegative().optional(),
  maintContribution: z.number().finite().nonnegative().optional(),
  shareCapital: z.number().finite().nonnegative().optional(),
  entranceFees: z.number().finite().nonnegative().optional(),
  developmentsFund: z.number().finite().nonnegative().optional(),
  penaltyInterest: z.number().finite().nonnegative().optional(),
  mobileNo: z.string().trim().min(7).max(20).nullish(),
  notes: z.string().trim().max(500).nullish(),
})

receiptRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Receipt id must be a positive integer' })
  }

  const parsed = updateReceiptSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid update payload', issues: parsed.error.issues })
  }

  const data = parsed.data
  const setClauses = []
  const values = []

  if (data.receiptNumber !== undefined) { values.push(data.receiptNumber); setClauses.push(`receipt_number = $${values.length}`) }
  if (data.receiptDate !== undefined) { values.push(data.receiptDate); setClauses.push(`receipt_date = $${values.length}::date`) }
  if (data.memberName !== undefined) { values.push(data.memberName); setClauses.push(`member_name = $${values.length}`) }
  if (data.flatShopNo !== undefined) { values.push(data.flatShopNo); setClauses.push(`flat_shop_no = $${values.length}`) }
  if (data.totalAmount !== undefined) { values.push(data.totalAmount); setClauses.push(`total_amount = $${values.length}`) }
  if (data.maintContribution !== undefined) { values.push(data.maintContribution); setClauses.push(`maint_contribution = $${values.length}`) }
  if (data.shareCapital !== undefined) { values.push(data.shareCapital); setClauses.push(`share_capital = $${values.length}`) }
  if (data.entranceFees !== undefined) { values.push(data.entranceFees); setClauses.push(`entrance_fees = $${values.length}`) }
  if (data.developmentsFund !== undefined) { values.push(data.developmentsFund); setClauses.push(`developments_fund = $${values.length}`) }
  if (data.penaltyInterest !== undefined) { values.push(data.penaltyInterest); setClauses.push(`penalty_interest = $${values.length}`) }
  if ('mobileNo' in data) { values.push(data.mobileNo ?? null); setClauses.push(`mobile_no = $${values.length}`) }
  if ('notes' in data) { values.push(data.notes ?? null); setClauses.push(`notes = $${values.length}`) }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: 'No fields provided to update' })
  }

  values.push(id)
  try {
    const result = await pool.query(
      `UPDATE receipts SET ${setClauses.join(', ')} WHERE id = $${values.length}
       RETURNING id, receipt_number AS "receiptNumber", receipt_date::text AS "receiptDate", member_name AS "memberName",
                 flat_shop_no AS "flatShopNo", total_amount::numeric AS "totalAmount",
                 maint_contribution::numeric AS "maintContribution", share_capital::numeric AS "shareCapital",
                 entrance_fees::numeric AS "entranceFees", developments_fund::numeric AS "developmentsFund",
                 penalty_interest::numeric AS "penaltyInterest",
                 mobile_no AS "mobileNo", notes, created_at AS "createdAt"`,
      values,
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ message: `Receipt with id ${id} not found` })
    }
    return res.json(mapReceiptRow(result.rows[0]))
  } catch (error) {
    if (error && typeof error === 'object' && error.code === '23505') {
      return res.status(409).json({ message: `Receipt number already exists` })
    }
    return res.status(500).json({ message: 'Failed to update receipt record' })
  }
})

receiptRouter.post('/bulk', async (req, res) => {
  const parsed = bulkCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid bulk receipt payload',
      issues: parsed.error.issues,
    })
  }

  const { items } = parsed.data
  const client = await pool.connect()

  let insertedCount = 0
  const failed = []

  try {
    await client.query('BEGIN')

    for (let index = 0; index < items.length; index += 1) {
      const row = items[index]

      try {
        const result = await client.query(
          `INSERT INTO receipts (receipt_number, receipt_date, member_name, flat_shop_no, total_amount,
                                 maint_contribution, share_capital, entrance_fees, developments_fund, penalty_interest,
                                 mobile_no, notes)
           VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (receipt_number) DO NOTHING
           RETURNING id`,
          [
            row.receiptNumber,
            row.receiptDate,
            row.memberName,
            row.flatShopNo,
            row.totalAmount,
            row.maintContribution ?? 0,
            row.shareCapital ?? 0,
            row.entranceFees ?? 0,
            row.developmentsFund ?? 0,
            row.penaltyInterest ?? 0,
            row.mobileNo ?? null,
            row.notes ?? null,
          ],
        )

        if (result.rowCount === 0) {
          failed.push({
            rowIndex: index,
            receiptNumber: row.receiptNumber,
            reason: `Duplicate receipt number '${row.receiptNumber}'`,
          })
          continue
        }

        insertedCount += 1
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown insert error'
        failed.push({
          rowIndex: index,
          receiptNumber: row.receiptNumber,
          reason,
        })
      }
    }

    await client.query('COMMIT')

    return res.status(201).json({
      totalReceived: items.length,
      insertedCount,
      failedCount: failed.length,
      failed,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return res.status(500).json({
      message: 'Failed to process bulk receipt upload',
      reason: error instanceof Error ? error.message : 'Unknown error',
    })
  } finally {
    client.release()
  }
})

module.exports = {
  receiptRouter,
}
