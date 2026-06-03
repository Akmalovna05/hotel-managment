import { Check } from 'lucide-react'

const STEPS = ['Select room', 'Guest details', 'Payment', 'Confirmation']

export default function CheckoutSteps({ current = 2 }) {
  return (
    <nav className="mb-10 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                active ? 'font-semibold text-brand-600' : 'text-slate-500'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 hidden h-px w-8 bg-slate-200 sm:block dark:bg-slate-700" />
            )}
          </div>
        )
      })}
    </nav>
  )
}
