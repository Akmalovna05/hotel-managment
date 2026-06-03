import { AlertCircle, RefreshCw } from 'lucide-react'

export default function QueryErrorBanner({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {message || 'Failed to load data. Please try again.'}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  )
}
