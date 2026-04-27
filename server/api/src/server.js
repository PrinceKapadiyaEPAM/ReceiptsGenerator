const path = require('path')
const defaultEnvPath = path.resolve(__dirname, '../.env')
require('dotenv').config({ path: process.env.API_ENV_FILE || defaultEnvPath })

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const { initDb } = require('./db/client')
const { healthRouter } = require('./routes/healthRoutes')
const { deliveryLogRouter } = require('./routes/deliveryLogRoutes')
const { whatsappRouter } = require('./routes/whatsappRoutes')
const { publicReceiptPdfRouter } = require('./routes/publicReceiptPdfRoutes')
const { receiptRouter } = require('./routes/receiptRoutes')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  }),
)
app.use(express.json({ limit: '12mb' }))
app.use(morgan('dev'))
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

app.get('/', (_req, res) => {
  res.json({
    message: 'Receipts API is running',
    docs: '/api/health and /api/v1/receipts',
  })
})

app.use('/api/health', healthRouter)
app.use('/api/v1/receipts', receiptRouter)
app.use('/api/v1/delivery-logs', deliveryLogRouter)
app.use('/api/v1/whatsapp', whatsappRouter)
app.use('/api/v1/public', publicReceiptPdfRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  return res.status(500).json({ message: 'Unexpected server error' })
})

const port = Number(process.env.API_PORT || 8788)

async function startServer() {
  await initDb()

  app.listen(port, () => {
    console.log(`Receipts API server running at http://localhost:${port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start API server:', error)
  process.exit(1)
})
