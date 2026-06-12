import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { ITEM_STATUS_LABELS } from '../utils/helpers'

const ALERT_MINUTES = 10

function OrderTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!createdAt) return
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [createdAt])
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const isAlert = minutes >= ALERT_MINUTES
  return (
    <span style={{
      fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1rem',
      color: isAlert ? 'var(--coral)' : elapsed > 480 ? 'var(--warning)' : 'var(--success)',
    }}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

const ITEM_STATUS_FLOW = {
  pendiente:      { next: 'en_preparacion', label: '▶ Preparar', color: 'var(--warning)' },
  en_preparacion: { next: 'listo',          label: '✓ Listo',    color: '#1565c0' },
  listo:          { next: null,             label: '✓ Listo',    color: 'var(--success)' },
  entregado:      { next: null,             label: '✓ Entregado', color: 'var(--gray-500)' },
}

function ItemStatusButton({ item, ordenId, onUpdate }) {
  const [updating, setUpdating] = useState(false)
  const flow = ITEM_STATUS_FLOW[item.estado] || ITEM_STATUS_FLOW.pendiente

  const handleClick = async () => {
    if (!flow.next || updating) return
    setUpdating(true)
    try {
      const res = await api.put(`/orders/${ordenId}/items/${item.id}/status`, { estado: flow.next })
      onUpdate(res.data.order)
    } catch {}
    setUpdating(false)
  }

  const statusStyles = {
    pendiente:      { bg: '#fff3e0', color: '#e65100' },
    en_preparacion: { bg: '#e3f2fd', color: '#1565c0' },
    listo:          { bg: '#e6f4ea', color: '#2e7d32' },
    entregado:      { bg: 'var(--gray-100)', color: 'var(--gray-500)' },
  }
  const st = statusStyles[item.estado] || {}

  return (
    <button onClick={handleClick} disabled={!flow.next || updating} style={{
      background: st.bg, color: st.color, border: 'none', borderRadius: 8,
      padding: '.4rem .85rem', fontSize: '.82rem', fontWeight: 700,
      cursor: flow.next ? 'pointer' : 'default', opacity: updating ? .6 : 1,
      transition: 'opacity .15s', whiteSpace: 'nowrap',
    }}>
      {updating ? '...' : (flow.next ? flow.label : ITEM_STATUS_LABELS[item.estado])}
    </button>
  )
}

function DrinkTicket({ order, onOrderUpdate }) {
  const isAlert = order.created_at
    ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) >= ALERT_MINUTES
    : false
  const allListo  = order.orden_items?.every(i => i.estado === 'listo')
  const mesaLabel = order.mesas?.numero ? `Mesa ${order.mesas.numero}` : `Mesa ${order.mesa_id}`

  return (
    <div style={{
      ...ts.ticket,
      borderColor: isAlert ? 'var(--coral)' : allListo ? 'var(--success)' : '#7b3fa0',
      animation: isAlert ? 'alertPulse 1.5s ease-in-out infinite' : 'none',
    }}>
      <div style={ts.ticketHeader}>
        <div style={ts.mesaNum}>{mesaLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.15rem' }}>
          <OrderTimer createdAt={order.created_at} />
          {isAlert && <span style={{ fontSize: '.72rem', color: 'var(--coral)', fontWeight: 700 }}>⚠️ URGENTE</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {order.orden_items?.map(item => (
          <div key={item.id} style={{
            ...ts.itemRow,
            background: item.estado === 'listo' ? '#e6f4ea'
              : item.estado === 'en_preparacion' ? '#e3f2fd'
              : 'rgba(255,255,255,.06)',
            opacity: item.estado === 'listo' ? .75 : 1,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                <span style={{ color: '#d4a0ff', marginRight: '.25rem' }}>{item.cantidad}x</span>
                {item.nombre}
              </div>
              {item.notas && (
                <div style={{ fontSize: '.8rem', color: 'var(--coral)', fontWeight: 600, marginTop: '.1rem' }}>
                  📝 {item.notas}
                </div>
              )}
            </div>
            <ItemStatusButton item={item} ordenId={order.id} onUpdate={onOrderUpdate} />
          </div>
        ))}
      </div>

      {allListo && (
        <div style={ts.readyBanner}>🔔 ¡BEBIDAS LISTAS! — Avisar al mesero</div>
      )}
    </div>
  )
}

export default function Barra() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [filter, setFilter]         = useState('todas')
  const pollRef = useRef(null)

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/barra/active')
      setOrders(res.data.orders || [])
      setLastUpdate(new Date())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
    pollRef.current = setInterval(loadOrders, 3000)
    return () => clearInterval(pollRef.current)
  }, [loadOrders])

  const handleOrderUpdate = (updatedOrder) => {
    if (!updatedOrder) { loadOrders(); return }
    setOrders(prev => {
      const idx = prev.findIndex(o => o.id === updatedOrder.id)
      if (idx < 0) return prev
      if (['pagado', 'cancelada'].includes(updatedOrder.estado)) {
        return prev.filter(o => o.id !== updatedOrder.id)
      }
      const updated = [...prev]
      // keep only beverage items (filter applied by backend on next poll)
      updated[idx] = updatedOrder
      return updated
    })
  }

  const filtered = orders.filter(o => {
    if (filter === 'todas')       return true
    if (filter === 'pendiente')   return o.orden_items?.some(i => i.estado === 'pendiente')
    if (filter === 'preparacion') return o.orden_items?.some(i => i.estado === 'en_preparacion')
    if (filter === 'listas')      return o.orden_items?.every(i => i.estado === 'listo')
    return true
  })

  const counts = {
    pendiente:   orders.filter(o => o.orden_items?.some(i => i.estado === 'pendiente')).length,
    preparacion: orders.filter(o => o.orden_items?.some(i => i.estado === 'en_preparacion')).length,
    listas:      orders.filter(o => o.orden_items?.every(i => i.estado === 'listo')).length,
  }

  if (loading) return (
    <div style={cs.fullBg}><div className="loading-screen"><div className="spinner" /></div></div>
  )

  return (
    <div style={cs.fullBg}>
      <div style={cs.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</a>
          <div>
            <h1 style={cs.title}>🍹 Barra</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7' }} />
              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '.78rem' }}>
                {lastUpdate.toLocaleTimeString('es-VE')} · cada 3s
              </span>
            </div>
          </div>
        </div>
        <div style={cs.countersRow}>
          <CounterBadge label="En espera"  count={counts.pendiente}   color="var(--warning)" />
          <CounterBadge label="Preparando" count={counts.preparacion} color="#d4a0ff" />
          <CounterBadge label="Listas"     count={counts.listas}      color="var(--success)" />
        </div>
      </div>

      <div style={cs.filterRow}>
        {[
          { id: 'todas',       label: `Todas (${orders.length})` },
          { id: 'pendiente',   label: `⏳ Espera (${counts.pendiente})` },
          { id: 'preparacion', label: `🍹 Prep. (${counts.preparacion})` },
          { id: 'listas',      label: `✅ Listas (${counts.listas})` },
        ].map(f => (
          <button key={f.id} style={{
            ...cs.filterBtn,
            background: filter === f.id ? '#7b3fa0' : 'rgba(255,255,255,.1)',
            color:      filter === f.id ? 'var(--white)' : 'rgba(255,255,255,.7)',
          }} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={cs.grid}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🍹</div>
            <div style={{ fontSize: '1rem' }}>
              {orders.length === 0 ? 'Sin bebidas pendientes' : 'No hay bebidas con este filtro'}
            </div>
          </div>
        ) : (
          filtered.map(order => (
            <DrinkTicket key={order.id} order={order} onOrderUpdate={handleOrderUpdate} />
          ))
        )}
      </div>
    </div>
  )
}

function CounterBadge({ label, count, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.5)', marginTop: '.1rem' }}>{label}</div>
    </div>
  )
}

