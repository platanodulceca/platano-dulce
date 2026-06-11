import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const fmtFecha = (str) => {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
}

export default function Compras() {
  const [lista, setLista]           = useState(null)
  const [semana, setSemana]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/compras/actual')
      setLista(res.data.lista || null)
      setSemana(res.data.semana || '')
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generar = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/compras/generar')
      setLista(res.data.lista || null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al generar')
    }
    setGenerating(false)
  }

  const toggleComprado = async (item) => {
    try {
      const res = await api.put(`/compras/items/${item.id}`, { comprado: !item.comprado })
      setLista(l => ({
        ...l,
        listas_compras_items: l.listas_compras_items.map(i =>
          i.id === item.id ? res.data.item : i
        )
      }))
    } catch {}
  }

  const items       = lista?.listas_compras_items || []
  const comprados   = items.filter(i => i.comprado).length
  const progress    = items.length > 0 ? Math.round((comprados / items.length) * 100) : 0

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛒 Lista de Compras</h1>
          {semana && <p className="text-sm text-muted">Semana del {fmtFecha(semana)}</p>}
        </div>
        <button className="btn btn-primary btn-sm" onClick={generar} disabled={generating}>
          {generating ? '...' : lista ? '🔄 Regenerar' : '⚡ Generar'}
        </button>
      </div>

      {!lista ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🛒</div>
            <p>No hay lista para esta semana</p>
            <button className="btn btn-primary mt-4" onClick={generar} disabled={generating}>
              {generating ? 'Generando...' : 'Generar lista automáticamente'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body" style={{ padding: '.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <span className="text-sm fw-600">Progreso de compras</span>
                <span className="text-sm fw-bold text-orange">{comprados}/{items.length} ítems</span>
              </div>
              <div style={{ background: 'var(--gray-100)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: progress === 100 ? 'var(--success)' : 'var(--orange)',
                  borderRadius: 8, transition: 'width .3s ease'
                }} />
              </div>
              {progress === 100 && <p className="text-sm text-success mt-1 fw-600">✅ ¡Lista completa!</p>}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="card">
              <div className="empty-state"><div className="icon">✅</div><p>Sin ítems bajo el mínimo esta semana</p></div>
            </div>
          ) : (
            <div className="card mb-4">
              <div className="card-header">
                <span>🛍️ Ítems para comprar</span>
                <span className="text-sm text-muted">{comprados}/{items.length}</span>
              </div>
              <div style={{ padding: '.5rem 0' }}>
                {[...items.filter(i => !i.comprado), ...items.filter(i => i.comprado)].map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                    padding: '.65rem 1rem', borderBottom: '1px solid var(--gray-100)',
                    opacity: item.comprado ? .55 : 1, cursor: 'pointer',
                  }} onClick={() => toggleComprado(item)}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${item.comprado ? 'var(--success)' : 'var(--gray-300)'}`,
                      background: item.comprado ? 'var(--success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '.8rem', transition: 'all .15s'
                    }}>
                      {item.comprado && '✓'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        textDecoration: item.comprado ? 'line-through' : 'none',
                        color: item.comprado ? 'var(--gray-500)' : 'var(--dark)',
                      }}>
                        {item.nombre}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--orange)' }}>
                        {Number(item.cantidad_ajustada ?? item.cantidad_sugerida).toFixed(2)} {item.unidad}
                      </div>
                      {item.total > 0 && (
                        <div className="text-xs text-muted">
                          ~Bs. {Number(item.total).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.some(i => i.total > 0) && (
            <div className="card mb-4">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-700">Total estimado</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--orange)' }}>
                  Bs. {items.reduce((s, i) => s + Number(i.total || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
