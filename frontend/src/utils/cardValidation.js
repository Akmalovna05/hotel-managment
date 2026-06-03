export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '')
}

export function luhnCheck(cardNumber) {
  const digits = digitsOnly(cardNumber)
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function detectCardBrand(cardNumber) {
  const d = digitsOnly(cardNumber)
  if (d.startsWith('4')) return 'visa'
  if (d.startsWith('5') || d.startsWith('2')) return 'mastercard'
  return null
}

export function formatCardNumber(value) {
  const d = digitsOnly(value).slice(0, 19)
  return d.replace(/(.{4})/g, '$1 ').trim()
}

export function formatExpiry(value) {
  const d = digitsOnly(value).slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

export function parseExpiry(expiry) {
  const parts = expiry.split('/')
  const month = parts[0]?.trim()
  let year = parts[1]?.trim()
  if (year?.length === 2) year = `20${year}`
  return { month, year }
}

export function validateCardForm({ cardholderName, cardNumber, expiry, cvv }) {
  const errors = {}
  const name = (cardholderName || '').trim()
  if (name.length < 2) errors.cardholderName = 'Enter the name on card'

  const digits = digitsOnly(cardNumber)
  const brand = detectCardBrand(digits)
  if (!brand) errors.cardNumber = 'Visa or MasterCard only'
  else if (![13, 16, 19].includes(digits.length) && brand === 'visa') errors.cardNumber = 'Invalid card number'
  else if (digits.length < 15) errors.cardNumber = 'Invalid card number'
  else if (!luhnCheck(digits)) errors.cardNumber = 'Invalid card number'

  const { month, year } = parseExpiry(expiry)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (!month || !year || m < 1 || m > 12) errors.expiry = 'Invalid expiry (MM/YY)'
  else {
    const now = new Date()
    const exp = new Date(y, m - 1, 1)
    if (exp < new Date(now.getFullYear(), now.getMonth(), 1)) errors.expiry = 'Card expired'
  }

  const cvvDigits = digitsOnly(cvv)
  if (cvvDigits.length < 3 || cvvDigits.length > 4) errors.cvv = 'CVV must be 3–4 digits'

  return { errors, valid: Object.keys(errors).length === 0, brand, digits }
}

export const SANDBOX_HINTS = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  decline: '4000 0000 0000 0002 or ends in 0000',
  cvvFail: 'CVV 000 declines',
}
