import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { BedDouble, Users, DollarSign, Wrench, Sparkles, TrendingUp } from 'lucide-react'
import { endpoints } from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import SearchInput from '../components/ui/SearchInput'
import QueryErrorBanner from '../components/ui/QueryErrorBanner'
import StatCard from '../components/dashboard/StatCard'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatCurrency } from '../utils/helpers'
import { getApiErrorMessage } from '../utils/apiError'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

function ChartEmpty({ label }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  )
}

export default function DashboardPage() {
  const [activitySearch, setActivitySearch] = useState('')
  const debouncedActivitySearch = useDebouncedValue(activitySearch, 200)

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await endpoints.dashboard()).data,
    staleTime: 60000,
  })

  const bookingChart = useMemo(
    () =>
      Object.entries(data?.booking_stats || {}).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value: Number(value) || 0,
      })),
    [data?.booking_stats]
  )

  const monthlyRevenue = useMemo(
    () => (Array.isArray(data?.monthly_revenue) ? data.monthly_revenue : []),
    [data?.monthly_revenue]
  )

  const filteredActivities = useMemo(() => {
    const items = data?.recent_activities || []
    const q = debouncedActivitySearch.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (a) =>
        a.action?.toLowerCase().includes(q) ||
        a.entity_type?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.user_name?.toLowerCase().includes(q)
    )
  }, [data?.recent_activities, debouncedActivitySearch])

  const isInitialLoad = isPending && data === undefined
  const occupancy = data?.occupancy_rate ?? 0

  return (
    <div className={`space-y-6 transition-opacity ${isFetching && !isInitialLoad ? 'opacity-90' : ''}`}>
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500">Hotel operations overview</p>
      </div>

      {isError && (
        <QueryErrorBanner message={getApiErrorMessage(error)} onRetry={() => refetch()} />
      )}

      {isInitialLoad ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={TrendingUp} label="Occupancy Rate" value={`${occupancy}%`} sub={`${data?.occupied_rooms ?? 0}/${data?.total_rooms ?? 0} rooms`} color="bg-brand-600" />
            <StatCard icon={BedDouble} label="Available Rooms" value={data?.available_rooms ?? 0} color="bg-emerald-600" />
            <StatCard icon={Users} label="Active Guests" value={data?.active_guests ?? 0} color="bg-violet-600" />
            <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data?.total_revenue)} color="bg-gold-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Sparkles} label="Pending Housekeeping" value={data?.pending_housekeeping ?? 0} color="bg-blue-500" />
            <StatCard icon={Wrench} label="Open Maintenance" value={data?.open_maintenance ?? 0} color="bg-orange-500" />
            <StatCard icon={DollarSign} label="Pending Payments" value={data?.pending_payments ?? 0} color="bg-amber-500" />
            <StatCard icon={DollarSign} label="Refunded" value={formatCurrency(data?.refunded_total)} color="bg-purple-500" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="mb-4 font-semibold">Monthly Revenue</h3>
              {monthlyRevenue.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No revenue data yet" />
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="mb-4 font-semibold">Booking Status</h3>
              {bookingChart.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={bookingChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {bookingChart.map((entry, i) => (
                        <Cell key={`${entry.name}-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No booking statistics" />
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="mb-4 font-semibold">Bookings by Status</h3>
            {bookingChart.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bookingChart}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No booking data" />
            )}
          </div>
        </>
      )}

      <div className="glass-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Recent Activity</h3>
          <SearchInput
            id="dashboard-activity-search"
            value={activitySearch}
            onChange={setActivitySearch}
            placeholder="Search activity..."
            className="max-w-xs"
          />
        </div>
        <div className="space-y-3">
          {filteredActivities.map((a) => (
            <div
              key={a.id ?? `${a.created_at}-${a.action}-${a.entity_type}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
            >
              <div>
                <p className="text-sm font-medium capitalize">{a.action} — {a.entity_type}</p>
                <p className="text-xs text-slate-500">{a.description}</p>
              </div>
              <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!filteredActivities.length && (
            <p className="py-4 text-center text-sm text-slate-500">
              {isInitialLoad ? 'Loading activity…' : 'No matching activity'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
