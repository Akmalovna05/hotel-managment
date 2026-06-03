import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import { publicBookingApi } from '../../api/public'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatCurrency, formatDateTime } from '../../utils/helpers'

const STATUS_STYLES = {
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

export default function GuestPaymentHistoryPage() {
  const { reference } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-history', reference],
    queryFn: async () => (await publicBookingApi.paymentHistory(reference)).data,
  })

  if (isLoading) return <LoadingSpinner />

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p>History not found.</p>
        <Link to="/book" className="btn-primary mt-4 inline-block">Home</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to={`/booking/success/${reference}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to confirmation
      </Link>
      <h1 className="font-display text-2xl font-bold">Payment history</h1>
      <p className="mt-1 text-slate-500">
        Booking <span className="font-mono font-medium">{data.booking_reference}</span>
      </p>

      <div className="mt-8 space-y-4">
        {!data.payments?.length ? (
          <p className="text-center text-slate-500">No payment attempts yet.</p>
        ) : (
          data.payments.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/40">
                  <CreditCard className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold capitalize">{p.payment_method}</p>
                  <p className="font-mono text-xs text-slate-500">{p.transaction_id}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(p.paid_at || p.created_at)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(p.amount)}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    STATUS_STYLES[p.payment_status] || STATUS_STYLES.pending
                  }`}
                >
                  {p.payment_status}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {data.transactions?.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Transaction log</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-t dark:border-slate-700">
                    <td className="px-4 py-3 capitalize">{t.transaction_type}</td>
                    <td className="px-4 py-3 capitalize">{t.status}</td>
                    <td className="px-4 py-3">{formatCurrency(t.amount)}</td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
