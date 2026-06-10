import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import {
  fmtBs, fmtUsd, fmtDate, PAYMENT_LABELS, PAYMENT_CURRENCY,
  PAYMENT_METHODS, calcTotals, ORDER_STATUS_LABELS
} from '../utils/helpers'

const CATEGORY_LABELS = {
  pasapalos: 'Pasapalos', principales: 'Platos Principales',
  arepas: 'Arepas', cachapas: 'Cachapas',
  bebidas: 'Bebidas', postres: 'Postres',
  desayunos: 'Desayunos', almuerzos: 'Almuerzos', empanadas: 'Empanadas',
  plato: 'Platos', bebida: 'Bebidas', postre: 'Postres',
  entrada: 'Entradas', otro: 'Otros',
}
const catLabel = c => CATEGORY_LABELS[c] || c

export default function Caja() {
  const [register, setRegister]     = useState(null)
  const [paymentRows, setPaymentRows] = useState([])
  const [rate, setRate]             = useState('')
  const [dishes, setDishes]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState('')
  const [addingRow, setAddingRow]   = useState(false)
  const [error, setError]           = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [showClose, setShowClose]   = useState(false)

  // Menú de platos
  const [showMenu, setShowMenu]     = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [pending, setPending]       = useState(null)   // { dish, qty }
  const [addingItem, setAddingItem] = useState(false)

  // Órdenes de mesa
  const [pendingOrders, setPendingOrders] = useState([])
  const [cobrarOrder, setCobrarOrder]     = useState(null)
  const [cobrandoId, setCobrandoId]       = useState(null)
  const pollRef = useRef(null)

  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders/to-collect')
      setPendingOrders(res.data.orders || [])
    } catch {}
  }, [])

  const loadToday = useCallback(async () => {
    try {
      const [regRes, dishRes] = await Promise.all([
        api.get('/caja/today'),
        api.get('/recetario'),
      ])
      const reg = regRes.data.register
      setRegister(reg)
      setRate(reg.tasa_bcv?.toString() || '')
      setPaymentRows(
        reg.caja_pagos?.map(p => ({
          id:     p.id,
          method: p.metodo,
          amount: p.monto?.toString() || '',
          notes:  p.referencia || '',
        })) || []
      )
      setDishes(dishRes.data.dishes || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
    loadPendingOrders()
    pollRef.current = setInterval(loadPendingOrders, 5000)
    return () => clearInterval(pollRef.current)
  }, [loadToday, loadPendingOrders])

  const cobrarOrden = async (orderId) => {
    setCobrandoId(orderId)
    try {
      await api.put(`/orders/${orderId}/cobrar`)
      await Promise.all([loadToday(), loadPendingOrders()])
      setCobrarOrder(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cobrar')
    }
    setCobrandoId(null)
  }

  const saveRate = async () => {
    if (!register) return
    setSaving('rate')
    try {
      const res = await api.put(`/caja/${register.id}/rate`, { exchange_rate_bcv: parseFloat(rate) || 0 })
      setRegister(r => ({ ...r, tasa_bcv: res.data.register.tasa_bcv }))
    } catch {}
    setSaving('')
  }

  // ── Pagos ──────────────────────────────────────────────────
  const addPaymentRow = async () => {
    if (!register || closed || addingRow) return
    setAddingRow(true)
    try {
      const res = await api.post(`/caja/${register.id}/payments`, {
        method: 'efectivo_bs', amount: 0, notes: '',
      })
      setPaymentRows(rows => [{
        id:     res.data.payment.id,
        method: 'efectivo_bs',
        amount: '',
        notes:  '',
      }, ...rows])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear pago')
    }
    setAddingRow(false)
  }

  const updatePaymentRow = (idx, field, value) =>
    setPaymentRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))

  const savePaymentRow = async (idx) => {
    if (!register || closed) return
    const row = paymentRows[idx]
    if (!row.id) return
    try {
      await api.put(`/caja/${register.id}/payments/${row.id}`, {
        method: row.method,
        amount: parseFloat(row.amount) || 0,
        notes:  row.notes,
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar pago')
    }
  }

  const deletePaymentRow = async (idx) => {
    const row = paymentRows[idx]
    if (row.id) {
      try { await api.delete(`/caja/${register.id}/payments/${row.id}`) } catch {}
    }
    setPaymentRows(rows => rows.filter((_, i) => i !== idx))
  }

  // ── Platos vendidos ────────────────────────────────────────
  const addItem = async () => {
    if (!register || !pending) return
    setAddingItem(true)
    try {
      const res = await api.post(`/caja/${register.id}/items`, {
        nombre:   pending.dish.name,
        cantidad: pending.qty,
        precio:   pending.dish.price_usd,
        costo:    pending.dish.cost_bs,
      })
      setRegister(r => ({ ...r, venta_items: [...(r.venta_items || []), res.data.item] }))
      setPending(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar')
    }
    setAddingItem(false)
  }

  const removeItem = async (itemId) => {
    if (!register) return
    try {
      await api.delete(`/caja/${register.id}/items/${itemId}`)
      setRegister(r => ({ ...r, venta_items: r.venta_items.filter(i => i.id !== itemId) }))
    } catch {}
  }

  const closeDay = async () => {
    if (!register) return
    setSaving('close')
    try {
      const res = await api.put(`/caja/${register.id}/close`, { notes: closingNote })
      setRegister(res.data.register)
      setShowClose(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cerrar')
    }
    setSaving('')
  }

  // ── Derivados ──────────────────────────────────────────────
  const rateNum  = parseFloat(rate) || 0
  const { totalBs, totalUsd } = calcTotals(
    paymentRows.map(r => ({ method: r.method, amount: parseFloat(r.amount) || 0, currency: PAYMENT_CURRENCY[r.method] || 'bs' })),
    rateNum
  )
  const ventaItems   = register?.venta_items || []
  const totalVentaBs = ventaItems.reduce((s, i) => s + Number(i.precio) * rateNum * Number(i.cantidad), 0)
  const totalCostBs  = ventaItems.reduce((s, i) => s + Number(i.costo)  * rateNum * Number(i.cantidad), 0)
  const margin       = totalBs > 0 ? ((totalBs - totalCostBs) / totalBs * 100) : 0
  const closed       = register?.estado === 'cerrado'

  // Menú helpers
  const filteredDishes = menuSearch.trim()
    ? dishes.filter(d => d.name.toLowerCase().includes(menuSearch.toLowerCase()))
    : null
  const categories = [...new Set(dishes.map(d => d.category))].sort()
  const byCategory = dishes.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Caja del Día</h1>
          <p className="text-sm text-muted">{fmtDate(register?.fecha)}</p>
        </div>
        {closed
          ? <span className="badge badge-cerrado">Cerrado</span>
          : <span className="badge badge-abierto">Abierto</span>
        }
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Órdenes de mesa listas para cobrar */}
      {pendingOrders.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--success)' }}>
          <div className="card-header" style={{ background: 'rgba(76,175,80,.06)' }}>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
              🔔 Órdenes listas para cobrar ({pendingOrders.length})
            </span>
            <span className="text-sm text-muted">Toca para ver detalle</span>
          </div>
          {pendingOrders.map(order => (
            <div
              key={order.id}
              style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
              onClick={() => setCobrarOrder(order)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  {order.table_name || `Mesa ${order.table_number}`}
                  <span className="text-sm text-muted" style={{ marginLeft: '.5rem' }}>· {order.waiter_name}</span>
                </div>
                <div className="text-xs text-muted">
                  {order.orden_items?.length || 0} ítems · {ORDER_STATUS_LABELS[order.status]}
                  {order.split_count > 1 && ` · Dividir entre ${order.split_count}`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--orange)' }}>{fmtBs(order.total_bs)}</div>
                {order.split_count > 1 && (
                  <div className="text-xs text-muted">{fmtBs(Number(order.total_bs) / order.split_count)} c/u</div>
                )}
              </div>
              <span style={{ color: 'var(--success)', fontSize: '1.2rem' }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Tasa BCV */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💱 Tasa BCV del día</span>
          {rateNum > 0 && <span className="text-sm text-muted">1 USD = Bs.{rateNum.toFixed(2)}</span>}
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input type="number" className="form-control" placeholder="Ej: 36.50" value={rate}
              onChange={e => setRate(e.target.value)} onBlur={saveRate} disabled={closed} step="0.01" min="0" />
            {!closed && (
              <button className="btn btn-primary" onClick={saveRate} disabled={saving === 'rate'} style={{ whiteSpace: 'nowrap' }}>
                {saving === 'rate' ? '...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Registro de Pagos */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💳 Registro de Pagos</span>
          {!closed && (
            <button className="btn btn-primary btn-sm" onClick={addPaymentRow} disabled={addingRow}>
              {addingRow ? '...' : '+ Agregar'}
            </button>
          )}
        </div>
        <div className="card-body" style={{ padding: paymentRows.length ? '1rem' : '.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {paymentRows.length === 0 && (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '.5rem 0' }}>
              {closed ? 'Sin pagos registrados' : 'Toca "+ Agregar" para registrar un pago'}
            </p>
          )}
          {paymentRows.map((row, idx) => (
            <div key={row.id || idx} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                <select className="form-control" value={row.method}
                  onChange={e => updatePaymentRow(idx, 'method', e.target.value)}
                  onBlur={() => savePaymentRow(idx)} disabled={closed}
                  style={{ flex: '2 1 0', minWidth: 0 }}>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{PAYMENT_LABELS[m]}{PAYMENT_CURRENCY[m] === 'usd' ? ' ($)' : ' (Bs)'}</option>
                  ))}
                </select>
                <input type="number" className="form-control" placeholder="0.00" value={row.amount}
                  onChange={e => updatePaymentRow(idx, 'amount', e.target.value)}
                  onBlur={() => savePaymentRow(idx)} disabled={closed}
                  step="0.01" min="0" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'right' }} />
                {!closed && (
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => deletePaymentRow(idx)} style={{ flexShrink: 0 }}>✕</button>
                )}
              </div>
              <input className="form-control" placeholder="Referencia / Nota (opcional)"
                value={row.notes} onChange={e => updatePaymentRow(idx, 'notes', e.target.value)}
                onBlur={() => savePaymentRow(idx)} disabled={closed} style={{ fontSize: '.85rem' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Totales de pagos */}
      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--orange)' }}>
          <div className="stat-label">Venta Total Bs</div>
          <div className="stat-value" style={{ color: 'var(--orange)', fontSize: '1.3rem' }}>{fmtBs(totalBs)}</div>
          <div className="stat-sub">Tasa: {rateNum > 0 ? `Bs.${rateNum}` : 'Sin tasa'}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-label">Venta Total $</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.3rem' }}>{fmtUsd(totalUsd)}</div>
          <div className="stat-sub">Margen: {margin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Platos y Bebidas Vendidos */}
      <div className="card mb-4">
        <div className="card-header">
          <span>🍽️ Platos y Bebidas Vendidos</span>
          {!closed && (
            <button className="btn btn-primary btn-sm"
              onClick={() => { setShowMenu(true); setMenuSearch(''); setPending(null) }}>
              + Agregar
            </button>
          )}
        </div>
        {ventaItems.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Plato</th>
                  <th style={{ textAlign: 'center' }}>Cant</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'right' }}>Subtotal Bs</th>
                  {!closed && <th />}
                </tr>
              </thead>
              <tbody>
                {ventaItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{fmtUsd(item.precio)}</div>
                      {rateNum > 0 && <div className="text-xs text-muted">{fmtBs(Number(item.precio) * rateNum)}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {rateNum > 0 ? fmtBs(Number(item.precio) * rateNum * Number(item.cantidad)) : '—'}
                    </td>
                    {!closed && (
                      <td><button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(item.id)}>✕</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, paddingLeft: '.75rem' }}>Total platos</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {rateNum > 0 ? fmtBs(totalVentaBs) : '—'}
                  </td>
                  {!closed && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">🍽️</div>
            <p>No hay ventas registradas aún</p>
          </div>
        )}
      </div>

      {/* Cierre */}
      {!closed && (
        <button className="btn btn-dark btn-block btn-lg mb-4" onClick={() => setShowClose(true)}>
          🔒 Cerrar Caja del Día
        </button>
      )}

      {closed && (
        <div className="alert alert-success">
          ✅ Caja cerrada el {fmtDate(register.closed_at)}
          {register.notes && <p className="mt-1 text-sm">{register.notes}</p>}
        </div>
      )}

      {/* ── Modal: Seleccionar plato del menú ── */}
      {showMenu && (
        <div className="modal-overlay" onClick={() => setShowMenu(false)}>
          <div
            className="modal"
            style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ padding: '.75rem 1rem', flexShrink: 0 }}>
              <span className="modal-title">🍽️ Seleccionar Plato</span>
              <button className="btn btn-sm" onClick={() => setShowMenu(false)}>✕</button>
            </div>

            {/* Buscador */}
            <div style={{ padding: '.5rem 1rem', borderBottom: '1px solid var(--gray-100)', flexShrink: 0 }}>
              <input
                className="form-control"
                placeholder="🔍 Buscar plato..."
                value={menuSearch}
                onChange={e => { setMenuSearch(e.target.value); setPending(null) }}
                autoFocus
              />
            </div>

            {/* Lista de platos (scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredDishes ? (
                filteredDishes.length > 0
                  ? filteredDishes.map(dish => (
                      <DishRow key={dish.id} dish={dish}
                        selected={pending?.dish.id === dish.id}
                        onSelect={() => setPending(p => p?.dish.id === dish.id ? null : { dish, qty: 1 })} />
                    ))
                  : <p className="text-sm text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                      Sin resultados para "{menuSearch}"
                    </p>
              ) : (
                categories.map(cat => (
                  <div key={cat}>
                    <div style={{
                      padding: '.35rem 1rem',
                      background: 'var(--gray-50)',
                      fontSize: '.72rem', fontWeight: 700,
                      color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.07em',
                    }}>
                      {catLabel(cat)}
                    </div>
                    {byCategory[cat]?.map(dish => (
                      <DishRow key={dish.id} dish={dish}
                        selected={pending?.dish.id === dish.id}
                        onSelect={() => setPending(p => p?.dish.id === dish.id ? null : { dish, qty: 1 })} />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Panel de confirmación — aparece al seleccionar un plato */}
            {pending && (
              <div style={{
                borderTop: '2px solid var(--orange)',
                padding: '.75rem 1rem',
                background: 'var(--cream)',
                flexShrink: 0,
              }}>
                <div style={{ fontWeight: 700, marginBottom: '.5rem', color: 'var(--dark)' }}>
                  {pending.dish.name}
                </div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <span className="text-sm text-muted" style={{ flex: 1 }}>
                    {fmtUsd(pending.dish.price_usd)}
                    {rateNum > 0 && <span> ({fmtBs(pending.dish.price_usd * rateNum)})</span>}
                    {' '}× {pending.qty} = <strong>{fmtUsd(pending.dish.price_usd * pending.qty)}</strong>
                    {rateNum > 0 && <strong> ({fmtBs(pending.dish.price_usd * rateNum * pending.qty)})</strong>}
                  </span>
                  <button className="btn btn-sm btn-secondary" style={{ width: 32, padding: 0 }}
                    onClick={() => setPending(p => ({ ...p, qty: Math.max(1, p.qty - 1) }))}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>
                    {pending.qty}
                  </span>
                  <button className="btn btn-sm btn-secondary" style={{ width: 32, padding: 0 }}
                    onClick={() => setPending(p => ({ ...p, qty: p.qty + 1 }))}>+</button>
                  <button className="btn btn-primary btn-sm" onClick={addItem}
                    disabled={addingItem} style={{ minWidth: 90 }}>
                    {addingItem ? '...' : '✓ Agregar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Cerrar día ── */}
      {showClose && (
        <div className="modal-overlay" onClick={() => setShowClose(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔒 Confirmar cierre de caja</span>
              <button className="btn btn-sm" onClick={() => setShowClose(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning mb-4">
                Esta acción cerrará la caja del día. No podrás modificar los datos después.
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                  <span>Venta Total Bs</span><strong>{fmtBs(totalBs)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                  <span>Venta Total $</span><strong>{fmtUsd(totalUsd)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margen estimado</span>
                  <strong style={{ color: 'var(--success)' }}>{margin.toFixed(1)}%</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas del cierre (opcional)</label>
                <textarea className="form-control" rows={2} value={closingNote}
                  onChange={e => setClosingNote(e.target.value)} placeholder="Observaciones del día..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClose(false)}>Cancelar</button>
              <button className="btn btn-dark" onClick={closeDay} disabled={saving === 'close'}>
                {saving === 'close' ? '...' : '🔒 Cerrar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cobrar orden de mesa ── */}
      {cobrarOrder && (
        <div className="modal-overlay" onClick={() => setCobrarOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  💵 Cobrar — {cobrarOrder.table_name || `Mesa ${cobrarOrder.table_number}`}
                </div>
                <div className="text-sm text-muted">Mesero: {cobrarOrder.waiter_name}</div>
              </div>
              <button className="btn btn-sm" onClick={() => setCobrarOrder(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="table-wrap mb-3">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ítem</th>
                      <th style={{ textAlign: 'center' }}>Cant</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrarOrder.orden_items?.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.dish_name}</div>
                          {item.notes && <div className="text-xs text-muted">{item.notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmtBs(Number(item.price_bs) * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--orange)' }}>
                    {fmtBs(cobrarOrder.total_bs)}
                  </span>
                </div>
                {cobrarOrder.split_count > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-sm text-muted">Por persona ({cobrarOrder.split_count})</span>
                    <span style={{ fontWeight: 700, color: 'var(--brown)' }}>
                      {fmtBs(Number(cobrarOrder.total_bs) / cobrarOrder.split_count)}
                    </span>
                  </div>
                )}
              </div>
              <div className="alert alert-info mt-3">
                Al confirmar, los ítems se agregarán automáticamente a las ventas del día y la mesa quedará libre.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCobrarOrder(null)}>Cancelar</button>
              <button className="btn btn-success" onClick={() => cobrarOrden(cobrarOrder.id)}
                disabled={cobrandoId === cobrarOrder.id} style={{ minWidth: 140 }}>
                {cobrandoId === cobrarOrder.id ? '...' : '✓ Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fila de plato en el selector de menú ──────────────────────
function DishRow({ dish, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem',
        padding: '.65rem 1rem', textAlign: 'left', cursor: 'pointer',
        background: selected ? 'rgba(243,150,57,.1)' : 'transparent',
        border: 'none', borderBottom: '1px solid var(--gray-100)',
        outline: selected ? '2px solid var(--orange)' : 'none',
        outlineOffset: -2,
      }}
    >
      <div style={{ flex: 1, fontWeight: selected ? 700 : 400, color: 'var(--dark)' }}>
        {dish.name}
      </div>
      <div style={{ fontWeight: 700, color: 'var(--orange)', flexShrink: 0 }}>
        {fmtUsd(dish.price_usd)}
      </div>
      <span style={{ color: selected ? 'var(--orange)' : 'var(--gray-300)', fontSize: '1.1rem', flexShrink: 0 }}>
        {selected ? '✓' : '+'}
      </span>
    </button>
  )
}
