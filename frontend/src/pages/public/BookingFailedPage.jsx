import { Link, useParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { XCircle, RefreshCw, History } from 'lucide-react'
import CheckoutSteps from '../../components/payments/CheckoutSteps'

export default function BookingFailedPage() {
  const { reference } = useParams()
  const location = useLocation()
  const detail =
    location.state?.detail ||
    'Your card was declined. Please try again or use a different card.'

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <CheckoutSteps current={2} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 text-center"
      >
        <XCircle className="mx-auto h-20 w-20 text-red-500" />
        <h1 className="mt-6 font-display text-3xl font-bold">Payment failed</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">{detail}</p>
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          Your reservation remains <strong>pending</strong>. No charge was completed. You can retry
          payment safely with demo test cards.
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={`/checkout/${reference}`} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> Try payment again
          </Link>
          <Link to={`/booking/history/${reference}`} className="btn-secondary">
            <History className="h-4 w-4" /> View attempts
          </Link>
          <Link to="/book" className="btn-secondary">
            Back to rooms
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
