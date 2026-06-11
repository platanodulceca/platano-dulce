import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtUsd, DISH_CATEGORY_LABELS } from '../utils/helpers'

export default function Recetario() {
  const [platos, setPlatos]         = useState([])
  const [inventario, setInventario] = useState([])
  const [loading, setLoading]       = useState(true)
  const [expandido, setExpandido]   = useState(null)
  const [ingredientes, setIngredientes] = useState({})
  const [busqueda, setBusqueda]     = useState('')
  const [filterCat, setFilterCat]   = useState('all')
  const [showAddPlato, setShowAddPlato] = useState(false)
  const [showAddIng, setShowAddIng]     = useState(false)
  const [nuevoPlato, setNuevoPlato] = useState({ nombre: '', categoria: 'plato', precio: '', costo: '' })
  const [nuevoIng, setNuevoIng]     = useState({ inventario_id: '', ingrediente: '', cantidad: '', unidad: 'kg' })
  const [saving, setSaving]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, iRes] = await Promise.all([
        api.get('/recetario/todos'),
        api.get('/inventario'),
      ])
      setPlatos(rRes.data.items || [])
      setInventario(iRes.data.inventario || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cargarIngredientes = async (platoId) => {
    if (ingredientes[platoId]) return
    try {
      const res = await api.get(`/recetario/${platoId}/ingredientes`)
      setIngredientes(prev => ({ ...prev, [platoId]: res.data.ingredientes || [] }))
    } catch {
      setIngredientes(prev => ({ ...prev, [platoId]: [] }))
    }
  }

  const toggleExpand = async (plato) => {
    if (expandido?.id === plato.id) {
      setExpandido(null)
    } else {
      setExpandido(plato)
      await cargarIngredientes(plato.id)
    }
  }

  const agregarPlato = async () => {
    setSaving(true)
    try {
      await api.post('/recetario', {
        nombre:    nuevoPlato.nombre,
        categoria: nuevoPlato.categoria,
        precio:    parseFloat(nuevoPlato.precio) || 0,
        costo:     parseFloat(nuevoPlato.costo)  || 0,
      })
      setShowAddPlato(false)
      setNuevoPlato({ nombre: '', categoria: 'plato', precio: '', costo: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const agregarIngrediente = async () => {
    if (!expandido || !nuevoIng.inventario_id || !nuevoIng.cantidad) return
    setSaving(true)
    try {
      const res = await api.post(`/recetario/${expandido.id}/ingredientes`, {
        inventario_id: nuevoIng.inventario_id,
        ingrediente:   nuevoIng.ingrediente || inventario.find(p => p.id === nuevoIng.inventario_id)?.nombre || '',
        cantidad:      parseFloat(nuevoIng.cantidad),
        unidad:        nuevoIng.unidad,
      })
      setIngredientes(prev => ({
        ...prev,
        [expandido.id]: [...(prev[expandido.id] || []), res.data.ingrediente]
      }))
      setNuevoIng({ inventario_id: '', ingrediente: '', cantidad: '', unidad: 'kg' })
      setShowAddIng(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const eliminarIngrediente = async (platoId, ingId) => {
    try {
      await api.delete(`/recetario/${platoId}/ingredientes/${ingId}`)
      setIngredientes(prev => ({
        ...prev,
        [platoId]: (prev[platoId] || []).filter(i => i.id !== ingId)
      }))
    } catch {}
  }

  const toggleActivo = async (plato) => {
    try {
      await api.put(`/recetario/${plato.id}`, { activo: !plato.activo })
      setPlatos(ps => ps.map(p => p.id === plato.id ? { ...p, activo: !p.activo } : p))
    } catch {}
  }

  const filtrado = platos.filter(d => {
    const matchBusqueda = d.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat      = filterCat === 'all' || d.categoria === filterCat
    return matchBusqueda && matchCat
  })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 Recetario</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddPlato(true)}>+ Plato</button>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input type="search" className="form-control" placeholder="Buscar plato..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: '0 0 auto' }}>
            <option value="all">Todas las categorías</option>
            {Object.entries(DISH_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        {filtrado.length === 0 && (
          <div className="empty-state"><div className="icon">📋</div><p>No hay platos registrados</p></div>
        )}
        {filtrado.map(plato => {
          const ings     = ingredientes[plato.id]
          const abierto  = expandido?.id === plato.id
          return (
            <div key={plato.id} className="card" style={{ opacity: plato.activo ? 1 : .6 }}>
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => toggleExpand(plato)}>
                <div>
                  <span style={{ fontWeight: 700 }}>{plato.nombre}</span>
                  <span className="badge" style={{ marginLeft: '.5rem', background: 'var(--cream)', color: 'var(--brown)', fontSize: '.68rem' }}>
                    {DISH_CATEGORY_LABELS[plato.categoria] || plato.categoria}
                  </span>
                  {!plato.activo && <span className="badge" style={{ marginLeft: '.4rem', background: '#eee', color: '#888' }}>Inactivo</span>}
                </div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtUsd(plato.precio)}</span>
                  <span style={{ color: 'var(--gray-500)' }}>{abierto ? '▲' : '▼'}</span>
                </div>
              </div>

              {abierto && (
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span className="text-sm"><span className="text-muted">Precio: </span><strong>{fmtUsd(plato.precio)}</strong></span>
                      <span className="text-sm"><span className="text-muted">Costo: </span><strong style={{ color: 'var(--coral)' }}>{fmtUsd(plato.costo)}</strong></span>
                      <span className="text-sm"><span className="text-muted">Margen: </span><strong style={{ color: 'var(--success)' }}>
                        {plato.precio > 0 ? (((plato.precio - plato.costo) / plato.precio) * 100).toFixed(0) : 0}%
                      </strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowAddIng(true)}>+ Ingrediente</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleActivo(plato)}>
                        {plato.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>

                  {!ings ? (
                    <p className="text-sm text-muted">Cargando ingredientes...</p>
                  ) : ings.length === 0 ? (
                    <p className="text-sm text-muted">Sin ingredientes en receta.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Ingrediente</th>
                            <th style={{ textAlign: 'right' }}>Cantidad</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {ings.map(ing => (
                            <tr key={ing.id}>
                              <td style={{ fontWeight: 600 }}>{ing.ingrediente || ing.inventario?.nombre || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                {Number(ing.cantidad).toFixed(3)} {ing.unidad || ing.inventario?.unidad || ''}
                              </td>
                              <td>
                                <button className="btn btn-danger btn-sm btn-icon"
                                  onClick={() => eliminarIngrediente(plato.id, ing.id)}>✕</button>
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
          )
        })}
      </div>

      {showAddPlato && (
        <div className="modal-overlay" onClick={() => setShowAddPlato(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo plato / bebida</span>
              <button className="btn btn-sm" onClick={() => setShowAddPlato(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-control" value={nuevoPlato.nombre}
                  onChange={e => setNuevoPlato(p => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={nuevoPlato.categoria}
                  onChange={e => setNuevoPlato(p => ({ ...p, categoria: e.target.value }))}>
                  {Object.entries(DISH_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Precio $</label>
                  <input type="number" className="form-control" value={nuevoPlato.precio}
                    onChange={e => setNuevoPlato(p => ({ ...p, precio: e.target.value }))}
                    step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo $</label>
                  <input type="number" className="form-control" value={nuevoPlato.costo}
                    onChange={e => setNuevoPlato(p => ({ ...p, costo: e.target.value }))}
                    step="0.01" min="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddPlato(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarPlato} disabled={saving || !nuevoPlato.nombre}>
                {saving ? '...' : 'Crear plato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddIng && expandido && (
        <div className="modal-overlay" onClick={() => setShowAddIng(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Ingrediente — {expandido.nombre}</span>
              <button className="btn btn-sm" onClick={() => setShowAddIng(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Producto del inventario *</label>
                <select className="form-control" value={nuevoIng.inventario_id}
                  onChange={e => {
                    const prod = inventario.find(p => p.id === e.target.value)
                    setNuevoIng(p => ({ ...p, inventario_id: e.target.value, unidad: prod?.unidad || 'kg', ingrediente: prod?.nombre || '' }))
                  }}>
                  <option value="">-- Seleccionar --</option>
                  {inventario.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Cantidad *</label>
                  <input type="number" className="form-control" value={nuevoIng.cantidad}
                    onChange={e => setNuevoIng(p => ({ ...p, cantidad: e.target.value }))}
                    step="0.001" min="0" placeholder="0.250" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-control" value={nuevoIng.unidad}
                    onChange={e => setNuevoIng(p => ({ ...p, unidad: e.target.value }))}>
                    {['kg','lt','g','ml','und','mazo','caja','bolsa','lata'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddIng(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarIngrediente}
                disabled={saving || !nuevoIng.inventario_id || !nuevoIng.cantidad}>
                {saving ? '...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
