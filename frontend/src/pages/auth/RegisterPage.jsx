import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { authApi } from '../../api/client'

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '', email: '', password: '', password_confirm: '',
    first_name: '', last_name: '', phone: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'object' ? Object.values(msg).flat().join(' ') : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg glass-card p-8">
        <h2 className="font-display text-2xl font-bold">Create account</h2>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          {['first_name', 'last_name', 'username', 'email', 'phone', 'password', 'password_confirm'].map((field) => (
            <div key={field} className={field.includes('password') ? '' : ''}>
              <label className="mb-1 block text-sm font-medium capitalize">{field.replace(/_/g, ' ')}</label>
              <input
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                className="input-field"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={!['phone'].includes(field)}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary sm:col-span-2">
            {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Have an account? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
