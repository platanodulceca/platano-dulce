import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtUsd, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../utils/helpers'

export default function Mesero() {
  const { user } = useAuth()
  const [tab, setTab]         = useState('mesas')
  const [mesas, setMesas]     = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [platos, setPlatos]   = useState([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  // Modal orden
  const [mesaActiva, setMesaActiva]     = useState(null)
  const [ordenActiva, setOrdenActiva]   = useState(null)
  const [items, setItems]               = useState([])   // { plato, cantidad, notas }
  const [ordenTab, setOrdenTab]         = useState('menu')
  const [enviando, setEnviando]         = useState(false)
  const [ubicacion, setUbicacion]       = useState('adentro')

  const cargar = useCallback(async () => {
    try {
      const [mRes, oRes, pRes] = await Promise.all([
        api.get('/mesas'),
        api.get('/ordenes/mias'),
        api.get('/recetario'),
      ])
      setMesas(mRes.data.mesas || [])
      setOrdenes(oRes.data.ordenes || [])
      setPlatos(pRes.data.items || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    pollRef.current = setInterval(cargar, 5000)
    return () => clearInterval(pollRef.current)
  }, [cargar])

  const abrirMesa = (mesa) => {
    const orden = ordenes.find(o => o.mesa_id === mesa.id)
    setMesaActiva(mesa)
    setOrdenActiva(orden || null)
    setOrdenTab('menu')
    if (orden) {
      setItems(
        orden.orden_items?.map(oi => ({ id: oi.id, plato: { nombre: oi.nombre, precio: oi.precio }, cantidad: oi.cantidad, notas: oi.notas || '' })) || []
      )
    } else {
      setItems([])
    }
  }

  const cerrarModal = () => { setMesaActiva(null); setOrdenActiva(null); setItems([]) }

  const ajustarCantidad = (plato, delta) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.plato.nombre === plato.nombre)
      if (idx < 0 && delta > 0) return [...prev, { plato, cantidad: 1, notas: '' }]
      const nuevaCant = (prev[idx]?.cantidad || 0) + delta
      if (nuevaCant <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((i, n) => n === idx ? { ...i, cantidad: nuevaCant } : i)
    })
  }

  const cantidadDe = (platoNombre) => items.find(i => i.plato.nombre === platoNombre)?.cantidad || 0

  const enviarOrden = async () => {
    if (!mesaActiva || items.length === 0) return
    setEnviando(true)
    try {
      let ordenId = ordenActiva?.id
      if (!ordenId) {
        const res = await api.post('/ordenes', { mesa_id: mesaActiva.id, personas: 1 })
        ordenId = res.data.orden.id
      }
      // Eliminar items existentes
      if (ordenActiva?.orden_items?.length) {
        await Promise.all(ordenActiva.orden_items.map(oi => api.delete(`/ordenes/${ordenId}/items/${oi.id}`)))
      }
      // Insertar nuevos items
      await Promise.all(items.map(i => api.post(`/ordenes/${ordenId}/items`, {
        nombre:   i.plato.nombre,
        precio:   i.plato.precio,
        cantidad: i.cantidad,
        notas:    i.notas || null,
      })))
      // Marcar como pendiente si era nueva
      if (!ordenActiva) {
        await api.put(`/ordenes/${ordenId}/estado`, { estado: 'pendiente' })
      }
      await cargar()
      cerrarModal()
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al enviar'
      console.error('[enviarOrden]', err.response?.status, err.response?.data || err.message)
      alert(msg)
    }
    setEnviando(false)
  }

  const cambiarEstado = async (ordenId, estado) => {
    try { await api.put(`/ordenes/${ordenId}/estado`, { estado }); await cargar() } catch {}
  }

  const nListas     = ordenes.filter(o => o.estado === 'lista').length
  const categorias  = [...new Set(platos.map(p => p.categoria))].sort()
  const porCategoria = platos.reduce((acc, p) => { if (!acc[p.categoria]) acc[p.categoria] = []; acc[p.categoria].push(p); return acc }, {})
  const totalOrden  = items.reduce((s, i) => s + Number(i.plato.precio) * i.cantidad, 0)

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🪑 Mesero</h1>
        <span className="text-sm text-muted">Hola, {user?.name} 👋</span>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', marginBottom: '1rem' }}>
        {[
          { id: 'mesas',   label: `Mesas (${mesas.length})`,       badge: 0 },
          { id: 'ordenes', label: `Mis Órdenes (${ordenes.length})`, badge: nListas },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '.65rem', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '.9rem', position: 'relative',
            color: tab === t.id ? 'var(--orange)' : t.badge > 0 ? 'var(--orange)' : 'var(--gray-500)',
            borderBottom: tab === t.id ? '3px solid var(--orange)' : t.badge > 0 ? '3px solid rgba(255,140,0,.3)' : '3px solid transparent',
          }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 10,
                background: 'var(--orange)', color: 'white', borderRadius: '50%',
                width: 20, height: 20, fontSize: '.72rem', fontWeight: 800,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                animation: 'badgePulse 1s ease-in-out infinite',
              }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mesas */}
      {tab === 'mesas' && (
        <>
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              { id: 'adentro', label: `Adentro (${mesas.filter(m => m.ubicacion === 'adentro').length})` },
              { id: 'afuera',  label: `Afuera (${mesas.filter(m => m.ubicacion === 'afuera').length}) · Terraza` },
            ].map(u => (
              <button key={u.id} onClick={() => setUbicacion(u.id)} style={{
                flex: 1, padding: '.5rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontWeight: 700, fontSize: '.85rem',
                background: ubicacion === u.id ? 'var(--orange)' : 'var(--gray-100)',
                color: ubicacion === u.id ? 'white' : 'var(--gray-500)',
              }}>{u.label}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
          {mesas.filter(m => m.ubicacion === ubicacion).map(m => {
            const orden = ordenes.find(o => o.mesa_id === m.id)
            const color = m.estado === 'ocupada' ? 'var(--coral)' : m.estado === 'reservada' ? 'var(--warning)' : 'var(--success)'
            const listaParaEntregar = orden?.estado === 'lista'
            return (
              <button key={m.id} onClick={() => abrirMesa(m)} style={{
                background: 'var(--white)', border: `3px solid ${listaParaEntregar ? 'var(--success)' : color}`,
                borderRadius: 12, padding: '.85rem .5rem', textAlign: 'center', cursor: 'pointer',
                boxShadow: 'var(--shadow)', minHeight: 100, position: 'relative',
              }}>
                {listaParaEntregar && (
                  <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: 'var(--success)', color: 'white', fontSize: '.65rem', fontWeight: 700, padding: '.12rem .45rem', borderRadius: 8, whiteSpace: 'nowrap' }}>🔔 Lista</div>
                )}
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{m.numero}</div>
                <div style={{ fontSize: '.78rem', fontWeight: 600, marginTop: '.2rem' }}>
                  {m.estado === 'ocupada' ? 'Ocupada' : m.estado === 'reservada' ? 'Reservada' : 'Libre'}
                </div>
                {orden && <div style={{ fontSize: '.7rem', color: 'var(--gray-500)' }}>{ORDER_STATUS_LABELS[orden.estado]}</div>}
                <div style={{ fontSize: '.7rem', color: 'var(--gray-300)' }}>👥 {m.capacidad}</div>
              </button>
            )
          })}
          </div>
        </>
      )}

      {/* Mis órdenes */}
      {tab === 'ordenes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {ordenes.length === 0
            ? <div className="empty-state"><div className="icon">🍽️</div><p>Sin órdenes activas</p></div>
            : ordenes.map(o => {
                const minutos = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)
                return (
                  <div key={o.id} className="card" style={{ border: o.estado === 'lista' ? '2px solid var(--success)' : undefined }}>
                    {o.estado === 'lista' && <div style={{ background: 'var(--success)', color: 'white', padding: '.35rem 1rem', fontSize: '.82rem', fontWeight: 700 }}>🔔 Lista para entregar</div>}
                    <div style={{ padding: '.9rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                        <span style={{ fontWeight: 800 }}>Mesa {o.mesas?.numero}</span>
                        <span style={{ color: ORDER_STATUS_COLORS[o.estado], fontWeight: 700, fontSize: '.88rem' }}>{ORDER_STATUS_LABELS[o.estado]}</span>
                      </div>
                      <div style={{ fontSize: '.85rem', marginBottom: '.5rem' }}>
                        {o.orden_items?.map(i => <div key={i.id}>{i.cantidad}× {i.nombre}{i.notas ? ` · ${i.notas}` : ''}</div>)}
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtUsd(o.total)}</span>
                        <span className="text-xs text-muted" style={{ flex: 1 }}>{minutos}min</span>
                        {o.estado === 'lista' && (
                          <button className="btn btn-success btn-sm" onClick={() => cambiarEstado(o.id, 'entregada')}>✓ Entregar</button>
                        )}
                        {['pendiente', 'en_preparacion'].includes(o.estado) && (
                          <button className="btn btn-danger btn-sm" onClick={() => confirm('¿Cancelar?') && cambiarEstado(o.id, 'cancelada')}>Cancelar</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Modal: gestionar orden */}
      {mesaActiva && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" style={{ maxHeight: '95dvh', display: 'flex', flexDirection: 'column', padding: 0 }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '.75rem 1rem', flexShrink: 0 }}>
              <div>
                <div className="modal-title">Mesa {mesaActiva.numero}</div>
                {ordenActiva && <div style={{ fontSize: '.8rem', color: ORDER_STATUS_COLORS[ordenActiva.estado] }}>{ORDER_STATUS_LABELS[ordenActiva.estado]}</div>}
              </div>
              <button className="btn btn-sm" onClick={cerrarModal}>✕</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
              {[{ id: 'menu', label: '📋 Menú' }, { id: 'resumen', label: `🧾 Resumen (${items.length})` }].map(t => (
                <button key={t.id} onClick={() => setOrdenTab(t.id)} style={{
                  flex: 1, padding: '.65rem', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '.9rem',
                  color: ordenTab === t.id ? 'var(--orange)' : 'var(--gray-500)',
                  borderBottom: ordenTab === t.id ? '3px solid var(--orange)' : '3px solid transparent',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {ordenTab === 'menu' && (
                <div>
                  {categorias.map(cat => (
                    <div key={cat}>
                      <div style={{ padding: '.3rem 1rem', background: 'var(--gray-50)', fontSize: '.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{cat}</div>
                      {porCategoria[cat]?.map(p => {
                        const qty = cantidadDe(p.nombre)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.65rem 1rem', borderBottom: '1px solid var(--gray-100)' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: qty > 0 ? 700 : 400 }}>{p.nombre}</div>
                              <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: '.85rem' }}>{fmtUsd(p.precio)}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                              <button style={{ width: 30, height: 30, borderRadius: 8, border: '2px solid var(--gray-300)', background: 'var(--white)', cursor: 'pointer', fontWeight: 700 }}
                                onClick={() => ajustarCantidad(p, -1)} disabled={qty === 0}>−</button>
                              <span style={{ width: 26, textAlign: 'center', fontWeight: 800 }}>{qty}</span>
                              <button style={{ width: 30, height: 30, borderRadius: 8, border: '2px solid var(--orange)', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                                onClick={() => ajustarCantidad(p, 1)}>+</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
              {ordenTab === 'resumen' && (
                <div style={{ padding: '1rem' }}>
                  {items.length === 0
                    ? <p className="text-muted text-center">Sin ítems</p>
                    : items.map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '.5rem', padding: '.5rem 0', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--orange)', minWidth: 24 }}>{i.cantidad}×</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{i.plato.nombre}</div>
                            <input className="form-control" style={{ marginTop: '.25rem', fontSize: '.82rem' }}
                              placeholder="Nota (sin sal...)" value={i.notas}
                              onChange={e => setItems(ps => ps.map((p, n) => n === idx ? { ...p, notas: e.target.value } : p))} />
                          </div>
                          <span style={{ fontWeight: 700 }}>{fmtUsd(Number(i.plato.precio) * i.cantidad)}</span>
                        </div>
                      ))
                  }
                  {items.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--orange)' }}>{fmtUsd(totalOrden)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--gray-100)', background: 'var(--white)', flexShrink: 0 }}>
              {items.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <span className="text-sm text-muted">{items.reduce((s, i) => s + i.cantidad, 0)} ítems</span>
                  <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtUsd(totalOrden)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-secondary" onClick={cerrarModal}>Cerrar</button>
                <button className="btn btn-primary btn-block" onClick={enviarOrden} disabled={items.length === 0 || enviando}>
                  {enviando ? '...' : ordenActiva ? '💾 Actualizar Orden' : '🚀 Enviar a Cocina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

if (typeof document !== 'undefined' && !document.getElementById('mesero-styles')) {
  const style = document.createElement('style')
  style.id = 'mesero-styles'
  style.textContent = `@keyframes badgePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:.85} }`
  document.head.appendChild(style)
}
