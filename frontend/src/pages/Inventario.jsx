import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtDate, CATEGORY_LABELS } from '../utils/helpers'

const CATEGORY_ICONS = {
  viveres_barra_bebidas:  '🛒',
  frutas_vegetales:       '🥬',
  carniceria_frigorifico: '🥩',
}

const getEstado = (p) => {
  const fisica = p.cantidad_fisica
  if (fisica === null || fisica === undefined) return 'sin_conteo'
  if (fisica <= 0)       return 'agotado'
  if (p.bajo_minimo)     return 'reponer'
  return 'ok'
}

export default function Inventario() {
  const [inventario, setInventario] = useState([])
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [filterCat, setFilterCat]   = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [editConteos, setEditConteos]   = useState({})
  const [showAdd, setShowAdd]           = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '', categoria: 'viveres_barra_bebidas', unidad: 'kg', stock_minimo: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/inventario/conteo/hoy')
      const items = res.data.inventario || []
      setInventario(items)
      setFecha(res.data.fecha || new Date().toISOString().split('T')[0])
      const conteos = {}
      items.forEach(p => { conteos[p.id] = p.cantidad_fisica?.toString() ?? '' })
      setEditConteos(conteos)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const guardarConteo = async (productoId) => {
    setSaving(productoId)
    const p = inventario.find(x => x.id === productoId)
    const cantFisica = parseFloat(editConteos[productoId]) || 0
    const cantTeorica = p?.conteo_hoy?.cantidad_teorica ?? 0
    try {
      await api.post('/inventario/conteo', {
        inventario_id:    productoId,
        cantidad_fisica:  cantFisica,
        cantidad_teorica: cantTeorica,
        diferencia:       cantFisica - cantTeorica,
      })
      setInventario(inv => inv.map(x => {
        if (x.id !== productoId) return x
        const bajo_minimo = cantFisica < x.stock_minimo
        return { ...x, cantidad_fisica: cantFisica, bajo_minimo }
      }))
    } catch {}
    setSaving(null)
  }

  const agregarProducto = async () => {
    try {
      await api.post('/inventario', {
        nombre:      nuevoProducto.nombre,
        categoria:   nuevoProducto.categoria,
        unidad:      nuevoProducto.unidad,
        stock_minimo: parseFloat(nuevoProducto.stock_minimo) || 0,
      })
      setShowAdd(false)
      setNuevoProducto({ nombre: '', categoria: 'viveres_barra_bebidas', unidad: 'kg', stock_minimo: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al agregar')
    }
  }

  const filtrado = inventario.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat    = filterCat    === 'all' || p.categoria === filterCat
    const matchEstado = filterEstado === 'all' || getEstado(p) === filterEstado
    return matchBusqueda && matchCat && matchEstado
  })

  const grouped = Object.keys(CATEGORY_LABELS).map(cat => ({
    cat,
    items: filtrado.filter(p => p.categoria === cat)
  })).filter(g => g.items.length > 0)

  const counts = { ok: 0, reponer: 0, agotado: 0 }
  inventario.forEach(p => {
    const e = getEstado(p)
    if (counts[e] !== undefined) counts[e]++
  })

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventario</h1>
          <p className="text-sm text-muted">{fmtDate(fecha)}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Producto</button>
      </div>

      <div className="grid-3 mb-4">
        {[
          { key: 'ok',      label: 'OK',      color: 'var(--success)', emoji: '✅' },
          { key: 'reponer', label: 'REPONER', color: 'var(--warning)', emoji: '⚠️' },
          { key: 'agotado', label: 'AGOTADO', color: 'var(--coral)',   emoji: '🔴' },
        ].map(s => (
          <div key={s.key} className="stat-card"
            style={{ borderColor: s.color, cursor: 'pointer', opacity: filterEstado === s.key ? 1 : .7 }}
            onClick={() => setFilterEstado(f => f === s.key ? 'all' : s.key)}>
            <div className="stat-label">{s.emoji} {s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: '2rem' }}>{counts[s.key]}</div>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <input type="search" className="form-control" placeholder="Buscar producto..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          <select className="form-control" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ flex: '0 0 auto' }}>
            <option value="all">Todas las categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

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
                        <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                        <div className="text-xs text-muted">Mín: {p.stock_minimo} {p.unidad}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" step="0.01" min="0"
                          value={editConteos[p.id] ?? ''}
                          onChange={e => setEditConteos(c => ({ ...c, [p.id]: e.target.value }))}
                          style={{ width: 80, textAlign: 'right', border: '2px solid var(--gray-300)', borderRadius: 6, padding: '.35rem .5rem', fontSize: '.9rem' }}
                        />
                        <span className="text-xs text-muted" style={{ marginLeft: 4 }}>{p.unidad}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(p.conteo_hoy?.cantidad_teorica ?? 0).toFixed(2)} {p.unidad}
                      </td>
                      <td style={{ textAlign: 'right', color: Number(p.conteo_hoy?.diferencia ?? 0) < 0 ? 'var(--coral)' : 'inherit', fontWeight: 600 }}>
                        {Number(p.conteo_hoy?.diferencia ?? 0) >= 0 ? '+' : ''}{Number(p.conteo_hoy?.diferencia ?? 0).toFixed(2)}
                      </td>
                      <td><Semaforo estado={getEstado(p)} /></td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => guardarConteo(p.id)} disabled={saving === p.id}>
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
                <input className="form-control" value={nuevoProducto.nombre}
                  onChange={e => setNuevoProducto(p => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-control" value={nuevoProducto.categoria}
                  onChange={e => setNuevoProducto(p => ({ ...p, categoria: e.target.value }))}>
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Unidad</label>
                  <select className="form-control" value={nuevoProducto.unidad}
                    onChange={e => setNuevoProducto(p => ({ ...p, unidad: e.target.value }))}>
                    {['kg','lt','g','ml','und','mazo','caja','bolsa','lata'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input type="number" className="form-control" value={nuevoProducto.stock_minimo}
                    onChange={e => setNuevoProducto(p => ({ ...p, stock_minimo: e.target.value }))}
                    step="0.01" min="0" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarProducto} disabled={!nuevoProducto.nombre}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Semaforo({ estado }) {
  const labels = { ok: 'OK', reponer: 'REPONER', agotado: 'AGOTADO', sin_conteo: 'S/C' }
  return (
    <div className={`semaforo ${estado}`}>
      <div className="semaforo-dot" />
      {labels[estado] || estado}
    </div>
  )
}
