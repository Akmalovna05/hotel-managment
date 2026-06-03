import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BedDouble, CalendarDays, Users, Sparkles,
  Wrench, UserCog, CreditCard, Settings, Hotel,
} from 'lucide-react'
import { useSelector } from 'react-redux'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: 'all' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms', roles: 'all' },
  { to: '/bookings', icon: CalendarDays, label: 'Bookings', roles: ['admin', 'manager', 'receptionist'] },
  { to: '/guests', icon: Users, label: 'Guests', roles: ['admin', 'manager', 'receptionist'] },
  { to: '/housekeeping', icon: Sparkles, label: 'Housekeeping', roles: ['admin', 'manager', 'housekeeping'] },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', roles: ['admin', 'manager', 'maintenance'] },
  { to: '/staff', icon: UserCog, label: 'Staff', roles: ['admin', 'manager'] },
  { to: '/payments', icon: CreditCard, label: 'Payments', roles: ['admin', 'manager', 'receptionist'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: 'all' },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useSelector((s) => s.auth)
  const role = user?.role

  const filtered = navItems.filter(
    (item) => item.roles === 'all' || item.roles.includes(role)
  )

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl transition-transform dark:border-slate-800 dark:bg-slate-900/90 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <Hotel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">HotelOS</h1>
            <p className="text-xs text-slate-500">Management Suite</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="truncate text-sm font-semibold">{user?.full_name || user?.username}</p>
          <p className="text-xs capitalize text-brand-600">{user?.role}</p>
        </div>
      </aside>
    </>
  )
}
