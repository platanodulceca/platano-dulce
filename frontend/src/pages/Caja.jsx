import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import {
  fmtBs, fmtUsd, fmtDate,
  PAYMENT_LABELS, PAYMENT_CURRENCY, PAYMENT_METHODS, calcTotals,
  ORDER_STATUS_LABELS,
} from '../utils/helpers'

export default function Caja() {
  const [caja, setCaja]           = useState(null)
  const [pagos, setPagos]         = useState([])
  const [tasa, setTasa]           = useState('')
  const [platos, setPlatos]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [addingPago, setAddingPago] = useState(false)

  // Menú
  const [showMenu, setShowMenu]   = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [pending, setPending]     = useState(null)   // { plato, qty }
  const [addingPlato, setAddingPlato] = useState(false)

  // Cierre
  const [showCierre, setShowCierre] = useState(false)
  const [notasCierre, setNotasCierre] = useState('')
  const [cerrando, setCerrando]   = useState(false)

  // Órdenes de mesa
  const [ordenesListas, setOrdenesListas] = useState([])
  const [cobrarOrden, setCobrarOrden]     = useState(null)
  const [cobrandoId, setCobrandoId]       = useState(null)
  const pollRef = useRef(null)

  const cargarOrdenes = useCallback(async () => {
    try {
      const res = await api.get('/ordenes/cobrar')
      setOrdenesListas(res.data.ordenes || [])
    } catch {}
  }, [])

  const cargarHoy = useCallback(async () => {
    try {
      const [cajaRes, platosRes] = await Promise.all([
        api.get('/caja/hoy'),
        api.get('/recetario'),
      ])
      const c = cajaRes.data.caja
      setCaja(c)
      setTasa(c.tasa_bcv?.toString() || '')
      setPagos(
        c.caja_pagos?.map(p => ({
          id:         p.id,
          metodo:     p.metodo,
          monto:      p.monto?.toString() || '',
          moneda:     p.moneda || PAYMENT_CURRENCY[p.metodo] || 'bs',
          referencia: p.referencia || '',
        })) || []
      )
      setPlatos(platosRes.data.items || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargarHoy()
    cargarOrdenes()
    pollRef.current = setInterval(cargarOrdenes, 5000)
    return () => clearInterval(pollRef.current)
  }, [cargarHoy, cargarOrdenes])

  const tasaNum = parseFloat(tasa) || 0
  const cerrado = caja?.cerrado === true
  const ventas  = caja?.venta_items || []

  const totalVentaBs = ventas.reduce((s, i) => s + Number(i.precio) * tasaNum * Number(i.cantidad), 0)

  const { totalBs, totalUsd } = calcTotals(
    pagos.map(p => ({ monto: parseFloat(p.monto) || 0, moneda: p.moneda || PAYMENT_CURRENCY[p.metodo] || 'bs' })),
    tasaNum
  )

  // ── Tasa ──────────────────────────────────────────────────────
  const guardarTasa = async () => {
    if (!caja) return
    try {
      const res = await api.put(`/caja/${caja.id}/tasa`, { tasa_bcv: parseFloat(tasa) || 0 })
      setCaja(c => ({ ...c, tasa_bcv: res.data.caja.tasa_bcv }))
    } catch {}
  }

  // ── Pagos ─────────────────────────────────────────────────────
  const agregarPago = async () => {
    if (!caja || cerrado || addingPago) return
    setAddingPago(true)
    try {
      const res = await api.post(`/caja/${caja.id}/pagos`, { metodo: 'efectivo_bs', monto: 0 })
      setPagos(ps => [{ id: res.data.pago.id, metodo: 'efectivo_bs', monto: '', moneda: 'bs', referencia: '' }, ...ps])
    } catch (err) {
      setError(err.response?.data?.error || 'Error')
    }
    setAddingPago(false)
  }

  const actualizarPago = (idx, campo, valor) =>
    setPagos(ps => ps.map((p, i) => {
      if (i !== idx) return p
      const updated = { ...p, [campo]: valor }
      if (campo === 'metodo') updated.moneda = PAYMENT_CURRENCY[valor] || 'bs'
      return updated
    }))

  const guardarPago = async (idx) => {
    if (!caja || cerrado) return
    const p = pagos[idx]
    if (!p.id) return
    try {
      await api.put(`/caja/${caja.id}/pagos/${p.id}`, {
        metodo: p.metodo, monto: parseFloat(p.monto) || 0, referencia: p.referencia,
      })
    } catch {}
  }

  const eliminarPago = async (idx) => {
    const p = pagos[idx]
    if (p.id) { try { await api.delete(`/caja/${caja.id}/pagos/${p.id}`) } catch {} }
    setPagos(ps => ps.filter((_, i) => i !== idx))
  }

  // ── Ventas / Platos ───────────────────────────────────────────
  const agregarPlato = async () => {
    if (!caja || !pending) return
    setAddingPlato(true)
    try {
      const res = await api.post(`/caja/${caja.id}/ventas`, {
        nombre:   pending.plato.nombre,
        precio:   pending.plato.precio,
        costo:    pending.plato.costo,
        cantidad: pending.qty,
      })
      setCaja(c => ({ ...c, venta_items: [...(c.venta_items || []), res.data.venta] }))
      setPending(null)
      setShowMenu(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar')
    }
    setAddingPlato(false)
  }

  const eliminarVenta = async (itemId) => {
    try {
      await api.delete(`/caja/${caja.id}/ventas/${itemId}`)
      setCaja(c => ({ ...c, venta_items: c.venta_items.filter(i => i.id !== itemId) }))
    } catch {}
  }

  // ── Cobrar orden de mesa ──────────────────────────────────────
  const confirmarCobro = async (ordenId) => {
    setCobrandoId(ordenId)
    try {
      await api.put(`/ordenes/${ordenId}/cobrar`)
      await Promise.all([cargarHoy(), cargarOrdenes()])
      setCobrarOrden(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cobrar')
    }
    setCobrandoId(null)
  }

  // ── Cierre ────────────────────────────────────────────────────
  const cerrarCaja = async () => {
    setCerrando(true)
    try {
      const res = await api.put(`/caja/${caja.id}/cerrar`, { notes: notasCierre })
      setCaja(res.data.caja)
      setShowCierre(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cerrar')
    }
    setCerrando(false)
  }

  // ── Menú helpers ──────────────────────────────────────────────
  const platosVisibles = busqueda.trim()
    ? platos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : null
  const categorias  = [...new Set(platos.map(p => p.categoria))].sort()
  const porCategoria = platos.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = []
    acc[p.categoria].push(p)
    return acc
  }, {})

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Caja del Día</h1>
          <p className="text-sm text-muted">{fmtDate(caja?.fecha)}</p>
        </div>
        <span className={`badge ${cerrado ? 'badge-cerrado' : 'badge-abierto'}`}>
          {cerrado ? 'Cerrada' : 'Abierta'}
        </span>
      </div>

      {error && <div className="alert alert-error mb-4">{error}<button style={{ float: 'right' }} onClick={() => setError('')}>✕</button></div>}

      {/* Órdenes listas para cobrar */}
      {ordenesListas.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-header" style={{ background: 'rgba(76,175,80,.06)' }}>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>🔔 Órdenes para cobrar ({ordenesListas.length})</span>
          </div>
          {ordenesListas.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
              onClick={() => setCobrarOrden(o)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Mesa {o.mesas?.numero}</div>
                <div className="text-xs text-muted">{o.orden_items?.length || 0} ítems · {ORDER_STATUS_LABELS[o.estado]}</div>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--orange)' }}>{fmtUsd(o.total)}</div>
              <span style={{ color: 'var(--success)' }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Tasa BCV */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💱 Tasa BCV</span>
          {tasaNum > 0 && <span className="text-sm text-muted">1 $ = Bs.{tasaNum.toFixed(2)}</span>}
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input type="number" className="form-control" placeholder="Ej: 36.50"
              value={tasa} onChange={e => setTasa(e.target.value)} onBlur={guardarTasa}
              disabled={cerrado} step="0.01" min="0" />
            {!cerrado && <button className="btn btn-primary" onClick={guardarTasa} style={{ whiteSpace: 'nowrap' }}>Guardar</button>}
          </div>
        </div>
      </div>

      {/* Registro de Pagos */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💳 Pagos</span>
          {!cerrado && (
            <button className="btn btn-primary btn-sm" onClick={agregarPago} disabled={addingPago}>
              {addingPago ? '...' : '+ Agregar'}
            </button>
          )}
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {pagos.length === 0 && <p className="text-sm text-muted text-center">Sin pagos registrados</p>}
          {pagos.map((p, idx) => (
            <div key={p.id || idx} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                <select className="form-control" value={p.metodo}
                  onChange={e => actualizarPago(idx, 'metodo', e.target.value)}
                  onBlur={() => guardarPago(idx)} disabled={cerrado} style={{ flex: 2, minWidth: 0 }}>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{PAYMENT_LABELS[m]} ({PAYMENT_CURRENCY[m] === 'usd' ? '$' : 'Bs'})</option>
                  ))}
                </select>
                <input type="number" className="form-control" placeholder="0.00" value={p.monto}
                  onChange={e => actualizarPago(idx, 'monto', e.target.value)}
                  onBlur={() => guardarPago(idx)} disabled={cerrado}
                  step="0.01" min="0" style={{ flex: 1, minWidth: 0, textAlign: 'right' }} />
                {!cerrado && <button className="btn btn-danger btn-sm btn-icon" onClick={() => eliminarPago(idx)}>✕</button>}
              </div>
              <input className="form-control" placeholder="Referencia (opcional)"
                value={p.referencia} onChange={e => actualizarPago(idx, 'referencia', e.target.value)}
                onBlur={() => guardarPago(idx)} disabled={cerrado} style={{ fontSize: '.85rem' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Totales pagos */}
      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--orange)' }}>
          <div className="stat-label">Total Pagos Bs</div>
          <div className="stat-value" style={{ color: 'var(--orange)', fontSize: '1.3rem' }}>{fmtBs(totalBs)}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-label">Total Pagos $</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.3rem' }}>{fmtUsd(totalUsd)}</div>
        </div>
      </div>

      {/* Platos vendidos */}
      <div className="card mb-4">
        <div className="card-header">
          <span>🍽️ Platos Vendidos</span>
          {!cerrado && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowMenu(true); setBusqueda(''); setPending(null) }}>
              + Agregar
            </button>
          )}
        </div>
        {ventas.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Plato</th>
                  <th style={{ textAlign: 'center' }}>Cant</th>
                  <th style={{ textAlign: 'right' }}>Precio $</th>
                  <th style={{ textAlign: 'right' }}>Subtotal Bs</th>
                  {!cerrado && <th />}
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{v.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{fmtUsd(v.precio)}</div>
                      {tasaNum > 0 && <div className="text-xs text-muted">{fmtBs(Number(v.precio) * tasaNum)}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {tasaNum > 0 ? fmtBs(Number(v.precio) * tasaNum * Number(v.cantidad)) : '—'}
                    </td>
                    {!cerrado && <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => eliminarVenta(v.id)}>✕</button></td>}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, paddingLeft: '.75rem' }}>Total platos</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{tasaNum > 0 ? fmtBs(totalVentaBs) : '—'}</td>
                  {!cerrado && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state"><div className="icon">🍽️</div><p>Sin ventas aún</p></div>
        )}
      </div>

      {/* Cerrar caja */}
      {!cerrado
        ? <button className="btn btn-dark btn-block btn-lg mb-4" onClick={() => setShowCierre(true)}>🔒 Cerrar Caja</button>
        : <div className="alert alert-success">✅ Caja cerrada{caja.closed_at ? ` a las ${new Date(caja.closed_at).toLocaleTimeString('es-VE')}` : ''}</div>
      }

      {/* ─── Modal: Menú de platos ─── */}
      {showMenu && (
        <div className="modal-overlay" onClick={() => setShowMenu(false)}>
          <div className="modal" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }}
            onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '.75rem 1rem', flexShrink: 0 }}>
              <span className="modal-title">🍽️ Agregar Plato</span>
              <button className="btn btn-sm" onClick={() => setShowMenu(false)}>✕</button>
            </div>
            <div style={{ padding: '.5rem 1rem', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
              <input className="form-control" placeholder="🔍 Buscar..." value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPending(null) }} autoFocus />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {platosVisibles
                ? (platosVisibles.length > 0
                    ? platosVisibles.map(p => <PlatoRow key={p.id} plato={p} selected={pending?.plato.id === p.id}
                        onSelect={() => setPending(x => x?.plato.id === p.id ? null : { plato: p, qty: 1 })} />)
                    : <p className="text-sm text-muted text-center" style={{ padding: '2rem' }}>Sin resultados</p>)
                : categorias.map(cat => (
                    <div key={cat}>
                      <div style={{ padding: '.3rem 1rem', background: 'var(--gray-50)', fontSize: '.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        {cat}
                      </div>
                      {porCategoria[cat]?.map(p => (
                        <PlatoRow key={p.id} plato={p} selected={pending?.plato.id === p.id}
                          onSelect={() => setPending(x => x?.plato.id === p.id ? null : { plato: p, qty: 1 })} />
                      ))}
                    </div>
                  ))
              }
            </div>
            {pending && (
              <div style={{ borderTop: '2px solid var(--orange)', padding: '.75rem 1rem', background: 'var(--cream)', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: '.4rem' }}>{pending.plato.nombre}</div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <span className="text-sm text-muted" style={{ flex: 1 }}>
                    {fmtUsd(pending.plato.precio)}
                    {tasaNum > 0 && <span> · {fmtBs(pending.plato.precio * tasaNum)}</span>}
                    {' '}× {pending.qty} = <strong>{fmtUsd(pending.plato.precio * pending.qty)}</strong>
                  </span>
                  <button className="btn btn-sm btn-secondary" style={{ width: 32, padding: 0 }}
                    onClick={() => setPending(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{pending.qty}</span>
                  <button className="btn btn-sm btn-secondary" style={{ width: 32, padding: 0 }}
                    onClick={() => setPending(p => ({ ...p, qty: p.qty + 1 }))}>+</button>
                  <button className="btn btn-primary btn-sm" onClick={agregarPlato} disabled={addingPlato} style={{ minWidth: 80 }}>
                    {addingPlato ? '...' : '✓ Agregar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal: Cerrar caja ─── */}
      {showCierre && (
        <div className="modal-overlay" onClick={() => setShowCierre(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔒 Cerrar Caja</span>
              <button className="btn btn-sm" onClick={() => setShowCierre(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning mb-3">Esta acción cerrará la caja del día. No se podrá modificar después.</div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem' }}>
                  <span>Total Bs</span><strong>{fmtBs(totalBs)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total $</span><strong>{fmtUsd(totalUsd)}</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas (opcional)</label>
                <textarea className="form-control" rows={2} value={notasCierre}
                  onChange={e => setNotasCierre(e.target.value)} placeholder="Observaciones..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCierre(false)}>Cancelar</button>
              <button className="btn btn-dark" onClick={cerrarCaja} disabled={cerrando}>
                {cerrando ? '...' : '🔒 Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Cobrar orden de mesa ─── */}
      {cobrarOrden && (
        <div className="modal-overlay" onClick={() => setCobrarOrden(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">💵 Cobrar Mesa {cobrarOrden.mesas?.numero}</div>
              </div>
              <button className="btn btn-sm" onClick={() => setCobrarOrden(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-wrap mb-3">
                <table className="table">
                  <thead><tr><th>Ítem</th><th style={{ textAlign: 'center' }}>Cant</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                  <tbody>
                    {cobrarOrden.orden_items?.map(i => (
                      <tr key={i.id}>
                        <td style={{ fontWeight: 600 }}>{i.nombre}
                          {i.notas && <div className="text-xs text-muted">{i.notas}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{i.cantidad}</td>
                        <td style={{ textAlign: 'right' }}>{fmtUsd(Number(i.precio) * Number(i.cantidad))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--orange)' }}>{fmtUsd(cobrarOrden.total)}</span>
                </div>
                {tasaNum > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.25rem' }}>
                    <span className="text-sm text-muted">Equivalente Bs</span>
                    <span style={{ fontWeight: 700, color: 'var(--brown)' }}>{fmtBs(Number(cobrarOrden.total) * tasaNum)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCobrarOrden(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={() => confirmarCobro(cobrarOrden.id)} disabled={cobrandoId === cobrarOrden.id}>
                {cobrandoId === cobrarOrden.id ? '...' : '✓ Cobrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlatoRow({ plato, selected, onSelect }) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem',
      padding: '.65rem 1rem', textAlign: 'left', cursor: 'pointer',
      background: selected ? 'rgba(243,150,57,.1)' : 'transparent',
      border: 'none', borderBottom: '1px solid var(--gray-100)',
      outline: selected ? '2px solid var(--orange)' : 'none', outlineOffset: -2,
    }}>
      <div style={{ flex: 1, fontWeight: selected ? 700 : 400 }}>{plato.nombre}</div>
      <div style={{ fontWeight: 700, color: 'var(--orange)', flexShrink: 0 }}>{fmtUsd(plato.precio)}</div>
      <span style={{ color: selected ? 'var(--orange)' : 'var(--gray-300)', fontSize: '1.1rem', flexShrink: 0 }}>
        {selected ? '✓' : '+'}
      </span>
    </button>
  )
}
