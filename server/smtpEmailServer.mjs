import 'dotenv/config'
import http from 'node:http'
import nodemailer from 'nodemailer'

const PORT = Number(process.env.EMAIL_SERVER_PORT || 8787)
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
  console.error('Missing SMTP config. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(JSON.stringify(payload))
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    })
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/api/send-receipt-email') {
    sendJson(res, 404, { message: 'Route not found' })
    return
  }

  try {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 12 * 1024 * 1024) {
        req.destroy()
      }
    })

    await new Promise((resolve, reject) => {
      req.on('end', resolve)
      req.on('error', reject)
    })

    const payload = JSON.parse(body)
    const to = String(payload.to || '').trim()
    const subject = String(payload.subject || '').trim()
    const message = String(payload.message || '').trim()
    const receiptNumber = String(payload.receiptNumber || '').trim()
    const attachmentBase64 = String(payload.attachmentBase64 || '')
    const attachmentFileName = String(payload.attachmentFileName || 'receipt.pdf').trim()
    const attachmentMimeType = String(payload.attachmentMimeType || 'application/pdf').trim()

    if (!isEmail(to)) {
      sendJson(res, 400, { message: 'Valid recipient email is required' })
      return
    }

    if (!subject) {
      sendJson(res, 400, { message: 'Email subject is required' })
      return
    }

    if (!message) {
      sendJson(res, 400, { message: 'Email message is required' })
      return
    }

    if (!attachmentBase64) {
      sendJson(res, 400, { message: 'PDF attachment is required' })
      return
    }

    const html = `
      <p>${message.replace(/\n/g, '<br/>')}</p>
      <p><strong>Receipt Number:</strong> ${receiptNumber || '-'}</p>
    `

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: `${message}\n\nReceipt Number: ${receiptNumber || '-'}`,
      html,
      attachments: [
        {
          filename: attachmentFileName,
          content: attachmentBase64,
          encoding: 'base64',
          contentType: attachmentMimeType,
        },
      ],
    })

    sendJson(res, 200, { message: 'Receipt email sent successfully' })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown server error'
    sendJson(res, 500, { message: `Failed to send receipt email: ${reason}` })
  }
})

server.listen(PORT, () => {
  console.log(`SMTP email server running at http://localhost:${PORT}`)
})
