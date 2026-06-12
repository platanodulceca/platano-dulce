import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { ITEM_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, BARRA_CATEGORIAS } from '../utils/helpers'

const ALERT_MINUTES = 15

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
      color: isAlert ? 'var(--coral)' : elapsed > 600 ? 'var(--warning)' : 'var(--success)',
    }}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

const ITEM_STATUS_FLOW = {
  pendiente:      { next: 'en_preparacion', label: '▶ Preparar',  color: 'var(--warning)' },
  en_preparacion: { next: 'listo',          label: '✓ Listo',     color: '#1565c0' },
  listo:          { next: null,             label: '✓ Listo',     color: 'var(--success)' },
  entregado:      { next: null,             label: '✓ Entregado', color: 'var(--gray-500)' },
}

function ItemStatusButton({ item, ordenId, onUpdate, disabled }) {
  const [updating, setUpdating] = useState(false)
  const flow = ITEM_STATUS_FLOW[item.estado] || ITEM_STATUS_FLOW.pendiente

  const handleClick = async () => {
    if (!flow.next || updating || disabled) return
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
    <button onClick={handleClick} disabled={!flow.next || updating || disabled} style={{
      background: st.bg, color: st.color, border: 'none', borderRadius: 8,
      padding: '.4rem .85rem', fontSize: '.82rem', fontWeight: 700,
      cursor: flow.next ? 'pointer' : 'default', opacity: updating ? .6 : 1,
      transition: 'opacity .15s', whiteSpace: 'nowrap',
    }}>
      {updating ? '...' : (flow.next ? flow.label : ITEM_STATUS_LABELS[item.estado])}
    </button>
  )
}

