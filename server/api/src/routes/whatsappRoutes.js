const { randomUUID } = require('crypto')
const { promises: fs } = require('fs')
const path = require('path')
const { Router } = require('express')
const { z } = require('zod')

const whatsappRouter = Router()

const sendReceiptSchema = z.object({
  to: z.string().trim().min(7),
  message: z.string().trim().min(1).max(1200),
  pdfBase64: z.string().trim().min(100),
  fileName: z.string().trim().min(1).max(120).optional(),
})

function toWhatsAppAddress(value) {
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length < 7) {
    throw new Error('Mobile number is invalid')
  }
  return `whatsapp:+${digits}`
}

function decodeBase64(value) {
  const normalized = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value
  return Buffer.from(normalized, 'base64')
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

whatsappRouter.post('/send-receipt', async (req, res) => {
  const parsed = sendReceiptSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid WhatsApp send payload',
      issues: parsed.error.issues,
    })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim()
  const publicBaseUrl =
    process.env.TWILIO_PUBLIC_BASE_URL?.trim() || process.env.PUBLIC_BASE_URL?.trim() || ''

  if (!accountSid || !authToken || !fromRaw) {
    return res.status(500).json({
      message: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM.',
    })
  }

  if (!publicBaseUrl) {
    return res.status(500).json({
      message: 'Public base URL is required. Set TWILIO_PUBLIC_BASE_URL to your devtunnel URL (set tunnel to Anonymous/Public access in VS Code Ports panel).',
    })
  }

  const payload = parsed.data

  let to
  let from
  try {
    to = toWhatsAppAddress(payload.to)
    from = fromRaw.startsWith('whatsapp:') ? fromRaw : toWhatsAppAddress(fromRaw)
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Invalid mobile number',
    })
  }

  const pdfBuffer = decodeBase64(payload.pdfBase64)
  if (!pdfBuffer.length) {
    return res.status(400).json({ message: 'PDF payload is empty' })
  }

  const uploadsDir = path.resolve(__dirname, '../../uploads/whatsapp')
  await fs.mkdir(uploadsDir, { recursive: true })

  const baseFileName = sanitizeFileName(payload.fileName || 'receipt.pdf')
  const storedFileName = `${Date.now()}-${randomUUID()}-${baseFileName}`
  const filePath = path.join(uploadsDir, storedFileName)
  await fs.writeFile(filePath, pdfBuffer)

  const mediaUrl = `${publicBaseUrl.replace(/\/$/, '')}/uploads/whatsapp/${encodeURIComponent(storedFileName)}`
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: payload.message,
    MediaUrl: mediaUrl,
  })

  const twilioResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const twilioPayload = await twilioResponse.json()
  if (!twilioResponse.ok) {
    return res.status(502).json({
      message: twilioPayload.message || 'Twilio send failed',
      code: twilioPayload.code,
      moreInfo: twilioPayload.more_info,
    })
  }

  return res.status(201).json({
    sid: twilioPayload.sid,
    status: twilioPayload.status,
    to,
    mediaUrl,
  })
})

module.exports = {
  whatsappRouter,
}
