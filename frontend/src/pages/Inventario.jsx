import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtDate, CATEGORY_LABELS } from '../utils/helpers'

const CATEGORY_ICONS = {
  viveres_barra_bebidas:   '🛒',
  frutas_vegetales:        '🥬',
  carniceria_frigorifico:  '🥩',
}

export default function Inventario() {
  const [inventory, setInventory] = useState([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editCounts, setEditCounts] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newProduct, setNewProduct] = useState({ name:'', category:'viveres_barra_bebidas', unit:'kg', minimum_stock:'', current_stock:'', cost_per_unit:'' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventario/today')
      setInventory(res.data.inventory || [])
      const counts = {}
      res.data.inventory?.forEach(p => { counts[p.id] = p.physical_count?.toString() || '0' })
      setEditCounts(counts)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saveCount = async (productId) => {
    setSaving(productId)
    try {
      await api.post('/inventario/count', {
        product_id: productId,
        physical_count: parseFloat(editCounts[productId]) || 0,
        date
      })
      setInventory(inv => inv.map(p => {
        if (p.id !== productId) return p
        const physical = parseFloat(editCounts[productId]) || 0
        let status = 'ok'
        if (physical <= 0) status = 'agotado'
        else if (physical <= p.minimum_stock) status = 'reponer'
        return { ...p, physical_count: physical, status }
      }))
    } catch {}
    setSaving(null)
  }

  const addProduct = async () => {
    try {
      await api.post('/inventario/products', {
        ...newProduct,
        minimum_stock: parseFloat(newProduct.minimum_stock) || 0,
        current_stock: parseFloat(newProduct.current_stock) || 0,
        cost_per_unit: parseFloat(newProduct.cost_per_unit) || 0,
      })
      setShowAdd(false)
      setNewProduct({ name:'', category:'viveres_barra_bebidas', unit:'kg', minimum_stock:'', current_stock:'', cost_per_unit:'' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al agregar')
    }
  }

  const filtered = inventory.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || p.category === filterCat
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  const grouped = Object.keys(CATEGORY_LABELS).map(cat => ({
    cat,
    items: filtered.filter(p => p.category === cat)
  })).filter(g => g.items.length > 0)

  const counts = { ok: 0, reponer: 0, agotado: 0 }
  inventory.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++ })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventario</h1>
          <p className="text-sm text-muted">{fmtDate(date)}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Producto</button>
      </div>

      {/* Resumen semáforo */}
      <div className="grid-3 mb-4">
        {[
          { key: 'ok',      label: 'OK',      color: 'var(--success)', emoji: '✅' },
          { key: 'reponer', label: 'REPONER', color: 'var(--warning)', emoji: '⚠️' },
          { key: 'agotado', label: 'AGOTADO', color: 'var(--coral)',   emoji: '🔴' },
        ].map(s => (
          <div
            key={s.key}
            className="stat-card"
            style={{ borderColor: s.color, cursor: 'pointer', opacity: filterStatus === s.key ? 1 : .7 }}
            onClick={() => setFilterStatus(f => f === s.key ? 'all' : s.key)}
          >
            <div className="stat-label">{s.emoji} {s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: '2rem' }}>{counts[s.key]}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 150 }}
          />
          <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: '0 0 auto' }}>
            <option value="all">Todas las categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Tablas por categoría */}
      {grouped.length === 0 ? (
        <div className="empty-state"><div className="icon">📦</div><p>No hay productos</p></div>
      ) : (
        grouped.map(({ cat, items }) => (
          <div key={cat} className="card mb-4">
            <div className="card-header">
              <span>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</span>
              <span className="text-sm text-muted">{items.length} productos</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Conteo Físico</th>
                    <th style={{ textAlign: 'right' }}>Teórico</th>
                    <th style={{ textAlign: 'right' }}>Diferencia</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="text-xs text-muted">Mín: {p.minimum_stock} {p.unit}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCounts[p.id] ?? p.physical_count ?? ''}
                          onChange={e => setEditCounts(c => ({ ...c, [p.id]: e.target.value }))}
                          style={{
                            width: 80,
                            textAlign: 'right',
                            border: '2px solid var(--gray-300)',
                            borderRadius: 6,
                            padding: '.35rem .5rem',
                            fontSize: '.9rem',
                          }}
                        />
                        <span className="text-xs text-muted ml-1" style={{ marginLeft: 4 }}>{p.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(p.theoretical_count).toFixed(2)} {p.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: Number(p.difference) < 0 ? 'var(--coral)' : 'inherit', fontWeight: 600 }}>
                        {Number(p.difference) >= 0 ? '+' : ''}{Number(p.difference).toFixed(2)}
                      </td>
                      <td>
                        <Semaforo status={p.status} />
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => saveCount(p.id)}
                          disabled={saving === p.id}
                        >
                          {saving === p.id ? '...' : '💾'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Modal: Agregar producto */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Agregar producto</span>
              <button className="btn btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-control" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-control" value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}>
                    {['kg','lt','g','ml','und','mazo','caja','bolsa','lata'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Costo / unidad (Bs)</label>
                  <input type="number" className="form-control" value={newProduct.cost_per_unit} onChange={e => setNewProduct(p => ({ ...p, cost_per_unit: e.target.value }))} step="0.01" min="0" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input type="number" className="form-control" value={newProduct.minimum_stock} onChange={e => setNewProduct(p => ({ ...p, minimum_stock: e.target.value }))} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock actual</label>
                  <input type="number" className="form-control" value={newProduct.current_stock} onChange={e => setNewProduct(p => ({ ...p, current_stock: e.target.value }))} step="0.01" min="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={addProduct} disabled={!newProduct.name}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Semaforo({ status }) {
  const labels = { ok: 'OK', reponer: 'REPONER', agotado: 'AGOTADO' }
  return (
    <div className={`semaforo ${status}`}>
      <div className="semaforo-dot" />
      {labels[status] || status}
    </div>
  )
}
