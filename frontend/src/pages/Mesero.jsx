import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  fmtBs, DISH_CATEGORY_LABELS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, TABLE_STATUS_COLORS
} from '../utils/helpers'

// ── Sub-componentes ───────────────────────────────────────────

function TableCard({ table, onSelect }) {
  const isOcupada = table.status === 'ocupada'
  const order = table.active_order
  const statusLabel = { disponible: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada' }

  let borderColor = TABLE_STATUS_COLORS[table.status] || 'var(--gray-300)'
  if (order?.status === 'lista') borderColor = 'var(--success)'

  return (
    <button
      onClick={() => onSelect(table)}
      style={{
        background: 'var(--white)',
        border: `3px solid ${borderColor}`,
        borderRadius: 12,
        padding: '1rem .75rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'transform .1s, box-shadow .1s',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '.3rem',
        minHeight: 110,
        position: 'relative',
      }}
    >
      {order?.status === 'lista' && (
        <div style={styles.readyBadge}>🔔 Lista</div>
      )}
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: borderColor, lineHeight: 1 }}>
        {table.number}
      </div>
      <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--dark)' }}>
        {table.name || `Mesa ${table.number}`}
      </div>
      <div style={{ fontSize: '.72rem', color: borderColor, fontWeight: 700 }}>
        {statusLabel[table.status]}
      </div>
      {isOcupada && order && (
        <div style={{ fontSize: '.72rem', color: 'var(--gray-500)', marginTop: '.1rem' }}>
          {ORDER_STATUS_LABELS[order.status]}
        </div>
      )}
      <div style={{ fontSize: '.72rem', color: 'var(--gray-300)' }}>
        👥 {table.capacity}
      </div>
    </button>
  )
}

