import { useState } from 'react'
import { Lock, CreditCard } from 'lucide-react'
import {
  formatCardNumber,
  formatExpiry,
  validateCardForm,
  digitsOnly,
  detectCardBrand,
  parseExpiry,
  SANDBOX_HINTS,
} from '../../utils/cardValidation'

const BRAND_STYLES = {
  visa: 'from-[#1a1f71] via-[#2d3a8c] to-[#0f172a]',
  mastercard: 'from-[#1a1a2e] via-[#3d0c02] to-[#1a1a2e]',
  default: 'from-slate-700 to-slate-900',
}

export default function CardPaymentForm({
  amount,
  onSubmit,
  isProcessing,
  disabled,
  submitLabel = 'Confirm payment',
}) {
  const [form, setForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const brand = detectCardBrand(form.cardNumber) || 'default'
  const preview = digitsOnly(form.cardNumber).padEnd(16, '•').slice(0, 16)
  const previewFmt = preview.replace(/(.{4})/g, '$1 ').trim()

  const update = (field, value) => {
    let v = value
    if (field === 'cardNumber') v = formatCardNumber(value)
    if (field === 'expiry') v = formatExpiry(value)
    if (field === 'cvv') v = digitsOnly(value).slice(0, 4)
    setForm((f) => ({ ...f, [field]: v }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validateCardForm(form).errors)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const { errors: err, valid } = validateCardForm(form)
    setErrors(err)
    setTouched({ cardholderName: true, cardNumber: true, expiry: true, cvv: true })
    if (!valid) return
    const { month, year } = parseExpiry(form.expiry)
    onSubmit({
      cardholder_name: form.cardholderName.trim(),
      card_number: digitsOnly(form.cardNumber),
      expiry_month: month.padStart(2, '0'),
      expiry_year: year,
      cvv: form.cvv,
    })
  }

  const fieldClass = (f) =>
    `input-field font-mono ${errors[f] && touched[f] ? 'border-red-500 focus:border-red-500' : ''}`

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${BRAND_STYLES[brand]} p-6 text-white shadow-xl`}>
        <div className="flex justify-between">
          <span className="text-xs font-bold uppercase tracking-widest opacity-80">
            {brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'MasterCard' : 'Card'}
          </span>
          <CreditCard className="h-7 w-7 opacity-80" />
        </div>
        <p className="mt-8 font-mono text-lg tracking-[0.2em]">{previewFmt || '•••• •••• •••• ••••'}</p>
        <div className="mt-6 flex justify-between text-sm">
          <div>
            <p className="text-[10px] uppercase opacity-50">Card holder</p>
            <p className="font-medium">{form.cardholderName || 'YOUR NAME'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase opacity-50">Expires</p>
            <p className="font-mono">{form.expiry || 'MM/YY'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="font-medium">Sandbox</p>
        <p>Visa: {SANDBOX_HINTS.visa}</p>
        <p>MC: {SANDBOX_HINTS.mastercard}</p>
        <p>{SANDBOX_HINTS.decline} · {SANDBOX_HINTS.cvvFail}</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Cardholder name</label>
        <input className={fieldClass('cardholderName')} value={form.cardholderName} onChange={(e) => update('cardholderName', e.target.value)} onBlur={() => handleBlur('cardholderName')} disabled={disabled || isProcessing} autoComplete="cc-name" />
        {errors.cardholderName && touched.cardholderName && <p className="mt-1 text-xs text-red-600">{errors.cardholderName}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Card number</label>
        <input className={fieldClass('cardNumber')} placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={(e) => update('cardNumber', e.target.value)} onBlur={() => handleBlur('cardNumber')} disabled={disabled || isProcessing} inputMode="numeric" />
        {errors.cardNumber && touched.cardNumber && <p className="mt-1 text-xs text-red-600">{errors.cardNumber}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Expiry</label>
          <input className={fieldClass('expiry')} placeholder="MM/YY" value={form.expiry} onChange={(e) => update('expiry', e.target.value)} onBlur={() => handleBlur('expiry')} disabled={disabled || isProcessing} />
          {errors.expiry && touched.expiry && <p className="mt-1 text-xs text-red-600">{errors.expiry}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">CVV</label>
          <input className={fieldClass('cvv')} type="password" value={form.cvv} onChange={(e) => update('cvv', e.target.value)} onBlur={() => handleBlur('cvv')} disabled={disabled || isProcessing} />
          {errors.cvv && touched.cvv && <p className="mt-1 text-xs text-red-600">{errors.cvv}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
        <Lock className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="text-slate-600 dark:text-slate-400">Secure sandbox — no real charges</span>
      </div>

      <button
        type="submit"
        disabled={disabled || isProcessing}
        className="btn-primary relative w-full overflow-hidden py-3.5 text-base font-semibold shadow-lg shadow-brand-600/25"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Processing…
          </span>
        ) : (
          `${submitLabel} · ${amount}`
        )}
      </button>
    </form>
  )
}
