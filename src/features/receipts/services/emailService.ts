type SendReceiptEmailParams = {
  to: string
  subject: string
  message: string
  receiptNumber: string
  attachment: Blob
  attachmentFileName: string
}

const EMAIL_API_URL = import.meta.env.VITE_RECEIPT_EMAIL_API_URL

async function blobToBase64(value: Blob): Promise<string> {
  const bytes = new Uint8Array(await value.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function sendReceiptEmail({
  to,
  subject,
  message,
  receiptNumber,
  attachment,
  attachmentFileName,
}: SendReceiptEmailParams): Promise<void> {
  if (!EMAIL_API_URL) {
    throw new Error('Email API is not configured. Set VITE_RECEIPT_EMAIL_API_URL in environment variables.')
  }

  const attachmentBase64 = await blobToBase64(attachment)

  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      message,
      receiptNumber,
      attachmentBase64,
      attachmentFileName,
      attachmentMimeType: attachment.type || 'application/pdf',
    }),
  })

  if (!response.ok) {
    const fallbackMessage = `Email request failed with status ${response.status}`
    let detail = fallbackMessage

    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) {
        detail = payload.message
      }
    } catch {
      detail = fallbackMessage
    }

    throw new Error(detail)
  }
}
