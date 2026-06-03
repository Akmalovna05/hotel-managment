import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, XCircle, Receipt, Banknote, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsApi } from '../../api/payments'
import CardPaymentForm from './CardPaymentForm'
import PaymentProcessingOverlay from './PaymentProcessingOverlay'
import { simulatePaymentProcessing } from '../../utils/simulatePayment'
import { formatCurrency } from '../../utils/helpers'

const MANUAL_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
]

export default function PaymentCheckoutModal({ isOpen, onClose, booking }) {
  const qc = useQueryClient()
  const [step, setStep] = useState('method')
  const [payMethod, setPayMethod] = useState('card')
  const [result, setResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState('')

  const { data: status } = useQuery({
    queryKey: ['booking-payment-status', booking?.id],
    queryFn: async () => (await paymentsApi.bookingStatus(booking.id)).data,
    enabled: !!booking?.id && isOpen,
  })

  useEffect(() => {
    if (isOpen) {
      setStep('method')
      setPayMethod('card')
      setResult(null)
    }
  }, [isOpen, booking?.id])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payments'] })
    qc.invalidateQueries({ queryKey: ['bookings'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['booking-payment-status'] })
  }

  const cardMutation = useMutation({
    mutationFn: async (card) => {
      setProcessing(true)
      await simulatePaymentProcessing(setProcessStep)
      return paymentsApi.processCard({
        booking: booking.id,
        amount: status?.balance_due || booking.balance_due,
        ...card,
      })
    },
    onSuccess: (res) => {
      setProcessing(false)
      setProcessStep('')
      handleResult(res.data)
    },
    onError: (err) => {
      setProcessing(false)
      setProcessStep('')
      handleError(err)
    },
  })

  const manualMutation = useMutation({
    mutationFn: (method) =>
      paymentsApi.markPaid({
        booking: booking.id,
        amount: status?.balance_due || booking.balance_due,
        payment_method: method,
        notes: `${method} payment`,
      }),
    onSuccess: (res) => {
      setResult({ success: true, payment: res.data, detail: 'Payment recorded.' })
      setStep('success')
      invalidate()
      toast.success('Payment recorded')
    },
    onError: (err) => handleError(err),
  })

  const handleResult = (data) => {
    setResult(data)
    setStep(data.success ? 'success' : 'failed')
    invalidate()
    data.success ? toast.success('Payment successful') : toast.error(data.detail)
  }

  const handleError = (err) => {
    const data = err.response?.data || {}
    setResult({ success: false, detail: data.detail, payment: data.payment })
    setStep('failed')
    toast.error(data.detail || 'Payment failed')
  }

  const downloadReceipt = async (id) => {
    const res = await paymentsApi.receipt(id)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${id}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen || !booking) return null

  const balance = parseFloat(status?.balance_due ?? booking.balance_due ?? booking.total_amount ?? 0)
  const total = parseFloat(status?.total ?? booking.total_amount ?? 0)

  return (
    <AnimatePresence>
      <PaymentProcessingOverlay
        open={processing}
        step={processStep}
        amount={formatCurrency(balance)}
      />
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={!processing && !cardMutation.isPending ? onClose : undefined} />
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }} className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
          <div className="flex items-center justify-between border-b px-6 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold">Checkout</h2>
              <p className="text-sm text-slate-500">Booking #{booking.id}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            <div className="mb-5 rounded-xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="font-medium">{booking.guest_name}</p>
              <p className="text-sm text-slate-500">Room {booking.room_number}</p>
              {status?.invoice_number && <p className="mt-1 text-xs text-brand-600">Invoice {status.invoice_number}</p>}
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(status?.subtotal ?? total)}</span></div>
                {status?.service_fee != null && (
                  <div className="flex justify-between"><span className="text-slate-500">Service fee</span><span>{formatCurrency(status.service_fee)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(status?.tax ?? 0)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold dark:border-slate-700">
                  <span>Due now</span><span className="text-brand-600">{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>

            {step === 'method' && (
              <>
                <div className="mb-4 flex gap-2">
                  {['card', 'manual'].map((m) => (
                    <button key={m} type="button" onClick={() => setPayMethod(m)} className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${payMethod === m ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {m === 'card' ? 'Card' : 'Cash / Bank'}
                    </button>
                  ))}
                </div>
                {payMethod === 'card' ? (
                  <CardPaymentForm
                    amount={formatCurrency(balance)}
                    submitLabel="Confirm payment"
                    onSubmit={(c) => cardMutation.mutate(c)}
                    isProcessing={processing || cardMutation.isPending}
                    disabled={balance <= 0}
                  />
                ) : (
                  <div className="space-y-3">
                    {MANUAL_METHODS.map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => manualMutation.mutate(id)} disabled={manualMutation.isPending || balance <= 0} className="btn-secondary w-full justify-start">
                        <Icon className="h-4 w-4" /> Mark paid — {label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 'success' && result?.payment && (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                <h3 className="mt-4 text-xl font-bold">Payment successful</h3>
                <p className="mt-2 text-slate-500">{result.detail}</p>
                <p className="mt-3 font-mono text-sm">{formatCurrency(result.payment.amount)} · {result.payment.payment_method}</p>
                <button type="button" onClick={() => downloadReceipt(result.payment.id)} className="btn-secondary mx-auto mt-6"><Receipt className="h-4 w-4" /> Receipt</button>
                <button type="button" onClick={onClose} className="btn-primary mt-3 w-full">Done</button>
              </div>
            )}

            {step === 'failed' && (
              <div className="py-6 text-center">
                <XCircle className="mx-auto h-14 w-14 text-red-500" />
                <h3 className="mt-4 text-xl font-bold">Payment failed</h3>
                <p className="mt-2 text-slate-500">{result?.detail || 'Declined'}</p>
                <button type="button" onClick={() => setStep('method')} className="btn-primary mt-6 w-full">Try again</button>
                <button type="button" onClick={onClose} className="btn-secondary mt-2 w-full">Close</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
