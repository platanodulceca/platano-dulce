import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtBs, fmtUsd, fmtDate, PAYMENT_LABELS, PAYMENT_CURRENCY, calcTotals } from '../utils/helpers'

export default function Historial() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/historial?limit=60')
      setHistory(res.data.history || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📅 Historial de Caja</h1>
        <span className="text-sm text-muted">{history.length} registros</span>
      </div>

      {history.length === 0 ? (
        <div className="empty-state"><div className="icon">📅</div><p>No hay registros cerrados aún</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {history.map(reg => {
            const rate = Number(reg.exchange_rate_bcv) || 1
            const { totalBs, totalUsd } = calcTotals(reg.daily_payments, rate)
            const isOpen = expanded === reg.id
            const itemsCount = reg.sales_items?.reduce((s, i) => s + i.quantity, 0) || 0

            return (
              <div key={reg.id} className="card">
                <div
                  style={{
                    padding: '.9rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '.75rem',
                  }}
                  onClick={() => setExpanded(isOpen ? null : reg.id)}
                >
                  <div style={{
                    width: 44, height: 44,
                    background: 'var(--cream)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>📅</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{fmtDate(reg.date)}</div>
                    <div className="text-xs text-muted">{itemsCount} ítems · Tasa Bs.{rate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtBs(totalBs)}</div>
                    <div className="text-xs" style={{ color: 'var(--success)' }}>{fmtUsd(totalUsd)}</div>
                  </div>
                  <span style={{ color: 'var(--gray-500)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', padding: '1rem' }}>
                    {/* Pagos */}
                    <p style={{ fontWeight: 700, marginBottom: '.6rem', fontSize: '.9rem' }}>💳 Métodos de pago</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem .75rem', marginBottom: '1rem' }}>
                      {reg.daily_payments?.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                          <span className="text-muted">{PAYMENT_LABELS[p.method]}</span>
                          <strong>
                            {PAYMENT_CURRENCY[p.method] === 'usd'
                              ? `$ ${Number(p.amount).toFixed(2)}`
                              : `Bs. ${Number(p.amount).toFixed(2)}`}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {/* Artículos */}
                    {reg.sales_items?.length > 0 && (
                      <>
                        <p style={{ fontWeight: 700, marginBottom: '.6rem', fontSize: '.9rem' }}>🍽️ Ítems vendidos</p>
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Ítem</th>
                                <th style={{ textAlign: 'center' }}>Cant</th>
                                <th style={{ textAlign: 'right' }}>Total Bs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reg.sales_items.map(item => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 600 }}>{item.dish_name}</td>
                                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                  <td style={{ textAlign: 'right' }}>{fmtBs(Number(item.price_bs) * item.quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Totales */}
                    <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '.75rem 1rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                        <span className="fw-600">Total Bs</span>
                        <span style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtBs(totalBs)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="fw-600">Total $</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtUsd(totalUsd)}</span>
                      </div>
                    </div>

                    {reg.notes && (
                      <div className="alert alert-info" style={{ marginTop: '.75rem' }}>
                        📝 {reg.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
