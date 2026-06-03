import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { setTheme } from '../../store/themeSlice'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const dispatch = useDispatch()
  const { mode } = useSelector((s) => s.theme)

  useEffect(() => {
    dispatch(setTheme(mode))
  }, [dispatch, mode])

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
