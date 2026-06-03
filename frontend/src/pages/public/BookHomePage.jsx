import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { motion } from 'framer-motion'
import { Search, Users, Wifi } from 'lucide-react'
import { publicBookingApi } from '../../api/public'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatCurrency } from '../../utils/helpers'

export default function BookHomePage() {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)
  const debouncedCheckIn = useDebouncedValue(checkIn, 400)
  const debouncedCheckOut = useDebouncedValue(checkOut, 400)

  const { data: rooms, isLoading, isFetching } = useQuery({
    queryKey: ['public-rooms', debouncedCheckIn, debouncedCheckOut],
    queryFn: async () => {
      const res = await publicBookingApi.rooms({
        check_in: debouncedCheckIn || undefined,
        check_out: debouncedCheckOut || undefined,
      })
      return res.data
    },
    placeholderData: keepPreviousData,
  })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 px-4 py-20 text-white">
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold md:text-5xl"
          >
            Book your perfect stay
          </motion.h1>
          <p className="mt-4 text-lg text-brand-100">
            Premium rooms · Instant confirmation · Secure card payment
          </p>
          <div className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-800">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="text-left">
                <label className="mb-1 block text-xs font-medium text-slate-500">Check-in</label>
                <input type="date" min={today} className="input-field text-slate-900" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="text-left">
                <label className="mb-1 block text-xs font-medium text-slate-500">Check-out</label>
                <input type="date" min={checkIn || today} className="input-field text-slate-900" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <div className="text-left">
                <label className="mb-1 block text-xs font-medium text-slate-500">Guests</label>
                <input type="number" min="1" max="10" className="input-field text-slate-900" value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
              <div className="flex items-end">
                <button type="button" className="btn-primary w-full" onClick={() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Search className="h-4 w-4" /> Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 font-display text-2xl font-bold">
          Available rooms
          {isFetching && !isLoading && (
            <span className="ml-2 text-sm font-normal text-slate-500">Updating…</span>
          )}
        </h2>
        {isLoading && !rooms ? (
          <LoadingSpinner />
        ) : !rooms?.length ? (
          <p className="text-center text-slate-500">No rooms available for selected dates. Try different dates.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden"
              >
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800">
                  <span className="font-display text-5xl font-bold text-brand-600/40">{room.room_number}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold">{room.room_type}</h3>
                  <p className="text-sm text-slate-500">Room {room.room_number} · Floor {room.floor}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.capacity}</span>
                    {room.amenities?.length > 0 && <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> WiFi</span>}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-brand-600">
                    {formatCurrency(room.price)}
                    <span className="text-sm font-normal text-slate-500">/night</span>
                  </p>
                  <Link
                    to={`/book/${room.id}`}
                    state={{ checkIn, checkOut, guests }}
                    className="btn-primary mt-4 block w-full text-center"
                  >
                    Reserve
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
