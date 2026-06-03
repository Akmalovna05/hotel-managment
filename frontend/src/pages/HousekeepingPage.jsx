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

export default function HousekeepingPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ room: '', assigned_to: '', notes: '' })

  const { data, isFetching, isPending, isError, error, refetch } = useQuery({
    queryKey: ['housekeeping', debouncedSearch],
    queryFn: async () => {
      const res = await endpoints.housekeeping({ search: debouncedSearch || undefined })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms-hk'],
    queryFn: async () => {
      const res = await endpoints.rooms()
      return res.data.results || res.data
    },
    staleTime: 60000,
  })

  const createMutation = useMutation({
    mutationFn: () => endpoints.createHousekeeping(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] })
      setModal(false)
      toast.success('Task created')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to create task')),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => endpoints.completeHousekeeping(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] })
      toast.success('Task completed')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to complete task')),
  })

  const isInitialLoad = isPending && data === undefined
  const list = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Housekeeping</h1>
          <p className="text-slate-500">Cleaning tasks and room status</p>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="housekeeping-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by room or notes..."
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
          <EmptyState title="No tasks found" description="Create a task or adjust your search" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <div key={t.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">Room {t.room_number}</h3>
                    <p className="text-sm text-slate-500">{t.assigned_name || 'Unassigned'}</p>
                  </div>
                  <Badge status={t.status} />
                </div>
                {t.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t.notes}</p>}
                {t.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => completeMutation.mutate(t.id)}
                    disabled={completeMutation.isPending}
                    className="btn-primary mt-4 w-full text-xs"
                  >
                    <CheckCircle className="h-4 w-4" /> Mark Complete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </ListSection>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Cleaning Task">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Room</label>
            <select className="input-field" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required>
              <option value="">Select room</option>
              {(rooms || []).map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Notes</label>
            <textarea className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            Create Task
          </button>
        </form>
      </Modal>
    </div>
  )
}
