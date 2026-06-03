import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { User, CreditCard, Lock, MapPin } from 'lucide-react'
import { publicBookingApi } from '../../api/public'
import CardPaymentForm from '../../components/payments/CardPaymentForm'
import CheckoutSteps from '../../components/payments/CheckoutSteps'
import PriceBreakdown from '../../components/payments/PriceBreakdown'
import PaymentProcessingOverlay from '../../components/payments/PaymentProcessingOverlay'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { simulatePaymentProcessing } from '../../utils/simulatePayment'
import { formatCurrency, formatDate } from '../../utils/helpers'

export default function CheckoutPage() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [processStep, setProcessStep] = useState('')

  const { data: checkout, isLoading, error } = useQuery({
    queryKey: ['checkout', reference],
    queryFn: async () => (await publicBookingApi.checkout(reference)).data,
    retry: false,
  })

  const handleConfirmPayment = async (card) => {
    const balance = parseFloat(checkout.balance_due)
    setOverlayOpen(true)
    try {
      await simulatePaymentProcessing(setProcessStep)
      const res = await publicBookingApi.pay({ checkout_reference: reference, ...card })
      if (res.data.success) {
        navigate(`/booking/success/${reference}`, {
          state: { payment: res.data.payment, transactionId: res.data.payment?.transaction_id },
        })
      } else {
        navigate(`/booking/failed/${reference}`, { state: { detail: res.data.detail } })
      }
    } catch (err) {
      const data = err.response?.data
      navigate(`/booking/failed/${reference}`, {
        state: { detail: data?.detail || 'Payment could not be completed.' },
      })
    } finally {
      setOverlayOpen(false)
      setProcessStep('')
    }
  }

  if (isLoading) return <div className="py-20"><LoadingSpinner /></div>
  if (error || !checkout) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Checkout not found</h1>
        <Link to="/book" className="btn-primary mt-6 inline-block">Browse rooms</Link>
      </div>
    )
  }

  if (checkout.payment_status === 'paid' || checkout.booking_status === 'confirmed') {
    navigate(`/booking/success/${reference}`, { replace: true })
    return null
  }

  const balance = parseFloat(checkout.balance_due)

  return (
    <>
      <PaymentProcessingOverlay
        open={overlayOpen}
        step={processStep}
        amount={formatCurrency(balance)}
      />
      <div className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <CheckoutSteps current={2} />
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Complete your reservation
          </h1>
          <p className="mt-2 text-slate-500">
            Ref <span className="font-mono font-medium text-brand-600">{checkout.booking_reference}</span>
            · Secure demo checkout
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <section className="glass-card overflow-hidden">
              <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="flex items-center gap-2 font-semibold">
                  <MapPin className="h-5 w-5 text-brand-600" />
                  Booking summary
                </h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-6">
                  <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 font-display text-3xl font-bold text-brand-600/50 dark:from-brand-900 dark:to-brand-800">
                    {checkout.room_number}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{checkout.room_type}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(checkout.check_in)} → {formatDate(checkout.check_out)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {checkout.nights} nights · {checkout.guests_count} guests
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Awaiting payment
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="flex items-center gap-2 font-semibold">
                  <User className="h-5 w-5 text-brand-600" />
                  Guest information
                </h2>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <InfoField label="Name" value={checkout.guest_name} />
                <InfoField label="Email" value={checkout.guest_email} />
                <InfoField label="Phone" value={checkout.guest_phone} />
                <InfoField label="Booking ID" value={`#${checkout.booking_id}`} mono />
              </div>
            </section>

            <section className="glass-card overflow-hidden">
              <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="flex items-center gap-2 font-semibold">
                  <CreditCard className="h-5 w-5 text-brand-600" />
                  Payment details
                </h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Lock className="h-3 w-3" /> Visa & MasterCard · Demo sandbox only
                </p>
              </div>
              <div className="p-6">
                <CardPaymentForm
                  amount={formatCurrency(balance)}
                  submitLabel="Confirm payment"
                  onSubmit={handleConfirmPayment}
                  isProcessing={overlayOpen}
                  disabled={balance <= 0}
                />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-5">
            <div className="glass-card sticky top-24 overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-5 text-white">
                <p className="text-sm opacity-90">Price breakdown</p>
                <p className="mt-1 text-3xl font-bold">{formatCurrency(balance)}</p>
                <p className="text-xs opacity-75">All taxes & fees included</p>
              </div>
              <div className="p-6">
                <PriceBreakdown
                  subtotal={checkout.subtotal}
                  serviceFee={checkout.service_fee}
                  tax={checkout.tax}
                  total={checkout.total}
                  balanceDue={checkout.balance_due}
                />
                {checkout.invoice_number && (
                  <p className="mt-4 text-xs text-slate-500">
                    Proforma invoice: <span className="font-mono">{checkout.invoice_number}</span>
                  </p>
                )}
                <ul className="mt-6 space-y-2 text-xs text-slate-500">
                  <li>· Free cancellation within 24h (demo policy)</li>
                  <li>· Booking confirmed instantly after payment</li>
                  <li>· Receipt & invoice available after checkout</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function InfoField({ label, value, mono }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-medium ${mono ? 'font-mono text-sm' : ''}`}>{value || '—'}</p>
    </div>
  )
}
