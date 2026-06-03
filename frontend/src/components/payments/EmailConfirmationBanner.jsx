import { motion } from 'framer-motion'
import { Mail, CheckCircle2 } from 'lucide-react'

export default function EmailConfirmationBanner({ email, sent = true }) {
  if (!email) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 dark:border-emerald-800/50 dark:from-emerald-900/20 dark:to-slate-900"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
        <Mail className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
          {sent && <CheckCircle2 className="h-4 w-4" />}
          Confirmation email {sent ? 'sent' : 'pending'}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          A reservation confirmation with your receipt has been sent to{' '}
          <strong className="text-slate-900 dark:text-white">{email}</strong>
        </p>
        <p className="mt-2 text-xs text-slate-400">Demo UI — email is simulated for this assignment.</p>
      </div>
    </motion.div>
  )
}
