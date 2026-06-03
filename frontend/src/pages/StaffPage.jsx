import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { endpoints } from '../api/client'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import ListSection from '../components/ui/ListSection'
import EmptyState from '../components/ui/EmptyState'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency, ROLES } from '../utils/helpers'
import { getApiErrorMessage } from '../utils/apiError'

export default function StaffPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ user_id: '', salary: '', shift: 'morning' })

  const { data, isFetching, isPending } = useQuery({
    queryKey: ['staff', debouncedSearch],
    queryFn: async () => {
      const res = await endpoints.staff({ search: debouncedSearch || undefined })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: users } = useQuery({
    queryKey: ['users-staff'],
    queryFn: async () => {
      const res = await endpoints.users()
      return res.data.results || res.data
    },
    staleTime: 60000,
  })

  const createMutation = useMutation({
    mutationFn: () => endpoints.createStaff(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      setModal(false)
      toast.success('Staff added')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to add staff')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => endpoints.deleteStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff removed')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to remove staff')),
  })

  const isInitialLoad = isPending && data === undefined
  const list = data ?? []
  const availableUsers = (users || []).filter((u) => !list.some((s) => s.user?.id === u.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff</h1>
          <p className="text-slate-500">Team management and roles</p>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="staff-search"
          value={search}
          onChange={setSearch}
          placeholder="Search staff by name or email..."
          className="max-w-md"
        />
        {isFetching && !isInitialLoad && (
          <span className="text-xs text-slate-500">Updating...</span>
        )}
      </div>

      <ListSection isInitialLoad={isInitialLoad} isFetching={isFetching && !isInitialLoad}>
        {!list.length ? (
          <EmptyState title="No staff found" description="Try a different search or add a team member" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <div key={s.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                      {s.user?.full_name?.[0] || 'S'}
                    </div>
                    <div>
                      <h3 className="font-semibold">{s.user?.full_name}</h3>
                      <p className="text-sm capitalize text-brand-600">{ROLES[s.user?.role] || s.user?.role}</p>
                      <p className="text-xs text-slate-500">{s.user?.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteMutation.mutate(s.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="capitalize text-slate-500">{s.shift} shift</span>
                  <span className="font-semibold">{formatCurrency(s.salary)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ListSection>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add Staff Member">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">User</label>
            <select className="input-field" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
              <option value="">Select user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Salary</label>
            <input type="number" className="input-field" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Shift</label>
            <select className="input-field" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
              {['morning', 'afternoon', 'night'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">Add Staff</button>
        </form>
      </Modal>
    </div>
  )
}
