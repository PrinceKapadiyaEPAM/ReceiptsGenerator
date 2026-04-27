import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function getReceiptFileName(receiptNumber: string): string {
  const dateTag = new Date().toISOString().slice(0, 10)
  const safeReceiptNumber = receiptNumber.replace(/[^a-zA-Z0-9-_]/g, '') || 'single'
  return `receipt-${safeReceiptNumber}-${dateTag}.pdf`
}

async function createSingleReceiptPdfDocument(page: HTMLElement): Promise<jsPDF> {
  const canvas = await html2canvas(page, {
    scale: 2,
    backgroundColor: '#ffffff',
  })
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Failed to capture quick receipt content for PDF. Please try again.')
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  const imageWidth = 210
  const imageHeight = (canvas.height / canvas.width) * imageWidth
  const imageY = Math.max(0, (297 - imageHeight) / 2)

  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, imageY, imageWidth, imageHeight)
  return pdf
}

export async function generateMergedReceiptsPdf(
  pages: HTMLElement[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  const pdf = await buildMergedReceiptsPdf(pages, onProgress)
  const dateTag = new Date().toISOString().slice(0, 10)
  pdf.save(`receipts-merged-${dateTag}.pdf`)
}

async function buildMergedReceiptsPdf(pages: HTMLElement[], onProgress?: (progress: number) => void): Promise<jsPDF> {
  if (pages.length === 0) {
    throw new Error('No receipt pages found for export.')
  }

  const pageWidthMm = 210
  const pageHeightMm = 297
  const slotWidthMm = 210
  const slotHeightMm = 148.5

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
  })

  for (let i = 0; i < pages.length; i += 2) {
    if (i > 0) {
      pdf.addPage([pageWidthMm, pageHeightMm], 'portrait')
    }

    const topCanvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: '#ffffff',
    })
    if (topCanvas.width === 0 || topCanvas.height === 0) {
      throw new Error('Failed to capture receipt content for PDF. Please try again.')
    }
    pdf.addImage(topCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, slotWidthMm, slotHeightMm)

    let processedCount = i + 1

    if (i + 1 < pages.length) {
      const bottomCanvas = await html2canvas(pages[i + 1], {
        scale: 2,
        backgroundColor: '#ffffff',
      })
      if (bottomCanvas.width === 0 || bottomCanvas.height === 0) {
        throw new Error('Failed to capture receipt content for PDF. Please try again.')
      }
      pdf.addImage(bottomCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, slotHeightMm, slotWidthMm, slotHeightMm)
      processedCount = i + 2
    }

    onProgress?.(Math.round((processedCount / pages.length) * 100))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return pdf
}

export async function generateSingleReceiptPdf(page: HTMLElement, receiptNumber: string): Promise<void> {
  const pdf = await createSingleReceiptPdfDocument(page)
  pdf.save(getReceiptFileName(receiptNumber))
}

export async function createSingleReceiptPdfBlob(page: HTMLElement): Promise<Blob> {
  const pdf = await createSingleReceiptPdfDocument(page)
  return pdf.output('blob')
}

export async function createMergedReceiptsPdfBlob(
  pages: HTMLElement[],
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  const pdf = await buildMergedReceiptsPdf(pages, onProgress)
  return pdf.output('blob')
}
