import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Loader2 } from 'lucide-react'

export default function PaymentProcessingOverlay({ open, step, amount }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl dark:bg-slate-900/95"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="mt-6 text-center font-display text-xl font-bold">Processing payment</h2>
            {amount && (
              <p className="mt-1 text-center text-2xl font-bold text-brand-600">{amount}</p>
            )}
            <p className="mt-4 text-center text-sm text-slate-500">{step || 'Please wait…'}</p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <motion.div
                className="h-full bg-brand-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Shield className="h-4 w-4" />
              <span>Secure demo transaction · No real charges</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
