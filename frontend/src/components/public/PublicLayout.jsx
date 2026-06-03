import { Link, Outlet } from 'react-router-dom'
import { Hotel, LogIn } from 'lucide-react'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/book" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Hotel className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold">HotelOS</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/book" className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300">
              Book a room
            </Link>
            <Link to="/login" className="btn-secondary text-sm">
              <LogIn className="h-4 w-4" /> Staff login
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} HotelOS · Secure online reservations
      </footer>
    </div>
  )
}
