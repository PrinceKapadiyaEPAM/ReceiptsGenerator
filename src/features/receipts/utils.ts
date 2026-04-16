export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/,/g, '').trim()
  if (!cleaned) {
    return 0
  }

  const numberValue = Number(cleaned)
  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

export function formatDate(value: string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) {
    return value
  }

  const day = String(dt.getDate()).padStart(2, '0')
  const month = dt.toLocaleString('en-US', { month: 'short' })
  const year = dt.getFullYear()
  return `${day}-${month}-${year}`
}

export function toIndianWords(value: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function twoDigits(n: number): string {
    if (n < 20) {
      return ones[n]
    }

    const t = Math.floor(n / 10)
    const o = n % 10
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100)
    const rest = n % 100
    const head = h ? `${ones[h]} Hundred` : ''
    const tail = rest ? twoDigits(rest) : ''
    return [head, tail].filter(Boolean).join(' ')
  }

  if (!Number.isFinite(value) || value <= 0) {
    return 'Zero Rupees Only'
  }

  const num = Math.floor(value)
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const hundredPart = num % 1000

  const parts = [
    crore ? `${threeDigits(crore)} Crore` : '',
    lakh ? `${threeDigits(lakh)} Lakh` : '',
    thousand ? `${threeDigits(thousand)} Thousand` : '',
    hundredPart ? threeDigits(hundredPart) : '',
  ].filter(Boolean)

  return `${parts.join(' ')} Rupees Only`
}
