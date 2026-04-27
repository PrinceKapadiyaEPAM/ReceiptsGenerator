const API_BASE_URL =
  (import.meta.env.VITE_RECEIPTS_API_BASE_URL as string | undefined)?.trim() ||
  'http://localhost:8788/api/v1'

type SendReceiptOnWhatsAppParams = {
  to: string
  message: string
  pdfBlob: Blob
  fileName: string
}

function blobToBase64(value: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const encoded = result.includes(',') ? result.slice(result.indexOf(',') + 1) : result
      resolve(encoded)
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read PDF blob'))
    reader.readAsDataURL(value)
  })
}

export async function sendReceiptOnWhatsApp({
  to,
  message,
  pdfBlob,
  fileName,
}: SendReceiptOnWhatsAppParams): Promise<void> {
  const pdfBase64 = await blobToBase64(pdfBlob)

  const response = await fetch(`${API_BASE_URL}/whatsapp/send-receipt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      message,
      fileName,
      pdfBase64,
    }),
  })

  if (!response.ok) {
    let reason = `WhatsApp send failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) {
        reason = payload.message
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(reason)
  }
}