function OrderTicket({ order, onOrderUpdate }) {
  const isAlert  = order.created_at
    ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) >= ALERT_MINUTES
    : false
  const allListo   = order.orden_items?.every(i => i.estado === 'listo')
  const statusColor = ORDER_STATUS_COLORS[order.estado]
  const mesaLabel  = order.mesas?.numero ? `Mesa ${order.mesas.numero}` : `Mesa ${order.mesa_id}`

  return (
    <div style={{
      ...ts.ticket,
      borderColor: isAlert ? 'var(--coral)' : allListo ? 'var(--success)' : order.estado === 'pendiente' ? 'var(--warning)' : '#1565c0',
      animation: isAlert ? 'alertPulse 1.5s ease-in-out infinite' : 'none',
    }}>
      <div style={ts.ticketHeader}>
        <div style={ts.mesaNum}>{mesaLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.15rem' }}>
          <OrderTimer createdAt={order.created_at} />
          {isAlert && <span style={{ fontSize: '.72rem', color: 'var(--coral)', fontWeight: 700 }}>⚠️ TIEMPO EXCEDIDO</span>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.75rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: '.8rem', fontWeight: 700, color: statusColor }}>
          {ORDER_STATUS_LABELS[order.estado]}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {order.orden_items?.map(item => (
          <div key={item.id} style={{
            ...ts.itemRow,
            background: item.estado === 'listo' ? '#e6f4ea'
              : item.estado === 'en_preparacion' ? '#e3f2fd'
              : 'var(--gray-50)',
            opacity: item.estado === 'listo' ? .75 : 1,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                <span style={{ color: 'var(--orange)', marginRight: '.25rem' }}>{item.cantidad}x</span>
                {item.nombre}
              </div>
              {item.notas && (
                <div style={{ fontSize: '.8rem', color: 'var(--coral)', fontWeight: 600, marginTop: '.1rem' }}>
                  📝 {item.notas}
                </div>
              )}
            </div>
            <ItemStatusButton item={item} ordenId={order.id} onUpdate={onOrderUpdate} disabled={allListo} />
          </div>
        ))}
      </div>

      {allListo && (
        <div style={ts.readyBanner}>🔔 ¡ORDEN LISTA! — Notificando al mesero</div>
      )}
    </div>
  )
}

export default function Cocina() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [filter, setFilter]       = useState('todas')
  const pollRef = useRef(null)

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/active')
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
      updated[idx] = updatedOrder
      return updated
    })
  }

  // Only show food items — exclude drink categories handled by Barra
  const cocinaOrders = orders
    .map(o => ({
      ...o,
      orden_items: (o.orden_items || []).filter(i =>
        !BARRA_CATEGORIAS.includes((i.categoria || '').toLowerCase())
      ),
    }))
    .filter(o => o.orden_items.length > 0)

  const filtered = cocinaOrders.filter(o => {
    if (filter === 'todas')       return true
    if (filter === 'pendiente')   return o.estado === 'pendiente'
    if (filter === 'preparacion') return o.estado === 'en_preparacion'
    if (filter === 'listas')      return o.estado === 'listo'
    return true
  })

  const counts = {
    pendiente:   cocinaOrders.filter(o => o.estado === 'pendiente').length,
    preparacion: cocinaOrders.filter(o => o.estado === 'en_preparacion').length,
    listas:      cocinaOrders.filter(o => o.estado === 'listo').length,
  }

  const alertOrders = cocinaOrders.filter(o => {
    if (!o.created_at) return false
    const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)
    return mins >= ALERT_MINUTES && o.estado !== 'listo'
  })

  if (loading) return (
    <div style={cs.fullBg}>
      <div className="loading-screen"><div className="spinner" /></div>
    </div>
  )

  return (
    <div style={cs.fullBg}>
      <div style={cs.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</a>
          <div>
            <h1 style={cs.title}>👨‍🍳 Pantalla de Cocina</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ color: 'rgba(255,255,255,.5)', fontSize: '.78rem' }}>
                {lastUpdate.toLocaleTimeString('es-VE')} · cada 3s
              </span>
            </div>
          </div>
        </div>
        <div style={cs.countersRow}>
          <CounterBadge label="En espera"  count={counts.pendiente}   color="var(--warning)" />
          <CounterBadge label="Preparando" count={counts.preparacion} color="#4fc3f7" />
          <CounterBadge label="Listas"     count={counts.listas}      color="var(--success)" />
        </div>
      </div>

      {alertOrders.length > 0 && (
        <div style={cs.alertBanner}>
          ⚠️ {alertOrders.length} {alertOrders.length === 1 ? 'orden lleva' : 'órdenes llevan'} más de {ALERT_MINUTES} minutos:&nbsp;
          {alertOrders.map(o => o.mesas?.numero ? `Mesa ${o.mesas.numero}` : `Mesa ${o.mesa_id}`).join(', ')}
        </div>
      )}

      <div style={cs.filterRow}>
        {[
          { id: 'todas',       label: `Todas (${orders.length})` },
          { id: 'pendiente',   label: `⏳ Espera (${counts.pendiente})` },
          { id: 'preparacion', label: `🔥 Prep. (${counts.preparacion})` },
          { id: 'listas',      label: `✅ Listas (${counts.listas})` },
        ].map(f => (
          <button key={f.id} style={{
            ...cs.filterBtn,
            background: filter === f.id ? 'var(--orange)' : 'rgba(255,255,255,.1)',
            color:      filter === f.id ? 'var(--white)'  : 'rgba(255,255,255,.7)',
          }} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={cs.grid}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,.4)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🍳</div>
            <div style={{ fontSize: '1rem' }}>
              {cocinaOrders.length === 0 ? 'Sin órdenes activas en cocina' : 'No hay órdenes con este filtro'}
            </div>
          </div>
        ) : (
          filtered.map(order => (
            <OrderTicket key={order.id} order={order} onOrderUpdate={handleOrderUpdate} />
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
  fullBg:  { background: '#1a1a2e', minHeight: '100dvh', paddingBottom: 80 },
  header:  { background: '#16213e', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,.08)' },
  title:   { color: 'var(--cream)', fontSize: '1.1rem', fontWeight: 800, marginBottom: '.15rem' },
  countersRow: { display: 'flex', gap: '1.25rem', alignItems: 'center' },
  alertBanner: { background: 'rgba(230,97,108,.2)', borderBottom: '2px solid var(--coral)', color: 'var(--coral)', padding: '.5rem 1rem', fontSize: '.88rem', fontWeight: 700, animation: 'alertPulse 1.5s ease-in-out infinite' },
  filterRow:   { display: 'flex', gap: '.4rem', padding: '.75rem 1rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.05)' },
  filterBtn:   { padding: '.4rem .9rem', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '.82rem', whiteSpace: 'nowrap', transition: 'background .15s' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '.75rem', padding: '.75rem 1rem' },
}

const ts = {
  ticket:       { background: '#0f3460', borderRadius: 12, border: '2px solid', overflow: 'hidden', padding: '1rem', boxShadow: '0 4px 16px rgba(0,0,0,.3)' },
  ticketHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem' },
  mesaNum:      { fontSize: '1.5rem', fontWeight: 900, color: 'var(--cream)', lineHeight: 1 },
  itemRow:      { display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.6rem .75rem', borderRadius: 8 },
  readyBanner:  { marginTop: '.75rem', background: 'rgba(76,175,80,.2)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 8, padding: '.5rem .75rem', fontSize: '.85rem', fontWeight: 700, textAlign: 'center' },
}

if (typeof document !== 'undefined' && !document.getElementById('cocina-styles')) {
  const style = document.createElement('style')
  style.id = 'cocina-styles'
  style.textContent = `@keyframes alertPulse { 0%,100%{opacity:1} 50%{opacity:.7} }`
  document.head.appendChild(style)
}