function DishSelector({ dishes, selectedItems, onUpdate }) {
  const [activeCategory, setActiveCategory] = useState('plato')
  const categories = ['plato', 'bebida', 'postre', 'entrada', 'otro']

  const visibleCategories = categories.filter(cat =>
    dishes.some(d => d.category === cat && d.active)
  )

  return (
    <div>
      {/* Tabs de categoría */}
      <div style={styles.catTabs}>
        {visibleCategories.map(cat => (
          <button
            key={cat}
            style={{
              ...styles.catTab,
              background: activeCategory === cat ? 'var(--orange)' : 'var(--gray-100)',
              color: activeCategory === cat ? 'var(--white)' : 'var(--dark)',
            }}
            onClick={() => setActiveCategory(cat)}
          >
            {DISH_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Lista de platos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.75rem' }}>
        {dishes
          .filter(d => d.category === activeCategory && d.active)
          .map(dish => {
            const existing = selectedItems.find(i => i.dish_id === dish.id)
            const qty = existing?.quantity || 0
            return (
              <div key={dish.id} style={styles.dishRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{dish.name}</div>
                  <div style={{ color: 'var(--orange)', fontWeight: 700, fontSize: '.88rem' }}>
                    {fmtBs(dish.price_bs)}
                  </div>
                </div>

                <div style={styles.qtyControls}>
                  <button
                    style={styles.qtyBtn}
                    onClick={() => qty > 0 && onUpdate(dish, qty - 1)}
                    disabled={qty === 0}
                  >
                    −
                  </button>
                  <span style={styles.qtyVal}>{qty}</span>
                  <button
                    style={{ ...styles.qtyBtn, background: 'var(--orange)', color: 'var(--white)' }}
                    onClick={() => onUpdate(dish, qty + 1)}
                  >
                    +
                  </button>
                </div>

                {qty > 0 && (
                  <input
                    type="text"
                    placeholder="Nota (sin sal…)"
                    value={existing?.notes || ''}
                    onChange={e => onUpdate(dish, qty, e.target.value)}
                    style={styles.noteInput}
                  />
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

function OrderSummary({ items, splitCount, onSplitChange }) {
  const total = items.reduce((s, i) => s + Number(i.price_bs) * i.quantity, 0)
  const perPerson = splitCount > 1 ? total / splitCount : 0

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-muted text-center mt-4">Sin ítems seleccionados</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {items.map((item, idx) => (
            <div key={idx} style={styles.summaryRow}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{item.quantity}x </span>
                {item.dish_name}
                {item.notes && <span style={{ color: 'var(--gray-500)', fontSize: '.82rem' }}> · {item.notes}</span>}
              </div>
              <span style={{ fontWeight: 700 }}>{fmtBs(Number(item.price_bs) * item.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '2px solid var(--gray-100)', marginTop: '1rem', paddingTop: '.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--orange)' }}>{fmtBs(total)}</span>
        </div>

        <div className="form-group">
          <label className="form-label">Dividir cuenta entre:</label>
          <select
            className="form-control"
            value={splitCount}
            onChange={e => onSplitChange(Number(e.target.value))}
          >
            {[1,2,3,4,5,6,7,8].map(n => (
              <option key={n} value={n}>{n === 1 ? 'Sin dividir' : `${n} personas`}</option>
            ))}
          </select>
        </div>

        {splitCount > 1 && (
          <div className="alert alert-info mt-2">
            <strong>{fmtBs(perPerson)}</strong> por persona ({splitCount} comensales)
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export default function Mesero() {
  const { user } = useAuth()
  const [tab, setTab] = useState('mesas')
  const [tables, setTables] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [dishes, setDishes] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal: nueva/editar orden
  const [modalTable, setModalTable] = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const [orderTab, setOrderTab] = useState('menu')
  const [selectedItems, setSelectedItems] = useState([])
  const [splitCount, setSplitCount] = useState(1)
  const [modalLoading, setModalLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const pollRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const [tRes, oRes, dRes] = await Promise.all([
        api.get('/mesas'),
        api.get('/orders/mine'),
        api.get('/recetario'),
      ])
      setTables(tRes.data.tables || [])
      setMyOrders(oRes.data.orders || [])
      setDishes(dRes.data.dishes || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
    pollRef.current = setInterval(loadData, 5000)
    return () => clearInterval(pollRef.current)
  }, [loadData])

  const openTable = async (table) => {
    setModalTable(table)
    setModalLoading(true)
    setSelectedItems([])
    setSplitCount(1)
    setOrderTab('menu')
    setActiveOrder(null)

    try {
      // Buscar si hay una orden activa de este mesero para esta mesa
      const existingOrder = myOrders.find(o =>
        o.table_id === table.id && !['cobrada','cancelada'].includes(o.status)
      )

      if (existingOrder) {
        setActiveOrder(existingOrder)
        // Reconstruir selectedItems desde los order_items existentes
        const items = existingOrder.order_items?.map(oi => ({
          dish_id: oi.dish_id,
          dish_name: oi.dish_name,
          item_type: oi.item_type,
          quantity: oi.quantity,
          price_bs: oi.price_bs,
          cost_bs: oi.cost_bs,
          notes: oi.notes || '',
          _itemId: oi.id,
        })) || []
        setSelectedItems(items)
        setSplitCount(existingOrder.split_count || 1)
      }
    } catch {}
    setModalLoading(false)
  }

  const closeModal = () => {
    setModalTable(null)
    setActiveOrder(null)
    setSelectedItems([])
  }

  const handleDishUpdate = (dish, qty, notes) => {
    setSelectedItems(prev => {
      const existing = prev.findIndex(i => i.dish_id === dish.id)
      if (qty === 0) return prev.filter(i => i.dish_id !== dish.id)
      const item = {
        dish_id: dish.id,
        dish_name: dish.name,
        item_type: dish.category,
        quantity: qty,
        price_bs: dish.price_bs,
        cost_bs: dish.cost_bs || 0,
        notes: notes !== undefined ? notes : (prev[existing]?.notes || ''),
        _itemId: prev[existing]?._itemId || null,
      }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = item
        return updated
      }
      return [...prev, item]
    })
  }

  const syncAndSendOrder = async () => {
    if (!modalTable || selectedItems.length === 0) return
    setSending(true)
    try {
      let orderId = activeOrder?.id

      // Crear orden si no existe
      if (!orderId) {
        const res = await api.post('/orders', { table_id: modalTable.id })
        orderId = res.data.order.id
        setActiveOrder(res.data.order)
      }

      // Actualizar split_count
      if (splitCount !== (activeOrder?.split_count || 1)) {
        // Se puede agregar PUT /orders/:id/split si se necesita
      }

      // Sincronizar ítems: eliminar todos los actuales y reinsertar
      if (activeOrder?.order_items?.length) {
        await Promise.all(
          activeOrder.order_items.map(oi =>
            api.delete(`/orders/${orderId}/items/${oi.id}`)
          )
        )
      }

      await Promise.all(
        selectedItems.map(item =>
          api.post(`/orders/${orderId}/items`, {
            dish_id: item.dish_id,
            dish_name: item.dish_name,
            item_type: item.item_type,
            quantity: item.quantity,
            price_bs: item.price_bs,
            cost_bs: item.cost_bs,
            notes: item.notes || null,
          })
        )
      )

      // Si estaba en borrador, enviar a cocina
      if (!activeOrder || activeOrder.status === 'borrador') {
        await api.put(`/orders/${orderId}/send`)
      }

      await loadData()
      closeModal()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al enviar')
    }
    setSending(false)
  }

  const deliverOrder = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/deliver`)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
  }

  const cancelOrder = async (orderId) => {
    if (!confirm('¿Cancelar esta orden?')) return
    try {
      await api.put(`/orders/${orderId}/cancel`)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const orderTotal = selectedItems.reduce((s, i) => s + Number(i.price_bs) * i.quantity, 0)
  const canSend = selectedItems.length > 0 && (!activeOrder || activeOrder.status === 'borrador')
  const isSent = activeOrder && activeOrder.status !== 'borrador'

  return (
    <div className="page">
      {/* Header + tabs */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">🪑 Módulo Mesero</h1>
        <p className="text-sm text-muted">Hola, {user?.name} 👋</p>
      </div>

      <div style={styles.tabs}>
        {[
          { id: 'mesas',   label: `Mesas (${tables.length})` },
          { id: 'ordenes', label: `Mis Órdenes (${myOrders.length})` },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...styles.tabBtn, borderBottom: tab === t.id ? '3px solid var(--orange)' : '3px solid transparent', color: tab === t.id ? 'var(--orange)' : 'var(--gray-500)' }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Mesas */}
      {tab === 'mesas' && (
        <div style={styles.tableGrid}>
          {tables.map(table => (
            <TableCard key={table.id} table={table} onSelect={openTable} />
          ))}
        </div>
      )}

      {/* Tab: Mis Órdenes */}
      {tab === 'ordenes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {myOrders.length === 0 ? (
            <div className="empty-state"><div className="icon">🍽️</div><p>Sin órdenes activas</p></div>
          ) : (
            myOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onDeliver={() => deliverOrder(order.id)}
                onCancel={() => cancelOrder(order.id)}
                onEdit={() => openTable(tables.find(t => t.id === order.table_id) || { id: order.table_id, number: order.table_number, name: order.table_name, status: 'ocupada' })}
              />
            ))
          )}
        </div>
      )}

      {/* Modal: Gestión de orden */}
      {modalTable && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxHeight: '95dvh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  {modalTable.name || `Mesa ${modalTable.number}`}
                </div>
                {activeOrder && (
                  <div style={{ fontSize: '.8rem', color: ORDER_STATUS_COLORS[activeOrder.status] }}>
                    {ORDER_STATUS_LABELS[activeOrder.status]}
                  </div>
                )}
              </div>
              <button className="btn btn-sm" onClick={closeModal}>✕</button>
            </div>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-100)' }}>
              {[
                { id: 'menu',    label: '📋 Menú' },
                { id: 'resumen', label: `🧾 Resumen (${selectedItems.length})` },
              ].map(t => (
                <button
                  key={t.id}
                  style={{
                    flex: 1, padding: '.7rem', border: 'none', background: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '.9rem',
                    borderBottom: orderTab === t.id ? '3px solid var(--orange)' : '3px solid transparent',
                    color: orderTab === t.id ? 'var(--orange)' : 'var(--gray-500)',
                  }}
                  onClick={() => setOrderTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ paddingBottom: 0 }}>
              {modalLoading ? (
                <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div>
              ) : (
                <>
                  {orderTab === 'menu' && (
                    <DishSelector
                      dishes={dishes}
                      selectedItems={selectedItems}
                      onUpdate={handleDishUpdate}
                    />
                  )}
                  {orderTab === 'resumen' && (
                    <OrderSummary
                      items={selectedItems}
                      splitCount={splitCount}
                      onSplitChange={setSplitCount}
                    />
                  )}
                </>
              )}
            </div>

            {/* Sticky footer */}
            <div style={styles.stickyFooter}>
              {selectedItems.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <span className="text-sm text-muted">{selectedItems.reduce((s,i) => s+i.quantity, 0)} ítems</span>
                  <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtBs(orderTotal)}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-secondary" onClick={closeModal} style={{ flex: '0 0 auto' }}>
                  Cerrar
                </button>
                {isSent ? (
                  <button className="btn btn-primary btn-block" onClick={() => setOrderTab('resumen')} disabled>
                    ✓ Enviada a cocina
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={syncAndSendOrder}
                    disabled={selectedItems.length === 0 || sending}
                  >
                    {sending ? '...' : '🚀 Enviar a Cocina'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta de orden del mesero ───────────────────────────────
function OrderCard({ order, onDeliver, onCancel, onEdit }) {
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
  const statusColor = ORDER_STATUS_COLORS[order.status] || 'var(--gray-500)'
  const isLista = order.status === 'lista'

  return (
    <div className="card" style={{ border: isLista ? '2px solid var(--success)' : undefined }}>
      {isLista && (
        <div style={{ background: 'var(--success)', color: 'white', padding: '.4rem 1rem', fontSize: '.82rem', fontWeight: 700 }}>
          🔔 ¡Orden lista para entregar!
        </div>
      )}
      <div style={{ padding: '.9rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
              {order.table_name || `Mesa ${order.table_number}`}
            </span>
            <span className="text-sm text-muted" style={{ marginLeft: '.5rem' }}>· {elapsed}m</span>
          </div>
          <span style={{ color: statusColor, fontWeight: 700, fontSize: '.88rem' }}>
            {ORDER_STATUS_LABELS[order.status]}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginBottom: '.75rem' }}>
          {order.order_items?.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '.5rem', fontSize: '.88rem', alignItems: 'center' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: item.status === 'listo' ? 'var(--success)'
                  : item.status === 'en_preparacion' ? '#1565c0'
                  : 'var(--gray-300)'
              }} />
              <span>{item.quantity}x {item.dish_name}</span>
              {item.notes && <span className="text-muted text-xs">· {item.notes}</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtBs(order.total_bs)}</span>
          {order.split_count > 1 && (
            <span className="text-sm text-muted">
              ({fmtBs(order.total_bs / order.split_count)} x {order.split_count})
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '.4rem' }}>
            {isLista && (
              <button className="btn btn-success btn-sm" onClick={onDeliver}>✓ Entregar</button>
            )}
            {order.status === 'borrador' && (
              <button className="btn btn-primary btn-sm" onClick={onEdit}>Editar</button>
            )}
            {['borrador','pendiente'].includes(order.status) && (
              <button className="btn btn-danger btn-sm" onClick={onCancel}>Cancelar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────
const styles = {
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--gray-100)',
    marginBottom: '1rem',
  },
  tabBtn: {
    flex: 1,
    padding: '.65rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '.9rem',
    transition: 'color .15s',
  },
  tableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '.75rem',
  },
  readyBadge: {
    position: 'absolute',
    top: -8, left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--success)',
    color: 'white',
    fontSize: '.65rem',
    fontWeight: 700,
    padding: '.15rem .5rem',
    borderRadius: 8,
    whiteSpace: 'nowrap',
  },
  catTabs: {
    display: 'flex',
    gap: '.4rem',
    overflowX: 'auto',
    paddingBottom: '.25rem',
  },
  catTab: {
    padding: '.4rem .85rem',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '.82rem',
    whiteSpace: 'nowrap',
    transition: 'background .15s',
  },
  dishRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '.75rem',
    padding: '.65rem .75rem',
    background: 'var(--gray-50)',
    borderRadius: 10,
    flexWrap: 'wrap',
  },
  qtyControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '.3rem',
    flexShrink: 0,
  },
  qtyBtn: {
    width: 32, height: 32,
    borderRadius: 8,
    border: '2px solid var(--gray-300)',
    background: 'var(--white)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    width: 28,
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '1rem',
  },
  noteInput: {
    width: '100%',
    padding: '.4rem .6rem',
    border: '2px solid var(--gray-300)',
    borderRadius: 8,
    fontSize: '.82rem',
    fontFamily: 'var(--font)',
    marginTop: '.25rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '.5rem 0',
    borderBottom: '1px solid var(--gray-100)',
    gap: '.5rem',
  },
  stickyFooter: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--gray-100)',
    background: 'var(--white)',
    position: 'sticky',
    bottom: 0,
  },
}
