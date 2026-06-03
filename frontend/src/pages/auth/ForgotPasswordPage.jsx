import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [resetInfo, setResetInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.forgotPassword({ email })
      setResetInfo(data)
      toast.success('Reset link generated (dev mode shows token below)')
    } catch (err) {
      toast.error(err.response?.data?.email?.[0] || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-8">
        <h2 className="text-2xl font-bold">Forgot password</h2>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            className="input-field"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        {resetInfo?.reset_uid && (
          <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800">
            <p>Dev reset — use at <Link to="/reset-password" className="text-brand-600">/reset-password</Link>:</p>
            <p className="mt-1 break-all">UID: {resetInfo.reset_uid}</p>
            <p className="break-all">Token: {resetInfo.reset_token}</p>
          </div>
        )}
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
