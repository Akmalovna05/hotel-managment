import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { CreditCard, Download, RefreshCw, FileText, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentsApi } from '../../api/payments'
import { endpoints } from '../../api/client'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import PaymentCheckoutModal from '../../components/payments/PaymentCheckoutModal'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { getApiErrorMessage } from '../../utils/apiError'
import { useSelector } from 'react-redux'

export default function PaymentsDashboard() {
  const { user } = useSelector((s) => s.auth)
  const qc = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [payBooking, setPayBooking] = useState(null)

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['payment-analytics'],
    queryFn: async () => (await paymentsApi.analytics()).data,
  })

  const { data: payments } = useQuery({
    queryKey: ['payments', 'records'],
    queryFn: async () => {
      const res = await paymentsApi.records()
      return res.data.results || res.data
    },
  })

  const { data: invoices } = useQuery({
    queryKey: ['payments', 'invoices'],
    queryFn: async () => {
      const res = await paymentsApi.invoices()
      return res.data.results || res.data
    },
  })

  const { data: transactions } = useQuery({
    queryKey: ['payments', 'transactions'],
    queryFn: async () => {
      const res = await paymentsApi.transactions()
      return res.data.results || res.data
    },
    enabled: tab === 'transactions',
  })

  const { data: bookings } = useQuery({
    queryKey: ['bookings-pay'],
    queryFn: async () => {
      const res = await endpoints.bookings()
      return res.data.results || res.data
    },
  })

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }) => paymentsApi.refund(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      toast.success('Payment refunded')
    },
    onError: () => toast.error('Refund failed'),
  })

  const unpaid = (bookings || []).filter((b) => b.payment_status !== 'paid' && b.status !== 'cancelled')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Payment History' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing & Payments</h1>
          <p className="text-slate-500">Revenue, invoices, and transaction management</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingAnalytics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))
        ) : (
          [
            { label: 'Total Revenue', value: formatCurrency(analytics?.total_revenue), color: 'text-emerald-600' },
            { label: 'Pending', value: analytics?.pending_payments ?? 0, color: 'text-amber-600' },
            { label: 'Failed', value: analytics?.failed_payments ?? 0, color: 'text-red-600' },
            { label: 'Refunded', value: formatCurrency(analytics?.refunded_total), color: 'text-purple-600' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-5">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))
        )}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h3 className="mb-4 font-semibold">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics?.monthly_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fill="#0ea5e920" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-6">
            <h3 className="mb-4 font-semibold">Revenue by Method</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics?.revenue_by_method || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="payment_method" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {unpaid.length > 0 && tab === 'overview' && (
        <div className="glass-card p-5">
          <h3 className="mb-3 font-semibold">Outstanding balances</h3>
          <div className="space-y-2">
            {unpaid.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div>
                  <p className="font-medium">#{b.id} {b.guest_name}</p>
                  <p className="text-sm text-slate-500">Due {formatCurrency(b.balance_due)}</p>
                </div>
                <button type="button" onClick={() => setPayBooking(b)} className="btn-primary text-sm">
                  <CreditCard className="h-4 w-4" /> Pay
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Guest</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Method</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Date</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-mono text-xs">{p.transaction_id?.slice(0, 12) || p.id}</td>
                  <td className="p-4">{p.guest_name}</td>
                  <td className="p-4 font-semibold">{formatCurrency(p.amount)}</td>
                  <td className="p-4 capitalize">{p.payment_method?.replace(/_/g, ' ')}</td>
                  <td className="p-4"><Badge status={p.payment_status} /></td>
                  <td className="p-4">{formatDate(p.paid_at || p.created_at)}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {p.payment_status === 'paid' && (
                        <button type="button" onClick={async () => {
                          try {
                            const res = await paymentsApi.receipt(p.id)
                            const url = URL.createObjectURL(res.data)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `receipt-${p.id}.html`
                            a.click()
                            URL.revokeObjectURL(url)
                          } catch (err) {
                            toast.error(getApiErrorMessage(err, 'Could not download receipt'))
                          }
                        }} className="rounded-lg p-1.5 hover:bg-slate-100" title="Receipt"><Download className="h-4 w-4" /></button>
                      )}
                      {p.payment_status === 'paid' && user?.role === 'admin' && (
                        <button type="button" onClick={() => refundMutation.mutate({ id: p.id, reason: 'Admin refund' })} className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50" title="Refund"><RotateCcw className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(invoices || []).map((inv) => (
            <Link key={inv.id} to={`/payments/invoices/${inv.id}`} className="glass-card block p-5 transition hover:shadow-lg">
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-brand-600" />
                <Badge status={inv.status} />
              </div>
              <p className="mt-3 font-mono text-sm font-semibold">{inv.invoice_number}</p>
              <p className="text-sm text-slate-500">{inv.guest_name}</p>
              <p className="mt-2 text-lg font-bold">{formatCurrency(inv.total)}</p>
              <p className="text-xs text-slate-400">{formatDate(inv.issued_at)}</p>
            </Link>
          ))}
          {!invoices?.length && <p className="text-slate-500">No invoices yet. Pay a booking to generate one.</p>}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="p-4 text-left">Reference</th>
                <th className="p-4 text-left">Type</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Description</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {(transactions || []).map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-4 font-mono text-xs">{t.reference}</td>
                  <td className="p-4 capitalize">{t.transaction_type}</td>
                  <td className="p-4">{formatCurrency(t.amount)}</td>
                  <td className="p-4"><Badge status={t.status} /></td>
                  <td className="p-4 max-w-xs truncate">{t.description}</td>
                  <td className="p-4">{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaymentCheckoutModal
        isOpen={!!payBooking}
        onClose={() => { setPayBooking(null); qc.invalidateQueries({ queryKey: ['payments'] }) }}
        booking={payBooking}
      />
    </div>
  )
}
