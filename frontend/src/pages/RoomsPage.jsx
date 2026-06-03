import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { endpoints } from '../api/client'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import SearchInput from '../components/ui/SearchInput'
import ListSection from '../components/ui/ListSection'
import EmptyState from '../components/ui/EmptyState'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency, canManage } from '../utils/helpers'
import { useSelector } from 'react-redux'

const emptyRoom = { room_number: '', room_type: 'Standard', price: '', floor: 1, capacity: 2, status: 'available', amenities: '', description: '' }

export default function RoomsPage() {
  const { user } = useSelector((s) => s.auth)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [statusFilter, setStatusFilter] = useState('')
  const debouncedStatus = useDebouncedValue(statusFilter, 300)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyRoom)
  const [showCalendar, setShowCalendar] = useState(false)

  const { data, isLoading, isFetching, isPending } = useQuery({
    queryKey: ['rooms', debouncedSearch, debouncedStatus],
    queryFn: async () => {
      const res = await endpoints.rooms({
        search: debouncedSearch || undefined,
        status: debouncedStatus || undefined,
      })
      return res.data.results || res.data
    },
    placeholderData: keepPreviousData,
  })

  const { data: availability } = useQuery({
    queryKey: ['room-availability'],
    queryFn: async () => (await endpoints.roomAvailability({})).data,
    enabled: showCalendar,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'amenities') fd.append(k, JSON.stringify(String(v).split(',').map((s) => s.trim()).filter(Boolean)))
        else if (k === 'image' && v instanceof File) fd.append(k, v)
        else if (v !== '' && v != null) fd.append(k, v)
      })
      if (modal === 'edit') return endpoints.updateRoom(form.id, fd)
      return endpoints.createRoom(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      setModal(null)
      toast.success(modal === 'edit' ? 'Room updated' : 'Room created')
    },
    onError: () => toast.error('Failed to save room'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => endpoints.deleteRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const openEdit = (room) => {
    setForm({ ...room, amenities: (room.amenities || []).join(', '), image: null })
    setModal('edit')
  }

  const isInitialLoad = isPending && data === undefined
  const list = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Rooms</h1>
          <p className="text-slate-500">Manage hotel rooms and availability</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="btn-secondary">
            <Calendar className="h-4 w-4" /> Calendar
          </button>
          {canManage(user?.role) && (
            <button type="button" onClick={() => { setForm(emptyRoom); setModal('create') }} className="btn-primary">
              <Plus className="h-4 w-4" /> Add Room
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          id="rooms-search"
          value={search}
          onChange={setSearch}
          placeholder="Search rooms..."
        />
        <select
          className="input-field w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {['available', 'occupied', 'reserved', 'cleaning', 'maintenance'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {isFetching && !isInitialLoad && (
          <span className="self-center text-xs text-slate-500">Updating...</span>
        )}
      </div>

      {showCalendar && availability && (
        <div className="glass-card overflow-x-auto p-4">
          <h3 className="mb-3 font-semibold">Availability Calendar (next 30 days)</h3>
          <div className="flex min-w-max gap-2">
            {(availability.calendar || []).slice(0, 14).map((day) => (
              <div key={day.date} className="w-24 shrink-0 rounded-lg border p-2 text-center text-xs dark:border-slate-700">
                <p className="font-medium">{day.date.slice(5)}</p>
                <p className="text-brand-600">{day.bookings.length} booked</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ListSection isInitialLoad={isInitialLoad} isFetching={isFetching && !isInitialLoad}>
        {!list.length ? (
          <EmptyState title="No rooms found" description="Try a different search or add a new room" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((room) => (
              <div key={room.id} className="glass-card overflow-hidden">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800">
                  <span className="font-display text-4xl font-bold text-brand-600/50">{room.room_number}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">Room {room.room_number}</h3>
                      <p className="text-sm text-slate-500">{room.room_type} · Floor {room.floor}</p>
                    </div>
                    <Badge status={room.status} />
                  </div>
                  <p className="mt-2 text-lg font-bold text-brand-600">
                    {formatCurrency(room.price)}
                    <span className="text-sm font-normal text-slate-500">/night</span>
                  </p>
                  <p className="text-xs text-slate-500">Capacity: {room.capacity}</p>
                  {canManage(user?.role) && (
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={() => openEdit(room)} className="btn-secondary flex-1 text-xs">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button type="button" onClick={() => deleteMutation.mutate(room.id)} className="btn-secondary text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ListSection>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit Room' : 'Add Room'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="grid gap-4 sm:grid-cols-2">
          {['room_number', 'room_type', 'price', 'floor', 'capacity', 'status'].map((f) => (
            <div key={f}>
              <label className="mb-1 block text-sm capitalize">{f.replace(/_/g, ' ')}</label>
              {f === 'status' ? (
                <select className="input-field" value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })}>
                  {['available', 'occupied', 'reserved', 'cleaning', 'maintenance'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input className="input-field" type={['price', 'floor', 'capacity'].includes(f) ? 'number' : 'text'} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Amenities (comma-separated)</label>
            <input className="input-field" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm">Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="btn-primary sm:col-span-2">Save Room</button>
        </form>
      </Modal>
    </div>
  )
}
