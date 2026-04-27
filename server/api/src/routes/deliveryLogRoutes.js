const { Router } = require('express')
const { z } = require('zod')
const { pool } = require('../db/client')

const deliveryLogRouter = Router()

const statusSchema = z.enum(['sent', 'failed', 'retry'])

const createLogItemSchema = z.object({
  receiptId: z.number().int().positive().optional(),
  receiptNumber: z.string().trim().min(1),
  mobileNo: z.string().trim().min(7).max(20).optional(),
  channel: z.string().trim().min(1).default('whatsapp'),
  status: statusSchema,
  errorMessage: z.string().trim().max(500).optional(),
})

const createLogsSchema = z.object({
  logs: z.array(createLogItemSchema).min(1).max(500),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: statusSchema.optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  receiptId: z.coerce.number().int().positive().optional(),
})

const updateLogSchema = z.object({
  status: statusSchema,
  errorMessage: z.string().trim().max(500).nullish(),
})

function mapDeliveryLogRow(row) {
  return {
    id: Number(row.id),
    receiptId: row.receiptId ? Number(row.receiptId) : null,
    receiptNumber: row.receiptNumber,
    mobileNo: row.mobileNo,
    channel: row.channel,
    status: row.status,
    errorMessage: row.errorMessage,
    attemptedAt: row.attemptedAt,
  }
}

deliveryLogRouter.post('/', async (req, res) => {
  const parsed = createLogsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid delivery log payload',
      issues: parsed.error.issues,
    })
  }

  const { logs } = parsed.data
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const log of logs) {
      await client.query(
        `INSERT INTO delivery_logs (receipt_id, receipt_number, mobile_no, channel, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          log.receiptId ?? null,
          log.receiptNumber,
          log.mobileNo ?? null,
          log.channel,
          log.status,
          log.errorMessage ?? null,
        ],
      )
    }

    await client.query('COMMIT')
    return res.status(201).json({ insertedCount: logs.length })
  } catch (error) {
    await client.query('ROLLBACK')
    return res.status(500).json({
      message: 'Failed to create delivery logs',
      reason: error instanceof Error ? error.message : 'Unknown error',
    })
  } finally {
    client.release()
  }
})

deliveryLogRouter.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid delivery log query parameters',
      issues: parsed.error.issues,
    })
  }

  const { limit, offset, status, month, receiptId } = parsed.data
  const conditions = []
  const values = []

  if (status) {
    values.push(status)
    conditions.push(`status = $${values.length}`)
  }

  if (receiptId) {
    values.push(receiptId)
    conditions.push(`receipt_id = $${values.length}`)
  }

  if (month) {
    values.push(`${month}-01`)
    conditions.push(`date_trunc('month', attempted_at) = date_trunc('month', $${values.length}::date)`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  values.push(limit)
  const limitParam = `$${values.length}`
  values.push(offset)
  const offsetParam = `$${values.length}`

  const { rows } = await pool.query(
    `SELECT id, receipt_id AS "receiptId", receipt_number AS "receiptNumber", mobile_no AS "mobileNo",
            channel, status, error_message AS "errorMessage", attempted_at AS "attemptedAt"
     FROM delivery_logs
     ${whereClause}
     ORDER BY attempted_at DESC, id DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    values,
  )

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM delivery_logs
     ${whereClause}`,
    values.slice(0, values.length - 2),
  )

  return res.json({
    items: rows.map(mapDeliveryLogRow),
    paging: {
      limit,
      offset,
      total: countResult.rows[0].total,
    },
  })
})

deliveryLogRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'Delivery log id must be a positive integer' })
  }

  const parsed = updateLogSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid delivery log update payload',
      issues: parsed.error.issues,
    })
  }

  const { status, errorMessage } = parsed.data
  const result = await pool.query(
    `UPDATE delivery_logs
     SET status = $1, error_message = $2, attempted_at = NOW()
     WHERE id = $3
     RETURNING id, receipt_id AS "receiptId", receipt_number AS "receiptNumber", mobile_no AS "mobileNo",
               channel, status, error_message AS "errorMessage", attempted_at AS "attemptedAt"`,
    [status, errorMessage ?? null, id],
  )

  if (result.rowCount === 0) {
    return res.status(404).json({ message: `Delivery log with id ${id} not found` })
  }

  return res.json(mapDeliveryLogRow(result.rows[0]))
})

module.exports = {
  deliveryLogRouter,
}