const cs = {
  fullBg:    { background: '#1a0d2e', minHeight: '100dvh', paddingBottom: 80 },
  header:    { background: '#2d1b4e', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.08)' },
  title:     { color: 'var(--cream)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '.15rem' },
  countersRow: { display: 'flex', gap: '1.25rem', alignItems: 'center' },
  filterRow: { display: 'flex', gap: '.4rem', padding: '.75rem 1rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.05)' },
  filterBtn: { padding: '.4rem .9rem', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '.82rem', whiteSpace: 'nowrap', transition: 'background .15s' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '.75rem', padding: '.75rem 1rem' },
}

const ts = {
  ticket:       { background: '#2d1b4e', borderRadius: 12, border: '2px solid', overflow: 'hidden', padding: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,.4)' },
  ticketHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' },
  mesaNum:      { fontSize: '1.5rem', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 },
  itemRow:      { display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.6rem .75rem', borderRadius: 8 },
  readyBanner:  { marginTop: '.75rem', background: 'rgba(76,175,80,.2)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.85rem', fontWeight: 700, textAlign: 'center' },
}

if (typeof document !== 'undefined' && !document.getElementById('barra-styles')) {
  const style = document.createElement('style')
  style.id = 'barra-styles'
  style.textContent = `@keyframes alertPulse { 0%,100%{opacity:1} 50%{opacity:.7} }`
  document.head.appendChild(style)
}
