export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'

export const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

export const getStatusColor = (status) => {
  const map = {
    available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    occupied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    reserved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    cleaning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    pending: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-emerald-100 text-emerald-800',
    checked_out: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-emerald-100 text-emerald-800',
    processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    partial: 'bg-amber-100 text-amber-800',
    refunded: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    open: 'bg-red-100 text-red-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }
  return map[status] || 'bg-slate-100 text-slate-700'
}

export const ROLES = {
  admin: 'Admin',
  manager: 'Manager',
  receptionist: 'Receptionist',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
}

export const canManage = (role) => ['admin', 'manager'].includes(role)
export const canBook = (role) => ['admin', 'manager', 'receptionist'].includes(role)
