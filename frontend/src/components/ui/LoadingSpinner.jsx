export default function LoadingSpinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${className} animate-spin rounded-full border-4 border-brand-200 border-t-brand-600`} />
    </div>
  )
}
