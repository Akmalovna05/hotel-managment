import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CreditCard, Hash } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../../utils/helpers'

const STATUS_COLORS = {
  paid: 'bg-emerald-100 text-emerald-800',
  processing: 'bg-amber-100 text-amber-800',
  pending: 'bg-slate-100 text-slate-700',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
}

export default function ReceiptModal({ open, onClose, data, onDownload }) {
  if (!data) return null
  const statusClass = STATUS_COLORS[data.payment_status] || STATUS_COLORS.pending

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              <h2 className="font-display text-lg font-bold">Payment receipt</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-brand-600 p-6 text-white">
                <p className="text-sm opacity-80">HotelOS · Demo receipt</p>
                <p className="mt-2 font-mono text-lg">{data.transaction_id || '—'}</p>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                  {(data.payment_status || 'paid').toUpperCase()}
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row icon={Hash} label="Booking ref" value={data.booking_reference} />
                <Row icon={CreditCard} label="Card" value={data.card_last_four ? `•••• ${data.card_last_four}` : data.payment_method} />
                <div className="flex justify-between border-t pt-3 dark:border-slate-700">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="text-xl font-bold text-brand-600">{formatCurrency(data.total)}</span>
                </div>
                {data.paid_at && (
                  <p className="text-xs text-slate-400">{formatDateTime(data.paid_at)}</p>
                )}
              </div>
              {onDownload && (
                <button type="button" onClick={onDownload} className="btn-primary mt-6 w-full">
                  <Download className="h-4 w-4" /> Download receipt (HTML)
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-slate-500">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
