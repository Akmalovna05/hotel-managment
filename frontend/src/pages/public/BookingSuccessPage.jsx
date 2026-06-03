import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Home, Download, Receipt, History, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { publicBookingApi } from '../../api/public'
import CheckoutSteps from '../../components/payments/CheckoutSteps'
import EmailConfirmationBanner from '../../components/payments/EmailConfirmationBanner'
import ReceiptModal from '../../components/payments/ReceiptModal'
import PriceBreakdown from '../../components/payments/PriceBreakdown'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '../../utils/helpers'

export default function BookingSuccessPage() {
  const { reference } = useParams()
  const [receiptOpen, setReceiptOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['confirmation', reference],
    queryFn: async () => (await publicBookingApi.confirmation(reference)).data,
  })

  const downloadReceipt = async () => {
    const res = await publicBookingApi.downloadReceipt(reference)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${data?.booking_reference || reference}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadInvoice = async () => {
    const res = await publicBookingApi.downloadInvoice(reference)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${data?.invoice_number || reference}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-20">
      <CheckoutSteps current={3} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">Reservation confirmed</h1>
        <p className="mt-3 text-lg text-slate-500">
          Thank you, {data?.guest_name}. Your stay is secured.
        </p>
      </motion.div>

      <div className="mt-8">
        <EmailConfirmationBanner email={data?.guest_email} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-8 glass-card overflow-hidden"
      >
        <div className="border-b border-slate-200/80 bg-brand-50/50 px-6 py-4 dark:border-slate-700 dark:bg-brand-900/20">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Confirmation</p>
          <p className="font-mono text-xl font-bold text-brand-600">{data?.booking_reference}</p>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-slate-500">Room</p>
              <p className="font-semibold">{data?.room_number} · {data?.room_type}</p>
            </div>
            <div>
              <p className="text-slate-500">Dates</p>
              <p className="font-semibold">
                {formatDate(data?.check_in)} – {formatDate(data?.check_out)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Guests</p>
              <p className="font-semibold">{data?.guests_count}</p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <p className="font-semibold capitalize text-emerald-600">{data?.status}</p>
            </div>
          </div>
          <div className="mt-6 border-t pt-6 dark:border-slate-700">
            <PriceBreakdown
              compact
              subtotal={data?.subtotal}
              serviceFee={data?.service_fee}
              tax={data?.tax}
              total={data?.total}
            />
          </div>
          {data?.transaction_id && (
            <p className="mt-4 font-mono text-xs text-slate-400">
              Transaction: {data.transaction_id}
              {data?.card_last_four && ` · •••• ${data.card_last_four}`}
            </p>
          )}
        </div>
      </motion.div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => setReceiptOpen(true)} className="btn-secondary">
          <Receipt className="h-4 w-4" /> View receipt
        </button>
        <button type="button" onClick={downloadReceipt} className="btn-secondary">
          <Download className="h-4 w-4" /> Download receipt
        </button>
        <button type="button" onClick={downloadInvoice} className="btn-secondary">
          <FileText className="h-4 w-4" /> Download invoice
        </button>
        <Link to={`/booking/history/${reference}`} className="btn-secondary">
          <History className="h-4 w-4" /> Payment history
        </Link>
        <Link to="/book" className="btn-primary">
          <Home className="h-4 w-4" /> Book another stay
        </Link>
      </div>

      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={{
          ...data,
          payment_status: 'paid',
        }}
        onDownload={downloadReceipt}
      />
    </div>
  )
}
