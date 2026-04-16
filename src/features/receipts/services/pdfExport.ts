import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportMergedReceiptPdf(
  pages: HTMLElement[],
  onProgress: (progress: number) => void,
): Promise<void> {
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

  for (let index = 0; index < pages.length; index += 2) {
    if (index > 0) {
      pdf.addPage([pageWidthMm, pageHeightMm], 'portrait')
    }

    const topCanvas = await html2canvas(pages[index], {
      scale: 2,
      backgroundColor: '#ffffff',
    })
    if (topCanvas.width === 0 || topCanvas.height === 0) {
      throw new Error('Failed to capture receipt content for PDF. Please try again.')
    }
    pdf.addImage(topCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, slotWidthMm, slotHeightMm)

    let processedCount = index + 1

    if (index + 1 < pages.length) {
      const bottomCanvas = await html2canvas(pages[index + 1], {
        scale: 2,
        backgroundColor: '#ffffff',
      })
      if (bottomCanvas.width === 0 || bottomCanvas.height === 0) {
        throw new Error('Failed to capture receipt content for PDF. Please try again.')
      }
      pdf.addImage(bottomCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, slotHeightMm, slotWidthMm, slotHeightMm)
      processedCount = index + 2
    }

    onProgress(Math.round((processedCount / pages.length) * 100))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const dateTag = new Date().toISOString().slice(0, 10)
  pdf.save(`receipts-merged-${dateTag}.pdf`)
}
