import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, LogIn, LogOut, XCircle, FileText, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { endpoints } from '../api/client'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import ListSection from '../components/ui/ListSection'
import EmptyState from '../components/ui/EmptyState'
import PaymentCheckoutModal from '../components/payments/PaymentCheckoutModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency, formatDate } from '../utils/helpers'
import { getApiErrorMessage } from '../utils/apiError'

export default function BookingsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [modal, setModal] = useState(false)
  const [payBooking, setPayBooking] = useState(null)
  const [form, setForm] = useState({
    guest: '', room: '', check_in: '', check_out: '', guests_count: 1, special_requests: '',
  })

  const { data: bookings, isFetching, isPending } = useQuery({
    queryKey: ['bookings', debouncedSearch],
    queryFn: async () => {
      const res = await endpoints.bookings({ search: debouncedSearch || undefined })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: guests } = useQuery({
    queryKey: ['guests-list'],
    queryFn: async () => {
      const res = await endpoints.guests()
      return res.data.results || res.data
    },
    staleTime: 60000,
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms-list'],
    queryFn: async () => {
      const res = await endpoints.rooms({ status: 'available' })
      return res.data.results || res.data
    },
    staleTime: 60000,
  })

  const createMutation = useMutation({
    mutationFn: () => endpoints.createBooking(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      setModal(false)
      toast.success('Booking created')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create booking'),
  })

  const checkInMutation = useMutation({
    mutationFn: (id) => endpoints.checkIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Checked in')
    },
    onError: () => toast.error('Action failed'),
  })

  const checkOutMutation = useMutation({
    mutationFn: (id) => endpoints.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Checked out')
    },
    onError: () => toast.error('Action failed'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => endpoints.cancelBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Booking cancelled')
    },
    onError: () => toast.error('Action failed'),
  })

  const downloadInvoice = async (id) => {
    try {
      const res = await endpoints.bookingInvoice(id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${id}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not download invoice'))
    }
  }

  const isInitialLoad = isPending && bookings === undefined
  const list = bookings ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Bookings</h1>
          <p className="text-slate-500">Reservations and check-in/out</p>
        </div>
        <button type="button" onClick={() => setModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Booking
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          id="bookings-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by guest or room..."
          className="max-w-md"
        />
        {isFetching && !isInitialLoad && (
          <span className="text-xs text-slate-500">Updating...</span>
        )}
      </div>

      <ListSection isInitialLoad={isInitialLoad} isFetching={isFetching && !isInitialLoad}>
        {!list.length ? (
          <EmptyState title="No bookings found" description="Try a different search or create a booking" />
        ) : (
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="p-4">Guest</th>
                  <th className="p-4">Room</th>
                  <th className="p-4">Dates</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-4 font-medium">{b.guest_name}</td>
                    <td className="p-4">{b.room_number} ({b.room_type})</td>
                    <td className="p-4">{formatDate(b.check_in)} — {formatDate(b.check_out)}</td>
                    <td className="p-4">{formatCurrency(b.total_amount)}</td>
                    <td className="p-4"><Badge status={b.status} /></td>
                    <td className="p-4"><Badge status={b.payment_status} /></td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {b.status === 'confirmed' && (
                          <button type="button" onClick={() => checkInMutation.mutate(b.id)} className="rounded-lg p-1.5 hover:bg-emerald-50" title="Check in">
                            <LogIn className="h-4 w-4 text-emerald-600" />
                          </button>
                        )}
                        {b.status === 'checked_in' && (
                          <button type="button" onClick={() => checkOutMutation.mutate(b.id)} className="rounded-lg p-1.5 hover:bg-blue-50" title="Check out">
                            <LogOut className="h-4 w-4 text-blue-600" />
                          </button>
                        )}
                        {!['checked_out', 'cancelled'].includes(b.status) && (
                          <button type="button" onClick={() => cancelMutation.mutate(b.id)} className="rounded-lg p-1.5 hover:bg-red-50" title="Cancel">
                            <XCircle className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                        <button type="button" onClick={() => downloadInvoice(b.id)} className="rounded-lg p-1.5 hover:bg-slate-100" title="Invoice">
                          <FileText className="h-4 w-4" />
                        </button>
                        {b.payment_status !== 'paid' && b.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => setPayBooking(b)}
                            className="rounded-lg p-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                            title="Pay with Visa"
                          >
                            <CreditCard className="h-4 w-4 text-brand-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ListSection>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="New Booking">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Guest</label>
            <select className="input-field" value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })} required>
              <option value="">Select guest</option>
              {(guests || []).map((g) => (
                <option key={g.id} value={g.id}>{g.full_name || `${g.first_name} ${g.last_name}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Room</label>
            <select className="input-field" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required>
              <option value="">Select room</option>
              {(rooms || []).map((r) => (
                <option key={r.id} value={r.id}>Room {r.room_number} - {formatCurrency(r.price)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm">Check-in</label>
              <input type="date" className="input-field" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">Check-out</label>
              <input type="date" className="input-field" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Guests count</label>
            <input type="number" min="1" className="input-field" value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Special requests</label>
            <textarea className="input-field" value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">Create Booking</button>
        </form>
      </Modal>

      <PaymentCheckoutModal
        isOpen={!!payBooking}
        onClose={() => {
          setPayBooking(null)
          qc.invalidateQueries({ queryKey: ['bookings'] })
        }}
        booking={payBooking}
      />
    </div>
  )
}
