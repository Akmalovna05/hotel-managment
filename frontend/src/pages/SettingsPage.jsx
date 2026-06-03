import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { authApi } from '../api/client'
import { updateUser } from '../store/authSlice'
import { toggleTheme } from '../store/themeSlice'

export default function SettingsPage() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const { mode } = useSelector((s) => s.theme)
  const [profile, setProfile] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', new_password_confirm: '' })
  const [saving, setSaving] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(profile).forEach(([k, v]) => fd.append(k, v))
      const { data } = await authApi.updateProfile(fd)
      dispatch(updateUser(data))
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    try {
      await authApi.changePassword(passwords)
      toast.success('Password changed')
      setPasswords({ old_password: '', new_password: '', new_password_confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.old_password?.[0] || 'Failed to change password')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-slate-500">Profile and account preferences</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <span>Theme: {mode === 'dark' ? 'Dark' : 'Light'}</span>
          <button onClick={() => dispatch(toggleTheme())} className="btn-secondary">
            Switch to {mode === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm">First name</label><input className="input-field" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm">Last name</label><input className="input-field" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} /></div>
          </div>
          <div><label className="mb-1 block text-sm">Email</label><input type="email" className="input-field" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
          <div><label className="mb-1 block text-sm">Phone</label><input className="input-field" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
          <p className="text-sm text-slate-500">Role: <span className="capitalize font-medium">{user?.role}</span></p>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Profile'}</button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-semibold">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div><label className="mb-1 block text-sm">Current password</label><input type="password" className="input-field" value={passwords.old_password} onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })} required /></div>
          <div><label className="mb-1 block text-sm">New password</label><input type="password" className="input-field" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} required /></div>
          <div><label className="mb-1 block text-sm">Confirm new password</label><input type="password" className="input-field" value={passwords.new_password_confirm} onChange={(e) => setPasswords({ ...passwords, new_password_confirm: e.target.value })} required /></div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  )
}
