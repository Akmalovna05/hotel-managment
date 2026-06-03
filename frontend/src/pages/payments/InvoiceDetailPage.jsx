import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, CreditCard } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { paymentsApi } from '../../api/payments'
import { endpoints } from '../../api/client'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import QueryErrorBanner from '../../components/ui/QueryErrorBanner'
import PaymentCheckoutModal from '../../components/payments/PaymentCheckoutModal'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { getApiErrorMessage } from '../../utils/apiError'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const [payBooking, setPayBooking] = useState(null)

  const { data: invoice, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await paymentsApi.invoice(id)).data,
    retry: 1,
  })

  const { data: booking } = useQuery({
    queryKey: ['booking', invoice?.booking],
    queryFn: async () => (await endpoints.booking(invoice.booking)).data,
    enabled: !!invoice?.booking,
  })

  const { data: payments } = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: async () => {
      const res = await paymentsApi.records({ invoice: id })
      return res.data.results || res.data
    },
    enabled: !!id,
  })

  const exportInvoice = async () => {
    try {
      const res = await paymentsApi.exportInvoice(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not export invoice'))
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <Link to="/payments" className="text-sm text-brand-600 hover:underline">← Back to billing</Link>
        <QueryErrorBanner message={getApiErrorMessage(error, 'Invoice not found')} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-slate-500">
        Invoice not found
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/payments" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to billing
      </Link>

      <div className="glass-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Invoice</p>
            <h1 className="font-display text-2xl font-bold">{invoice.invoice_number}</h1>
            <p className="mt-1 text-slate-500">Issued {formatDate(invoice.issued_at)}</p>
          </div>
          <Badge status={invoice.status} />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Bill to</p>
            <p className="mt-1 font-medium">{invoice.guest_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Booking</p>
            <p className="mt-1 font-medium">#{invoice.booking_id} · Room {invoice.room_number}</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[280px] text-sm">
            <tbody>
              <tr className="border-b dark:border-slate-700">
                <td className="py-3 text-slate-500">Subtotal</td>
                <td className="py-3 text-right font-medium">{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr className="border-b dark:border-slate-700">
                <td className="py-3 text-slate-500">Tax (10%)</td>
                <td className="py-3 text-right font-medium">{formatCurrency(invoice.tax)}</td>
              </tr>
              <tr>
                <td className="py-4 text-lg font-bold">Total</td>
                <td className="py-4 text-right text-xl font-bold text-brand-600">{formatCurrency(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={exportInvoice} className="btn-secondary">
            <Download className="h-4 w-4" /> Download invoice
          </button>
          {invoice.status !== 'paid' && booking && (
            <button type="button" onClick={() => setPayBooking(booking)} className="btn-primary">
              <CreditCard className="h-4 w-4" /> Pay invoice
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Payment history</h2>
        {!payments?.length ? (
          <p className="text-sm text-slate-500">No payments on this invoice yet.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-500 capitalize">{p.payment_method} · {p.transaction_id}</p>
                </div>
                <Badge status={p.payment_status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentCheckoutModal isOpen={!!payBooking} onClose={() => setPayBooking(null)} booking={payBooking} />
    </div>
  )
}
