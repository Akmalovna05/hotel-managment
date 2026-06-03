export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
      {Icon && <Icon className="mb-4 h-12 w-12 text-slate-300" />}
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
