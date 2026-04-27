const { Router } = require('express')

const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'receipts-api',
    timestamp: new Date().toISOString(),
    database: process.env.POSTGRES_DB || 'receipts_gen',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
  })
})

module.exports = {
  healthRouter,
}
