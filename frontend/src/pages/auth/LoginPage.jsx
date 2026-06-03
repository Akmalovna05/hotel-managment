import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { Hotel, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '../../api/client'
import { setCredentials } from '../../store/authSlice'

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      dispatch(setCredentials({ user: data.user, access: data.access, refresh: data.refresh }))
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <Hotel className="h-10 w-10 text-gold-400" />
          <span className="font-display text-3xl font-bold">HotelOS</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold leading-tight">
            Premium Hotel<br />Management Platform
          </h2>
          <p className="mt-4 max-w-md text-brand-200">
            Enterprise-grade PMS for modern hospitality. Manage rooms, bookings, staff, and operations in one place.
          </p>
        </div>
        <p className="text-sm text-brand-300">Demo: admin / admin123</p>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Hotel className="mx-auto h-10 w-10 text-brand-600" />
            <h1 className="font-display text-2xl font-bold">HotelOS</h1>
          </div>
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-slate-500">Enter your credentials to access the dashboard</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <input
                className="input-field"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            No account? <Link to="/register" className="font-medium text-brand-600 hover:underline">Register</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
