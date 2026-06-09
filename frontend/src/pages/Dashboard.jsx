import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import { fmtBs, fmtUsd } from '../utils/helpers'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [topDishes, setTopDishes] = useState([])
  const [loading, setLoading] = useState(true)

  const EMPTY_SUMMARY = {
    today: {
      date: new Date().toISOString().split('T')[0],
      total_bs: 0, total_usd: 0, total_cost: 0,
      total_items: 0, avg_ticket_bs: 0, margin_pct: 0,
      register_status: 'sin_registro', exchange_rate: 0,
    },
    pending_accounts: [],
    pending_amount_bs: 0,
  }

  const load = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/top-dishes')
      ])
      setSummary(sRes.data)
      setTopDishes(dRes.data.dishes || [])
    } catch {
      setSummary(EMPTY_SUMMARY)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const { today, pending_accounts, pending_amount_bs } = summary

  const statusColor = {
    abierto:     'var(--success)',
    cerrado:     'var(--gray-500)',
    sin_registro:'var(--warning)',
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Dashboard</h1>
          <p className="text-sm text-muted">{today.date}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[today.register_status] }} />
          <span className="text-sm fw-600" style={{ color: statusColor[today.register_status] }}>
            Caja {today.register_status === 'sin_registro' ? 'sin abrir' : today.register_status}
          </span>
        </div>
      </div>

      {/* KPIs del día */}
      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--orange)' }}>
          <div className="stat-label">💰 Venta Total Bs</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{fmtBs(today.total_bs)}</div>
          <div className="stat-sub">Tasa: {today.exchange_rate > 0 ? `Bs.${Number(today.exchange_rate).toFixed(2)}` : 'No configurada'}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-label">💵 Venta Total $</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmtUsd(today.total_usd)}</div>
          <div className="stat-sub">{today.total_items} ítems vendidos</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--brown)' }}>
          <div className="stat-label">🎫 Ticket Promedio</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmtBs(today.avg_ticket_bs)}</div>
          <div className="stat-sub">por ítem</div>
        </div>
        <div className="stat-card" style={{ borderColor: today.margin_pct >= 50 ? 'var(--success)' : today.margin_pct >= 30 ? 'var(--warning)' : 'var(--coral)' }}>
          <div className="stat-label">📈 Margen</div>
          <div className="stat-value" style={{
            color: today.margin_pct >= 50 ? 'var(--success)' : today.margin_pct >= 30 ? 'var(--warning)' : 'var(--coral)'
          }}>
            {today.margin_pct.toFixed(1)}%
          </div>
          <div className="stat-sub">Costo: {fmtBs(today.total_cost)}</div>
        </div>
      </div>

      {/* Alertas */}
      {pending_accounts?.length > 0 && (
        <div className="alert alert-warning mb-4">
          <strong>💳 Cuentas por cobrar pendientes:</strong> {pending_accounts.length} clientes · {fmtBs(pending_amount_bs)} total
        </div>
      )}

      {/* Top platos */}
      {topDishes.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <span>🏆 Platos más vendidos (7 días)</span>
          </div>
          <div className="card-body" style={{ padding: '1rem 0' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topDishes.slice(0, 6)}
                margin={{ top: 0, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#888' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val, name) => [val + ' unidades', 'Vendidos']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="quantity" fill="#F39639" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top list */}
      {topDishes.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">🥇 Ranking de ventas</div>
          <div>
            {topDishes.slice(0, 8).map((dish, i) => (
              <div key={dish.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.75rem',
                padding: '.75rem 1rem',
                borderBottom: i < topDishes.slice(0, 8).length - 1 ? '1px solid var(--gray-100)' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28,
                  background: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : 'var(--gray-100)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '.8rem',
                  color: i < 3 ? 'var(--dark)' : 'var(--gray-500)',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{dish.name}</div>
                  <div className="text-xs text-muted">{dish.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{dish.quantity} uds</div>
                  <div className="text-xs" style={{ color: 'var(--orange)' }}>{fmtBs(dish.revenue_bs)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topDishes.length === 0 && today.total_bs === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <p>No hay datos de ventas aún.</p>
            <p className="text-sm text-muted mt-2">Registra ventas en la Caja del Día para ver estadísticas.</p>
          </div>
        </div>
      )}
    </div>
  )
}
