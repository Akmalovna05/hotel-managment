import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { endpoints } from '../api/client'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import ListSection from '../components/ui/ListSection'
import EmptyState from '../components/ui/EmptyState'
import QueryErrorBanner from '../components/ui/QueryErrorBanner'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getApiErrorMessage } from '../utils/apiError'

export default function MaintenancePage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ room: '', title: '', description: '', priority: 'medium' })

  const { data, isFetching, isPending, isError, error, refetch } = useQuery({
    queryKey: ['maintenance', debouncedSearch],
    queryFn: async () => {
      const res = await endpoints.maintenance({ search: debouncedSearch || undefined })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms-maint'],
    queryFn: async () => {
      const res = await endpoints.rooms()
      return res.data.results || res.data
    },
    staleTime: 60000,
  })

  const createMutation = useMutation({
    mutationFn: () => endpoints.createMaintenance(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      setModal(false)
      toast.success('Request created')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to create request')),
  })

  const resolveMutation = useMutation({
    mutationFn: (id) => endpoints.resolveMaintenance(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      toast.success('Request resolved')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to resolve request')),
  })

  const isInitialLoad = isPending && data === undefined
  const list = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Maintenance</h1>
          <p className="text-slate-500">Repair requests and tracking</p>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="maintenance-search"
          value={search}
          onChange={setSearch}
          placeholder="Search title, room, description..."
          className="max-w-md"
        />
        {isFetching && !isInitialLoad && (
          <span className="text-xs text-slate-500">Updating...</span>
        )}
      </div>

      {isError && (
        <QueryErrorBanner message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      )}

      <ListSection isInitialLoad={isInitialLoad} isFetching={isFetching && !isInitialLoad}>
        {!list.length ? (
          <EmptyState title="No requests found" description="Submit a request or try another search" />
        ) : (
          <div className="space-y-4">
            {list.map((r) => (
              <div key={r.id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{r.title}</h3>
                    <Badge status={r.priority} />
                    <Badge status={r.status} />
                  </div>
                  <p className="text-sm text-slate-500">Room {r.room_number} · {r.assigned_name || 'Unassigned'}</p>
                  <p className="mt-1 text-sm">{r.description}</p>
                </div>
                {r.status !== 'resolved' && r.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate(r.id)}
                    disabled={resolveMutation.isPending}
                    className="btn-primary shrink-0"
                  >
                    <CheckCircle className="h-4 w-4" /> Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </ListSection>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Maintenance Request">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Room</label>
            <select className="input-field" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required>
              <option value="">Select room</option>
              {(rooms || []).map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Title</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Description</label>
            <textarea className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Priority</label>
            <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            Submit Request
          </button>
        </form>
      </Modal>
    </div>
  )
}
