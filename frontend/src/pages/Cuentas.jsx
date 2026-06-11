import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtBs, fmtUsd, fmtDate } from '../utils/helpers'

const ESTADO_LABELS = { pendiente: 'Pendiente', cobrado: 'Cobrado' }
const ESTADO_COLORS = { pendiente: 'var(--warning)', cobrado: 'var(--success)' }

export default function Cuentas() {
  const [cuentas, setCuentas]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterEstado, setFilterEstado] = useState('all')
  const [busqueda, setBusqueda]       = useState('')
  const [showAdd, setShowAdd]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [nuevaCuenta, setNuevaCuenta] = useState({
    cliente: '', descripcion: '', monto_bs: '', monto_usd: '',
    fecha: new Date().toISOString().split('T')[0], observacion: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/cuentas')
      setCuentas(res.data.cuentas || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const agregarCuenta = async () => {
    if (!nuevaCuenta.cliente || !nuevaCuenta.monto_bs) return
    setSaving(true)
    try {
      const res = await api.post('/cuentas', {
        cliente:     nuevaCuenta.cliente,
        descripcion: nuevaCuenta.descripcion || null,
        monto_bs:    parseFloat(nuevaCuenta.monto_bs)  || 0,
        monto_usd:   parseFloat(nuevaCuenta.monto_usd) || 0,
        fecha:       nuevaCuenta.fecha,
        observacion: nuevaCuenta.observacion || null,
      })
      setCuentas(c => [res.data.cuenta, ...c])
      setShowAdd(false)
      setNuevaCuenta({ cliente: '', descripcion: '', monto_bs: '', monto_usd: '', fecha: new Date().toISOString().split('T')[0], observacion: '' })
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const marcarCobrado = async (cuenta) => {
    if (!confirm(`¿Marcar como cobrado a ${cuenta.cliente}?`)) return
    try {
      const res = await api.put(`/cuentas/${cuenta.id}/pagar`, {})
      setCuentas(c => c.map(x => x.id === cuenta.id ? res.data.cuenta : x))
    } catch {}
  }

  const eliminarCuenta = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/cuentas/${id}`)
      setCuentas(c => c.filter(x => x.id !== id))
    } catch {}
  }

  const filtrado = cuentas.filter(c => {
    const matchBusqueda = (c.cliente || '').toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado   = filterEstado === 'all' || c.estado === filterEstado
    return matchBusqueda && matchEstado
  })

  const totales = {
    pendiente: cuentas.filter(c => c.estado === 'pendiente').reduce((s, c) => s + Number(c.monto_bs), 0),
    cobrado:   cuentas.filter(c => c.estado === 'cobrado').reduce((s, c) => s + Number(c.monto_bs), 0),
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">💳 Cuentas por Cobrar</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuevo fiado</button>
      </div>

      <div className="grid-2 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--warning)', cursor: 'pointer' }}
          onClick={() => setFilterEstado(f => f === 'pendiente' ? 'all' : 'pendiente')}>
          <div className="stat-label">⏳ Pendiente</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--warning)' }}>{fmtBs(totales.pendiente)}</div>
          <div className="stat-sub">{cuentas.filter(c => c.estado === 'pendiente').length} cuentas</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)', cursor: 'pointer' }}
          onClick={() => setFilterEstado(f => f === 'cobrado' ? 'all' : 'cobrado')}>
          <div className="stat-label">✅ Cobrado</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{fmtBs(totales.cobrado)}</div>
          <div className="stat-sub">{cuentas.filter(c => c.estado === 'cobrado').length} cuentas</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem' }}>
          <input type="search" className="form-control" placeholder="Buscar cliente..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {filtrado.length === 0 ? (
        <div className="empty-state"><div className="icon">💳</div><p>No hay cuentas{filterEstado !== 'all' ? ' con este estado' : ''}</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtrado.map(cuenta => (
            <div key={cuenta.id} className="card">
              <div style={{ padding: '.9rem 1rem', display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{cuenta.cliente}</div>
                      {cuenta.descripcion && <div className="text-xs text-muted">{cuenta.descripcion}</div>}
                    </div>
                    <span style={{ background: cuenta.estado === 'cobrado' ? 'var(--success)' : 'var(--warning)', color: 'white', borderRadius: 6, padding: '.15rem .5rem', fontSize: '.75rem', fontWeight: 700, flexShrink: 0 }}>
                      {ESTADO_LABELS[cuenta.estado] || cuenta.estado}
                    </span>
                  </div>
                  <div style={{ marginTop: '.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--orange)', fontSize: '1.05rem' }}>{fmtBs(cuenta.monto_bs)}</span>
                    {cuenta.monto_usd > 0 && <span style={{ fontWeight: 600, color: 'var(--success)' }}>{fmtUsd(cuenta.monto_usd)}</span>}
                    <span className="text-sm text-muted">Fecha: {fmtDate(cuenta.fecha)}</span>
                  </div>
                  {cuenta.observacion && <div className="text-sm text-muted mt-1">{cuenta.observacion}</div>}
                  {cuenta.estado === 'cobrado' && cuenta.fecha_pago && (
                    <div className="text-xs text-muted mt-1">Cobrado el {fmtDate(cuenta.fecha_pago)}{cuenta.metodo_pago ? ` · ${cuenta.metodo_pago}` : ''}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', flexShrink: 0 }}>
                  {cuenta.estado !== 'cobrado' && (
                    <button className="btn btn-success btn-sm" onClick={() => marcarCobrado(cuenta)}>✓ Cobrar</button>
                  )}
                  <button className="btn btn-sm" style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}
                    onClick={() => eliminarCuenta(cuenta.id)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nuevo crédito / fiado</span>
              <button className="btn btn-sm" onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <input className="form-control" value={nuevaCuenta.cliente}
                  onChange={e => setNuevaCuenta(p => ({ ...p, cliente: e.target.value }))}
                  placeholder="Nombre del cliente" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-control" value={nuevaCuenta.descripcion}
                  onChange={e => setNuevaCuenta(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="¿Qué consumió?" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Monto Bs *</label>
                  <input type="number" className="form-control" value={nuevaCuenta.monto_bs}
                    onChange={e => setNuevaCuenta(p => ({ ...p, monto_bs: e.target.value }))}
                    step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto $</label>
                  <input type="number" className="form-control" value={nuevaCuenta.monto_usd}
                    onChange={e => setNuevaCuenta(p => ({ ...p, monto_usd: e.target.value }))}
                    step="0.001" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input type="date" className="form-control" value={nuevaCuenta.fecha}
                  onChange={e => setNuevaCuenta(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Observación</label>
                <textarea className="form-control" rows={2} value={nuevaCuenta.observacion}
                  onChange={e => setNuevaCuenta(p => ({ ...p, observacion: e.target.value }))}
                  placeholder="Notas adicionales..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={agregarCuenta}
                disabled={saving || !nuevaCuenta.cliente || !nuevaCuenta.monto_bs}>
                {saving ? '...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
