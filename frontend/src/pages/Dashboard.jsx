import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import { fmtBs, fmtUsd, fmtDate } from '../utils/helpers'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/dashboard')
      setData(res.data)
    } catch {
      setData(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const hoy              = data?.hoy || {}
  const series           = data?.series || []
  const topPlatos        = data?.top_platos || []
  const ordenesActivas   = data?.ordenes_activas || 0
  const cuentasPend      = data?.cuentas_pendientes_usd || 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Dashboard</h1>
          <p className="text-sm text-muted">{fmtDate(hoy.fecha)}</p>
        </div>
        <span className={`badge ${hoy.cerrado ? 'badge-cerrado' : 'badge-abierto'}`}>
          {hoy.cerrado ? 'Caja Cerrada' : 'Caja Abierta'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--orange)' }}>
          <div className="stat-label">💰 Venta Hoy Bs</div>
          <div className="stat-value" style={{ color: 'var(--orange)' }}>{fmtBs(hoy.venta_bs)}</div>
          <div className="stat-sub">Tasa: {hoy.tasa_bcv > 0 ? `Bs.${Number(hoy.tasa_bcv).toFixed(2)}` : '—'}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-label">💵 Venta Hoy $</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmtUsd(hoy.venta_usd)}</div>
          <div className="stat-sub">{hoy.items_count} ítems vendidos</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--brown)' }}>
          <div className="stat-label">🪑 Órdenes activas</div>
          <div className="stat-value">{ordenesActivas}</div>
          <div className="stat-sub">en mesas</div>
        </div>
        <div className="stat-card" style={{ borderColor: cuentasPend > 0 ? 'var(--coral)' : 'var(--gray-200)' }}>
          <div className="stat-label">💳 Cuentas pendientes</div>
          <div className="stat-value" style={{ color: cuentasPend > 0 ? 'var(--coral)' : undefined }}>
            {fmtUsd(cuentasPend)}
          </div>
          <div className="stat-sub">por cobrar</div>
        </div>
      </div>

      {/* Gráfico de ventas 7 días */}
      {series.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">📈 Ventas últimos 7 días (Bs)</div>
          <div style={{ padding: '1rem 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series} margin={{ top: 0, right: 12, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#888' }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={v => [fmtBs(v), 'Venta Bs']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="total_bs" fill="#F39639" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top platos */}
      {topPlatos.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">🏆 Top platos (7 días)</div>
          {topPlatos.map((p, i) => (
            <div key={p.nombre} style={{
              display: 'flex', alignItems: 'center', gap: '.75rem',
              padding: '.65rem 1rem',
              borderBottom: i < topPlatos.length - 1 ? '1px solid var(--gray-100)' : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? ['#FFD700','#C0C0C0','#CD7F32'][i] : 'var(--gray-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '.78rem',
                color: i < 3 ? '#333' : 'var(--gray-500)',
              }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 600 }}>{p.nombre}</div>
              <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{p.cantidad} uds</div>
            </div>
          ))}
        </div>
      )}

      {!data && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <p>No hay datos de ventas aún.</p>
          </div>
        </div>
      )}
    </div>
  )
}
