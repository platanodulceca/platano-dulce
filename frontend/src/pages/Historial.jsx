import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtBs, fmtUsd, fmtDate, PAYMENT_LABELS, calcTotals } from '../utils/helpers'

export default function Historial() {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/caja/historial?limit=60')
      setHistorial(res.data.registros || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📅 Historial de Caja</h1>
        <span className="text-sm text-muted">{historial.length} registros</span>
      </div>

      {historial.length === 0 ? (
        <div className="empty-state"><div className="icon">📅</div><p>No hay registros cerrados aún</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {historial.map(reg => {
            const tasa = Number(reg.tasa_bcv) || 1
            const { totalBs, totalUsd } = calcTotals(reg.caja_pagos, tasa)
            const isOpen      = expanded === reg.id
            const itemsCount  = reg.venta_items?.reduce((s, i) => s + Number(i.cantidad), 0) || 0

            return (
              <div key={reg.id} className="card">
                <div
                  style={{ padding: '.9rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.75rem' }}
                  onClick={() => setExpanded(isOpen ? null : reg.id)}
                >
                  <div style={{ width: 44, height: 44, background: 'var(--cream)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '1.3rem' }}>📅</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{fmtDate(reg.fecha)}</div>
                    <div className="text-xs text-muted">{itemsCount} ítems · Tasa Bs.{tasa}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--orange)' }}>{fmtBs(totalBs)}</div>
                    <div className="text-xs" style={{ color: 'var(--success)' }}>{fmtUsd(totalUsd)}</div>
                  </div>
                  <span style={{ color: 'var(--gray-500)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--gray-100)', padding: '1rem' }}>
                    <p style={{ fontWeight: 700, marginBottom: '.6rem', fontSize: '.9rem' }}>💳 Métodos de pago</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem .75rem', marginBottom: '1rem' }}>
                      {reg.caja_pagos?.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem' }}>
                          <span className="text-muted">{PAYMENT_LABELS[p.metodo] || p.metodo}</span>
                          <strong>
                            {p.moneda === 'usd'
                              ? `$ ${Number(p.monto).toFixed(2)}`
                              : `Bs. ${Number(p.monto).toFixed(2)}`}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {reg.venta_items?.length > 0 && (
                      <>
                        <p style={{ fontWeight: 700, marginBottom: '.6rem', fontSize: '.9rem' }}>🍽️ Ítems vendidos</p>
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Ítem</th>
                                <th style={{ textAlign: 'center' }}>Cant</th>
                                <th style={{ textAlign: 'right' }}>Precio $</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reg.venta_items.map(item => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                                  <td style={{ textAlign: 'right' }}>{fmtUsd(item.precio)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

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
