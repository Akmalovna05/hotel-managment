import { useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { publicBookingApi } from '../../api/public'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/helpers'

export default function RoomBookPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}

  const [checkIn, setCheckIn] = useState(state.checkIn || '')
  const [checkOut, setCheckOut] = useState(state.checkOut || '')
  const [guestsCount, setGuestsCount] = useState(state.guests || 2)
  const [guest, setGuest] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
  })
  const [requests, setRequests] = useState('')

  const { data: room, isLoading } = useQuery({
    queryKey: ['public-room', roomId],
    queryFn: async () => (await publicBookingApi.room(roomId)).data,
  })

  const bookMutation = useMutation({
    mutationFn: () =>
      publicBookingApi.createBooking({
        room_id: Number(roomId),
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guestsCount,
        special_requests: requests,
        guest,
      }),
    onSuccess: (res) => {
      toast.success('Booking created — proceed to payment')
      navigate(`/checkout/${res.data.checkout_reference}`)
    },
    onError: (err) => {
      const d = err.response?.data
      toast.error(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Booking failed')
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const nights =
    checkIn && checkOut
      ? Math.max(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24),
          1
        )
      : 0
  const subtotal = room ? Number(room.price) * nights : 0
  const serviceFee = subtotal * 0.05
  const tax = (subtotal + serviceFee) * 0.1
  const total = subtotal + serviceFee + tax

  const roomLoading = isLoading && !room

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/book" className="mb-6 inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to rooms
      </Link>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <h1 className="font-display text-2xl font-bold">Guest details</h1>
          <div className="glass-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">First name</label>
                <input className="input-field" value={guest.first_name} onChange={(e) => setGuest({ ...guest, first_name: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-sm">Last name</label>
                <input className="input-field" value={guest.last_name} onChange={(e) => setGuest({ ...guest, last_name: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <input type="email" className="input-field" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">Phone</label>
              <input className="input-field" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Check-in</label>
                <input type="date" min={today} className="input-field" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm">Check-out</label>
                <input type="date" min={checkIn || today} className="input-field" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm">Guests</label>
              <input type="number" min="1" max={room?.capacity || 10} className="input-field" value={guestsCount} onChange={(e) => setGuestsCount(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Special requests</label>
              <textarea className="input-field" rows={3} value={requests} onChange={(e) => setRequests(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="glass-card sticky top-24 p-6">
            <h2 className="font-semibold">Booking summary</h2>
            {roomLoading ? (
              <div className="mt-4 h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ) : (
            <>
            <p className="mt-1 text-slate-500">Room {room?.room_number} · {room?.room_type}</p>
            <p className="text-sm text-slate-500">{nights} night{nights !== 1 ? 's' : ''}</p>
            <div className="mt-4 space-y-2 border-t pt-4 text-sm dark:border-slate-700">
              <div className="flex justify-between"><span>Room subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Service fee (5%)</span><span>{formatCurrency(serviceFee)}</span></div>
              <div className="flex justify-between"><span>Taxes (10%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold dark:border-slate-700">
                <span>Total</span><span className="text-brand-600">{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={bookMutation.isPending || roomLoading || !checkIn || !checkOut || !room}
              onClick={() => bookMutation.mutate()}
              className="btn-primary mt-6 w-full py-3"
            >
              {bookMutation.isPending ? 'Creating booking…' : 'Continue to payment'}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              You won&apos;t be charged until payment is confirmed
            </p>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
