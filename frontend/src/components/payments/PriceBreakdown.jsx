import { formatCurrency } from '../../utils/helpers'

export default function PriceBreakdown({ subtotal, serviceFee, tax, total, balanceDue, compact }) {
  const rows = [
    { label: 'Room subtotal', value: subtotal },
    { label: 'Service fee (5%)', value: serviceFee },
    { label: 'Taxes & fees (10%)', value: tax },
  ]

  return (
    <div className={compact ? 'space-y-2 text-sm' : 'space-y-3'}>
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between text-slate-600 dark:text-slate-400">
          <span>{label}</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{formatCurrency(value)}</span>
        </div>
      ))}
      <div className={`flex justify-between border-t border-slate-200 pt-3 dark:border-slate-700 ${compact ? 'text-base' : 'text-xl'} font-bold`}>
        <span>{balanceDue != null ? 'Total due' : 'Total'}</span>
        <span className="text-brand-600">{formatCurrency(balanceDue ?? total)}</span>
      </div>
    </div>
  )
}
