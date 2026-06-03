import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../../api/client'
import { getApiErrorMessage } from '../../utils/apiError'

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ uid: '', token: '', new_password: '', new_password_confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.resetPassword(form)
      toast.success('Password reset successfully')
      navigate('/login')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reset failed. Check UID and token.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-8">
        <h2 className="text-2xl font-bold">Reset password</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {['uid', 'token', 'new_password', 'new_password_confirm'].map((f) => (
            <div key={f}>
              <label className="mb-1 block text-sm capitalize">{f.replace(/_/g, ' ')}</label>
              <input
                type={f.includes('password') ? 'password' : 'text'}
                className="input-field"
                value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                required
              />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary w-full">Reset password</button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
