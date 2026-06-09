import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import {
  fmtBs, fmtUsd, fmtDate, PAYMENT_LABELS, PAYMENT_CURRENCY,
  PAYMENT_METHODS, calcTotals, DISH_CATEGORY_LABELS, ORDER_STATUS_LABELS
} from '../utils/helpers'

const EMPTY_PAYMENTS = Object.fromEntries(PAYMENT_METHODS.map(m => [m, '']))

export default function Caja() {
  const [register, setRegister] = useState(null)
  const [payments, setPayments] = useState(EMPTY_PAYMENTS)
  const [rate, setRate] = useState('')
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ dish_id: '', dish_name: '', item_type: 'plato', quantity: 1, price_bs: '', price_usd: '', cost_bs: '' })
  const [closingNote, setClosingNote] = useState('')
  const [showClose, setShowClose] = useState(false)

  // Órdenes de mesa listas para cobrar
  const [pendingOrders, setPendingOrders] = useState([])
  const [cobrarOrder, setCobrarOrder] = useState(null)
  const [cobrandoId, setCobrandoId] = useState(null)
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
        api.get('/recetario')
      ])
      const reg = regRes.data.register
      setRegister(reg)
      setRate(reg.exchange_rate_bcv?.toString() || '')
      const pm = { ...EMPTY_PAYMENTS }
      reg.daily_payments?.forEach(p => { pm[p.method] = p.amount?.toString() || '' })
      setPayments(pm)
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
      setRegister(r => ({ ...r, exchange_rate_bcv: res.data.register.exchange_rate_bcv }))
    } catch {}
    setSaving('')
  }

  const savePayment = async (method) => {
    if (!register) return
    setSaving(method)
    try {
      await api.put(`/caja/${register.id}/payment`, {
        method,
        amount: parseFloat(payments[method]) || 0
      })
    } catch {}
    setSaving('')
  }

  const addItem = async () => {
    if (!register || !newItem.dish_name || !newItem.price_bs) return
    try {
      const res = await api.post(`/caja/${register.id}/items`, {
        ...newItem,
        quantity: parseInt(newItem.quantity) || 1,
        price_bs: parseFloat(newItem.price_bs) || 0,
        price_usd: parseFloat(newItem.price_usd) || 0,
        cost_bs: parseFloat(newItem.cost_bs) || 0
      })
      setRegister(r => ({ ...r, sales_items: [...(r.sales_items || []), res.data.item] }))
      setNewItem({ dish_id: '', dish_name: '', item_type: 'plato', quantity: 1, price_bs: '', price_usd: '', cost_bs: '' })
      setShowAddItem(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al agregar')
    }
  }

  const removeItem = async (itemId) => {
    if (!register) return
    try {
      await api.delete(`/caja/${register.id}/items/${itemId}`)
      setRegister(r => ({ ...r, sales_items: r.sales_items.filter(i => i.id !== itemId) }))
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

  const selectDish = (dish) => {
    const rateVal = parseFloat(rate) || 1
    setNewItem({
      dish_id: dish.id,
      dish_name: dish.name,
      item_type: dish.category,
      quantity: 1,
      price_bs: dish.price_bs?.toString() || '',
      price_usd: dish.price_usd?.toString() || '',
      cost_bs: dish.cost_bs?.toString() || ''
    })
  }

  const rateNum = parseFloat(rate) || 0
  const paymentsForCalc = PAYMENT_METHODS.map(m => ({
    method: m, amount: parseFloat(payments[m]) || 0,
    currency: PAYMENT_CURRENCY[m]
  }))
  const { totalBs, totalUsd } = calcTotals(paymentsForCalc, rateNum)
  const totalCost = register?.sales_items?.reduce((s, i) => s + (Number(i.cost_bs) * i.quantity), 0) || 0
  const margin = totalBs > 0 ? ((totalBs - totalCost) / totalBs * 100) : 0
  const closed = register?.status === 'cerrado'

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Caja del Día</h1>
          <p className="text-sm text-muted">{fmtDate(new Date().toISOString().split('T')[0])}</p>
        </div>
        {!closed && (
          <span className="badge badge-abierto">Abierto</span>
        )}
        {closed && (
          <span className="badge badge-cerrado">Cerrado</span>
        )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {pendingOrders.map(order => (
              <div
                key={order.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.75rem',
                  padding: '.75rem 1rem', borderBottom: '1px solid var(--gray-100)',
                  cursor: 'pointer',
                }}
                onClick={() => setCobrarOrder(order)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {order.table_name || `Mesa ${order.table_number}`}
                    <span className="text-sm text-muted" style={{ marginLeft: '.5rem' }}>· {order.waiter_name}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {order.order_items?.length || 0} ítems · {ORDER_STATUS_LABELS[order.status]}
                    {order.split_count > 1 && ` · Dividir entre ${order.split_count}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: 'var(--orange)' }}>{fmtBs(order.total_bs)}</div>
                  {order.split_count > 1 && (
                    <div className="text-xs text-muted">
                      {fmtBs(Number(order.total_bs) / order.split_count)} c/u
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--success)', fontSize: '1.2rem' }}>›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasa BCV */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💱 Tasa BCV del día</span>
          {rateNum > 0 && <span className="text-sm text-muted">1 USD = Bs. {rateNum.toFixed(2)}</span>}
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input
              type="number"
              className="form-control"
              placeholder="Ej: 36.50"
              value={rate}
              onChange={e => setRate(e.target.value)}
              disabled={closed}
              step="0.01"
              min="0"
            />
            {!closed && (
              <button
                className="btn btn-primary"
                onClick={saveRate}
                disabled={saving === 'rate'}
                style={{ whiteSpace: 'nowrap' }}
              >
                {saving === 'rate' ? '...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div className="card mb-4">
        <div className="card-header">
          <span>💳 Métodos de Pago</span>
          <span className="text-sm text-muted">Monto en moneda nativa</span>
        </div>
        <div className="card-body" style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gap: '.75rem' }}>
            {PAYMENT_METHODS.map(method => (
              <div key={method} style={pmStyles.row}>
                <div style={pmStyles.label}>
                  <span style={pmStyles.methodName}>{PAYMENT_LABELS[method]}</span>
                  <span style={pmStyles.currency}>
                    {PAYMENT_CURRENCY[method] === 'usd' ? '(USD)' : '(Bs)'}
                  </span>
                </div>
                <div style={pmStyles.inputArea}>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    value={payments[method]}
                    onChange={e => setPayments(p => ({ ...p, [method]: e.target.value }))}
                    onBlur={() => !closed && savePayment(method)}
                    disabled={closed}
                    step="0.01"
                    min="0"
                    style={{ textAlign: 'right' }}
                  />
                  {saving === method && <span style={pmStyles.saving}>💾</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--orange)' }}>
          <div className="stat-label">Venta Total Bs</div>
          <div className="stat-value" style={{ color: 'var(--orange)', fontSize: '1.3rem' }}>
            {fmtBs(totalBs)}
          </div>
          <div className="stat-sub">Tasa: {rateNum > 0 ? `Bs.${rateNum}` : 'Sin tasa'}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)' }}>
          <div className="stat-label">Venta Total $</div>
          <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.3rem' }}>
            {fmtUsd(totalUsd)}
          </div>
          <div className="stat-sub">Margen: {margin.toFixed(1)}%</div>
        </div>
      </div>

      {/* Ventas del día */}
      <div className="card mb-4">
        <div className="card-header">
          <span>🍽️ Platos y Bebidas Vendidos</span>
          {!closed && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddItem(true)}>
              + Agregar
            </button>
          )}
        </div>
        {register?.sales_items?.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th style={{ textAlign: 'center' }}>Cant</th>
                  <th style={{ textAlign: 'right' }}>Precio Bs</th>
                  <th style={{ textAlign: 'right' }}>Costo Bs</th>
                  {!closed && <th />}
                </tr>
              </thead>
              <tbody>
                {register.sales_items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.dish_name}</div>
                      <div className="text-xs text-muted">{DISH_CATEGORY_LABELS[item.item_type]}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{fmtBs(Number(item.price_bs) * item.quantity)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--coral)' }}>{fmtBs(Number(item.cost_bs) * item.quantity)}</td>
                    {!closed && (
                      <td>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(item.id)}>✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <td colSpan={2} style={{ fontWeight: 700, paddingLeft: '.75rem' }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {fmtBs(register.sales_items.reduce((s, i) => s + Number(i.price_bs) * i.quantity, 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--coral)' }}>
                    {fmtBs(totalCost)}
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
        <button
          className="btn btn-dark btn-block btn-lg mb-4"
          onClick={() => setShowClose(true)}
        >
          🔒 Cerrar Caja del Día
        </button>
      )}

      {closed && (
        <div className="alert alert-success">
          ✅ Caja cerrada el {fmtDate(register.closed_at)}
          {register.notes && <p className="mt-1 text-sm">{register.notes}</p>}
        </div>
      )}

      {/* Modal: Agregar ítem */}
      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Agregar ítem vendido</span>
              <button className="btn btn-sm" onClick={() => setShowAddItem(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {dishes.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Seleccionar del menú (opcional)</label>
                  <select
                    className="form-control"
                    value={newItem.dish_id}
                    onChange={e => {
                      const dish = dishes.find(d => d.id === e.target.value)
                      if (dish) selectDish(dish)
                    }}
                  >
                    <option value="">-- Seleccionar plato --</option>
                    {dishes.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({DISH_CATEGORY_LABELS[d.category]})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre del ítem *</label>
                <input className="form-control" value={newItem.dish_name} onChange={e => setNewItem(p => ({ ...p, dish_name: e.target.value }))} placeholder="Pabellón criollo..." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-control" value={newItem.item_type} onChange={e => setNewItem(p => ({ ...p, item_type: e.target.value }))}>
                    {Object.entries(DISH_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad</label>
                  <input type="number" className="form-control" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} min="1" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Precio Bs (u.)</label>
                  <input type="number" className="form-control" value={newItem.price_bs} onChange={e => setNewItem(p => ({ ...p, price_bs: e.target.value }))} step="0.01" min="0" placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo Bs (u.)</label>
                  <input type="number" className="form-control" value={newItem.cost_bs} onChange={e => setNewItem(p => ({ ...p, cost_bs: e.target.value }))} step="0.01" min="0" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={addItem} disabled={!newItem.dish_name || !newItem.price_bs}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar día */}
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
                  <span>Venta Total Bs</span>
                  <strong>{fmtBs(totalBs)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                  <span>Venta Total $</span>
                  <strong>{fmtUsd(totalUsd)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margen estimado</span>
                  <strong style={{ color: 'var(--success)' }}>{margin.toFixed(1)}%</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas del cierre (opcional)</label>
                <textarea className="form-control" rows={2} value={closingNote} onChange={e => setClosingNote(e.target.value)} placeholder="Observaciones del día..." />
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

      {/* Modal: Cobrar orden de mesa */}
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
              {/* Detalle de ítems */}
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
                    {cobrarOrder.order_items?.map(item => (
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

              {/* Totales */}
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
              <button
                className="btn btn-success"
                onClick={() => cobrarOrden(cobrarOrder.id)}
                disabled={cobrandoId === cobrarOrder.id}
                style={{ minWidth: 140 }}
              >
                {cobrandoId === cobrarOrder.id ? '...' : '✓ Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const pmStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  label: {
    flex: '0 0 auto',
    width: 140,
    display: 'flex',
    flexDirection: 'column',
  },
  methodName: {
    fontSize: '.9rem',
    fontWeight: 600,
    color: 'var(--dark)',
    lineHeight: 1.2,
  },
  currency: {
    fontSize: '.72rem',
    color: 'var(--gray-500)',
  },
  inputArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '.3rem',
    position: 'relative',
  },
  saving: {
    fontSize: '.9rem',
    animation: 'spin .7s linear infinite',
  },
}
