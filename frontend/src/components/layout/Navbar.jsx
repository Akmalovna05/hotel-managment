import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toggleTheme } from '../../store/themeSlice'
import { logout } from '../../store/authSlice'
import { endpoints } from '../../api/client'

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { mode } = useSelector((s) => s.theme)
  const { user } = useSelector((s) => s.auth)

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await endpoints.notifications()
      return res.data.results || res.data
    },
    refetchInterval: 30000,
    retry: 1,
  })

  const unread = Array.isArray(notifications)
    ? notifications.filter((n) => !n.is_read).length
    : 0

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 lg:px-6">
      <button onClick={onMenuClick} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800">
        <Menu className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
        <button onClick={() => navigate('/settings')} className="ml-1 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
        </button>
      </div>
    </header>
  )
}
