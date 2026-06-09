import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { CATEGORY_LABELS } from '../utils/helpers'

const CAT_ICONS = {
  viveres_barra_bebidas:   '🛒',
  frutas_vegetales:        '🥬',
  carniceria_frigorifico:  '🥩',
}

export default function Compras() {
  const [list, setList] = useState(null)
  const [weekInfo, setWeekInfo] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/compras/current')
      setList(res.data.list)
      setWeekInfo({ week_start: res.data.week_start, week_end: res.data.week_end })
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/compras/generate')
      setList(res.data.list || null)
    } catch (err) {
      alert(err.response?.data?.error || 'Error al generar')
    }
    setGenerating(false)
  }

  const togglePurchased = async (item) => {
    try {
      const res = await api.put(`/compras/items/${item.id}`, { purchased: !item.purchased })
      setList(l => ({
        ...l,
        shopping_list_items: l.shopping_list_items.map(i =>
          i.id === item.id ? res.data.item : i
        )
      }))
    } catch {}
  }

  const fmtDate = (str) => {
    if (!str) return ''
    const d = new Date(str + 'T00:00:00')
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
  }

  const grouped = list
    ? Object.keys(CATEGORY_LABELS).map(cat => ({
        cat,
        items: list.shopping_list_items?.filter(i => i.category === cat) || []
      })).filter(g => g.items.length > 0)
    : []

  const totalPurchased = list?.shopping_list_items?.filter(i => i.purchased).length || 0
  const totalItems = list?.shopping_list_items?.length || 0
  const progress = totalItems > 0 ? Math.round((totalPurchased / totalItems) * 100) : 0

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛒 Lista de Compras</h1>
          <p className="text-sm text-muted">
            Semana: {fmtDate(weekInfo.week_start)} — {fmtDate(weekInfo.week_end)}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={generate}
          disabled={generating}
        >
          {generating ? '...' : list ? '🔄 Regenerar' : '⚡ Generar'}
        </button>
      </div>

      {!list ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🛒</div>
            <p>No hay lista para esta semana</p>
            <button className="btn btn-primary mt-4" onClick={generate} disabled={generating}>
              {generating ? 'Generando...' : 'Generar lista automáticamente'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="card mb-4">
            <div className="card-body" style={{ padding: '.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <span className="text-sm fw-600">Progreso de compras</span>
                <span className="text-sm fw-bold text-orange">{totalPurchased}/{totalItems} ítems</span>
              </div>
              <div style={{ background: 'var(--gray-100)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: progress === 100 ? 'var(--success)' : 'var(--orange)',
                  borderRadius: 8,
                  transition: 'width .3s ease'
                }} />
              </div>
              {progress === 100 && (
                <p className="text-sm text-success mt-1 fw-600">✅ ¡Lista completa!</p>
              )}
            </div>
          </div>

          {/* Secciones */}
          {grouped.map(({ cat, items }) => {
            const pendingItems = items.filter(i => !i.purchased)
            const doneItems = items.filter(i => i.purchased)

            return (
              <div key={cat} className="card mb-4">
                <div className="card-header">
                  <span>{CAT_ICONS[cat]} {CATEGORY_LABELS[cat]}</span>
                  <span className="text-sm text-muted">
                    {doneItems.length}/{items.length}
                  </span>
                </div>
                <div style={{ padding: '.5rem 0' }}>
                  {[...pendingItems, ...doneItems].map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '.75rem',
                        padding: '.65rem 1rem',
                        borderBottom: '1px solid var(--gray-100)',
                        opacity: item.purchased ? .55 : 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => togglePurchased(item)}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6,
                        border: `2px solid ${item.purchased ? 'var(--success)' : 'var(--gray-300)'}`,
                        background: item.purchased ? 'var(--success)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: 'white', fontSize: '.8rem',
                        transition: 'all .15s'
                      }}>
                        {item.purchased && '✓'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600,
                          textDecoration: item.purchased ? 'line-through' : 'none',
                          color: item.purchased ? 'var(--gray-500)' : 'var(--dark)',
                        }}>
                          {item.product_name}
                        </div>
                        {item.notes && <div className="text-xs text-muted">{item.notes}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--orange)' }}>
                          {Number(item.quantity_needed).toFixed(2)} {item.unit}
                        </div>
                        {item.estimated_cost > 0 && (
                          <div className="text-xs text-muted">
                            ~Bs. {Number(item.estimated_cost).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Total estimado */}
          {list.shopping_list_items?.some(i => i.estimated_cost > 0) && (
            <div className="card mb-4">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="fw-700">Total estimado</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--orange)' }}>
                  Bs. {list.shopping_list_items.reduce((s, i) => s + Number(i.estimated_cost || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
