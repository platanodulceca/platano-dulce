import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { DISH_CATEGORY_LABELS } from '../utils/helpers'

export default function Recetario() {
  const [dishes, setDishes] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [showAddDish, setShowAddDish] = useState(false)
  const [showAddIng, setShowAddIng] = useState(false)
  const [newDish, setNewDish] = useState({ name: '', category: 'plato', price_bs: '', price_usd: '', cost_bs: '' })
  const [newIng, setNewIng] = useState({ product_id: '', quantity_per_portion: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, pRes] = await Promise.all([
        api.get('/recetario'),
        api.get('/inventario/products')
      ])
      setDishes(rRes.data.dishes || [])
      setProducts(pRes.data.products || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedDish) {
      const updated = dishes.find(d => d.id === selectedDish.id)
      if (updated) setSelectedDish(updated)
    }
  }, [dishes]) // eslint-disable-line

  const addDish = async () => {
    setSaving(true)
    try {
      await api.post('/recetario/dishes', {
        ...newDish,
        price_bs: parseFloat(newDish.price_bs) || 0,
        price_usd: parseFloat(newDish.price_usd) || 0,
        cost_bs: parseFloat(newDish.cost_bs) || 0
      })
      setShowAddDish(false)
      setNewDish({ name: '', category: 'plato', price_bs: '', price_usd: '', cost_bs: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const addIngredient = async () => {
    if (!selectedDish || !newIng.product_id || !newIng.quantity_per_portion) return
    setSaving(true)
    try {
      const res = await api.post('/recetario/ingredients', {
        dish_id: selectedDish.id,
        product_id: newIng.product_id,
        quantity_per_portion: parseFloat(newIng.quantity_per_portion)
      })
      setDishes(ds => ds.map(d => {
        if (d.id !== selectedDish.id) return d
        const existing = d.ingredients.find(i => i.id === res.data.ingredient.id)
        const ings = existing
          ? d.ingredients.map(i => i.id === res.data.ingredient.id ? res.data.ingredient : i)
          : [...d.ingredients, res.data.ingredient]
        return { ...d, ingredients: ings }
      }))
      setNewIng({ product_id: '', quantity_per_portion: '' })
      setShowAddIng(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const removeIngredient = async (ingId) => {
    try {
      await api.delete(`/recetario/ingredients/${ingId}`)
      setDishes(ds => ds.map(d => ({
        ...d,
        ingredients: d.ingredients.filter(i => i.id !== ingId)
      })))
    } catch {}
  }

  const toggleActive = async (dish) => {
    try {
      await api.put(`/recetario/dishes/${dish.id}`, { ...dish, active: !dish.active })
      load()
    } catch {}
  }

  const filtered = dishes.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || d.category === filterCat
    return matchSearch && matchCat
  })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 Recetario</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddDish(true)}>+ Plato</button>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar plato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: '0 0 auto' }}>
            <option value="all">Todas las categorías</option>
            {Object.entries(DISH_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        {filtered.length === 0 && (
          <div className="empty-state"><div className="icon">📋</div><p>No hay platos registrados</p></div>
        )}
        {filtered.map(dish => (
          <div key={dish.id} className="card" style={{ opacity: dish.active ? 1 : .6 }}>
            <div
              className="card-header"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedDish(selectedDish?.id === dish.id ? null : dish)}
            >
              <div>
                <span style={{ fontWeight: 700 }}>{dish.name}</span>
                <span className="badge" style={{
                  marginLeft: '.5rem',
                  background: 'var(--cream)',
                  color: 'var(--brown)',
                  fontSize: '.68rem'
                }}>
                  {DISH_CATEGORY_LABELS[dish.category]}
                </span>
                {!dish.active && <span className="badge" style={{ marginLeft: '.4rem', background: '#eee', color: '#888' }}>Inactivo</span>}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--orange)' }}>Bs. {Number(dish.price_bs).toFixed(2)}</span>
                <span style={{ color: 'var(--gray-500)' }}>{selectedDish?.id === dish.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {selectedDish?.id === dish.id && (
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span className="text-sm"><span className="text-muted">Precio: </span><strong>Bs. {Number(dish.price_bs).toFixed(2)}</strong></span>
                    <span className="text-sm"><span className="text-muted">Costo: </span><strong style={{ color: 'var(--coral)' }}>Bs. {Number(dish.cost_bs).toFixed(2)}</strong></span>
                    <span className="text-sm"><span className="text-muted">Margen: </span><strong style={{ color: 'var(--success)' }}>
                      {dish.price_bs > 0 ? (((dish.price_bs - dish.cost_bs) / dish.price_bs) * 100).toFixed(0) : 0}%
                    </strong></span>
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddIng(true)}>+ Ingrediente</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(dish)}>
                      {dish.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>

                {dish.ingredients.length === 0 ? (
                  <p className="text-sm text-muted">Sin ingredientes en receta.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ingrediente</th>
                          <th style={{ textAlign: 'right' }}>Cantidad / porción</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {dish.ingredients.map(ing => (
                          <tr key={ing.id}>
                            <td style={{ fontWeight: 600 }}>{ing.products?.name || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              {Number(ing.quantity_per_portion).toFixed(3)} {ing.products?.unit || ''}
                            </td>
                            <td>
                              <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeIngredient(ing.id)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal: Nuevo plato */}
      {showAddDish && (
        <div className="modal-overlay" onClick={() => setShowAddDish(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo plato / bebida</span>
              <button className="btn btn-sm" onClick={() => setShowAddDish(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-control" value={newDish.name} onChange={e => setNewDish(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={newDish.category} onChange={e => setNewDish(p => ({ ...p, category: e.target.value }))}>
                  {Object.entries(DISH_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Precio Bs</label>
                  <input type="number" className="form-control" value={newDish.price_bs} onChange={e => setNewDish(p => ({ ...p, price_bs: e.target.value }))} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio $</label>
                  <input type="number" className="form-control" value={newDish.price_usd} onChange={e => setNewDish(p => ({ ...p, price_usd: e.target.value }))} step="0.001" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo Bs</label>
                  <input type="number" className="form-control" value={newDish.cost_bs} onChange={e => setNewDish(p => ({ ...p, cost_bs: e.target.value }))} step="0.01" min="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddDish(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={addDish} disabled={saving || !newDish.name}>
                {saving ? '...' : 'Crear plato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar ingrediente */}
      {showAddIng && selectedDish && (
        <div className="modal-overlay" onClick={() => setShowAddIng(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Ingrediente — {selectedDish.name}</span>
              <button className="btn btn-sm" onClick={() => setShowAddIng(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Producto / Ingrediente *</label>
                <select className="form-control" value={newIng.product_id} onChange={e => setNewIng(p => ({ ...p, product_id: e.target.value }))}>
                  <option value="">-- Seleccionar --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cantidad por porción *</label>
                <input
                  type="number"
                  className="form-control"
                  value={newIng.quantity_per_portion}
                  onChange={e => setNewIng(p => ({ ...p, quantity_per_portion: e.target.value }))}
                  step="0.001"
                  min="0"
                  placeholder="0.250"
                />
                {newIng.product_id && (
                  <span className="text-xs text-muted mt-1">
                    En {products.find(p => p.id === newIng.product_id)?.unit || 'unidades'}
                  </span>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddIng(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={addIngredient}
                disabled={saving || !newIng.product_id || !newIng.quantity_per_portion}
              >
                {saving ? '...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
