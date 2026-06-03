import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { endpoints } from '../api/client'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import ListSection from '../components/ui/ListSection'
import EmptyState from '../components/ui/EmptyState'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency, formatDate } from '../utils/helpers'
import QueryErrorBanner from '../components/ui/QueryErrorBanner'
import { getApiErrorMessage } from '../utils/apiError'

const empty = { first_name: '', last_name: '', email: '', phone: '', nationality: '', id_document: '', address: '', notes: '' }

export default function GuestsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [historyGuest, setHistoryGuest] = useState(null)

  const { data, isFetching, isPending, isError, error, refetch } = useQuery({
    queryKey: ['guests', debouncedSearch],
    queryFn: async () => {
      const res = await endpoints.guests({ search: debouncedSearch || undefined })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: guestHistory } = useQuery({
    queryKey: ['guest-billing', historyGuest],
    queryFn: async () => (await endpoints.guestInvoices(historyGuest)).data,
    enabled: !!historyGuest,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (modal === 'edit') return endpoints.updateGuest(form.id, fd)
      return endpoints.createGuest(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      setModal(null)
      toast.success('Guest saved')
    },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => endpoints.deleteGuest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] })
      toast.success('Guest removed')
    },
  })

  const isInitialLoad = isPending && data === undefined
  const list = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Guests</h1>
          <p className="text-slate-500">Customer profiles and history</p>
        </div>
        <button type="button" onClick={() => { setForm(empty); setModal('create') }} className="btn-primary">
          <Plus className="h-4 w-4" /> Add Guest
        </button>
      </div>

      <div className="flex max-w-md flex-wrap items-center gap-2">
        <SearchInput
          id="guests-search"
          value={search}
          onChange={setSearch}
          placeholder="Search guests..."
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
          <EmptyState title="No guests found" description="Try a different search or register a new guest" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((g) => (
              <div key={g.id} className="glass-card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-900">
                    {g.first_name?.[0]}{g.last_name?.[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{g.full_name || `${g.first_name} ${g.last_name}`}</h3>
                    <p className="text-sm text-slate-500">{g.email}</p>
                    <p className="text-sm text-slate-500">{g.phone}</p>
                    <p className="mt-1 text-xs text-slate-400">{g.nationality} · {g.bookings_count || 0} bookings</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setHistoryGuest(g.id)} className="btn-secondary flex-1 text-xs">
                    <History className="h-3 w-3" /> History
                  </button>
                  <button type="button" onClick={() => { setForm(g); setModal('edit') }} className="btn-secondary text-xs">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(g.id)} className="btn-secondary text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ListSection>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Guest' : 'Add Guest'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-4 sm:grid-cols-2">
          {Object.keys(empty).map((f) => (
            <div key={f} className={f === 'address' || f === 'notes' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 block text-sm capitalize">{f.replace(/_/g, ' ')}</label>
              {f === 'notes' || f === 'address' ? (
                <textarea className="input-field" rows={2} value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              ) : (
                <input className="input-field" value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={['first_name', 'last_name', 'phone'].includes(f)} />
              )}
            </div>
          ))}
          <button type="submit" className="btn-primary sm:col-span-2">Save Guest</button>
        </form>
      </Modal>

      <Modal isOpen={!!historyGuest} onClose={() => setHistoryGuest(null)} title="Billing History" size="lg">
        <h4 className="mb-2 text-sm font-semibold">Invoices</h4>
        <div className="mb-4 space-y-2">
          {(guestHistory?.invoices || []).map((inv) => (
            <div key={inv.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-medium">{inv.invoice_number} · {formatCurrency(inv.total)}</p>
              <p className="text-sm capitalize text-slate-500">{inv.status}</p>
            </div>
          ))}
          {!guestHistory?.invoices?.length && <p className="text-sm text-slate-500">No invoices</p>}
        </div>
        <h4 className="mb-2 text-sm font-semibold">Payments</h4>
        <div className="space-y-2">
          {(guestHistory?.payments || []).map((p) => (
            <div key={p.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="font-medium">{formatCurrency(p.amount)} · {p.payment_method}</p>
              <p className="text-sm capitalize text-slate-500">{p.payment_status}</p>
            </div>
          ))}
          {!guestHistory?.payments?.length && <p className="text-sm text-slate-500">No payments</p>}
        </div>
      </Modal>
    </div>
  )
}
