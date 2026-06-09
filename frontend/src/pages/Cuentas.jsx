import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { fmtBs, fmtDate } from '../utils/helpers'

export default function Cuentas() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newAccount, setNewAccount] = useState({
    client_name: '', client_phone: '', amount_bs: '', amount_usd: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '', notes: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/cuentas')
      setAccounts(res.data.accounts || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addAccount = async () => {
    if (!newAccount.client_name || !newAccount.amount_bs) return
    setSaving(true)
    try {
      const res = await api.post('/cuentas', {
        ...newAccount,
        amount_bs: parseFloat(newAccount.amount_bs) || 0,
        amount_usd: parseFloat(newAccount.amount_usd) || 0,
      })
      setAccounts(a => [res.data.account, ...a])
      setShowAdd(false)
      setNewAccount({ client_name: '', client_phone: '', amount_bs: '', amount_usd: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '' })
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
    setSaving(false)
  }

  const markPaid = async (account) => {
    if (!confirm(`¿Marcar como pagado a ${account.client_name}?`)) return
    try {
      const res = await api.put(`/cuentas/${account.id}`, { status: 'pagado' })
      setAccounts(a => a.map(acc => acc.id === account.id ? res.data.account : acc))
    } catch {}
  }

  const deleteAccount = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await api.delete(`/cuentas/${id}`)
      setAccounts(a => a.filter(acc => acc.id !== id))
    } catch {}
  }

  const filtered = accounts.filter(a => {
    const matchSearch = a.client_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    return matchSearch && matchStatus
  })

  const totals = {
    pendiente: accounts.filter(a => a.status === 'pendiente').reduce((s, a) => s + Number(a.amount_bs), 0),
    vencido:   accounts.filter(a => a.status === 'vencido').reduce((s, a) => s + Number(a.amount_bs), 0),
    pagado:    accounts.filter(a => a.status === 'pagado').reduce((s, a) => s + Number(a.amount_bs), 0),
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">💳 Cuentas por Cobrar</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Nuevo fiado</button>
      </div>

      {/* Resumen */}
      <div className="grid-3 mb-4">
        <div className="stat-card" style={{ borderColor: 'var(--warning)', cursor: 'pointer' }} onClick={() => setFilterStatus(f => f === 'pendiente' ? 'all' : 'pendiente')}>
          <div className="stat-label">⏳ Pendiente</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--warning)' }}>{fmtBs(totals.pendiente)}</div>
          <div className="stat-sub">{accounts.filter(a => a.status === 'pendiente').length} cuentas</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--coral)', cursor: 'pointer' }} onClick={() => setFilterStatus(f => f === 'vencido' ? 'all' : 'vencido')}>
          <div className="stat-label">🔴 Vencido</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--coral)' }}>{fmtBs(totals.vencido)}</div>
          <div className="stat-sub">{accounts.filter(a => a.status === 'vencido').length} cuentas</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--success)', cursor: 'pointer' }} onClick={() => setFilterStatus(f => f === 'pagado' ? 'all' : 'pagado')}>
          <div className="stat-label">✅ Cobrado</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{fmtBs(totals.pagado)}</div>
          <div className="stat-sub">{accounts.filter(a => a.status === 'pagado').length} cuentas</div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '.75rem' }}>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">💳</div><p>No hay cuentas{filterStatus !== 'all' ? ' con este estado' : ''}</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtered.map(acc => (
            <div key={acc.id} className="card">
              <div style={{ padding: '.9rem 1rem', display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'var(--cream)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0
                }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{acc.client_name}</div>
                      {acc.client_phone && <div className="text-xs text-muted">{acc.client_phone}</div>}
                    </div>
                    <span className={`badge badge-${acc.status}`}>{acc.status}</span>
                  </div>
                  <div style={{ marginTop: '.35rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--orange)', fontSize: '1.05rem' }}>{fmtBs(acc.amount_bs)}</span>
                    <span className="text-sm text-muted">Fecha: {fmtDate(acc.date)}</span>
                    {acc.due_date && <span className="text-sm text-muted">Vence: {fmtDate(acc.due_date)}</span>}
                  </div>
                  {acc.notes && <div className="text-sm text-muted mt-1">{acc.notes}</div>}
                  {acc.status === 'pagado' && acc.paid_date && (
                    <div className="text-xs text-success mt-1">Pagado el {fmtDate(acc.paid_date)}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', flexShrink: 0 }}>
                  {acc.status !== 'pagado' && (
                    <button className="btn btn-success btn-sm" onClick={() => markPaid(acc)}>✓ Cobrar</button>
                  )}
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}
                    onClick={() => deleteAccount(acc.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nueva cuenta */}
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
                <input className="form-control" value={newAccount.client_name} onChange={e => setNewAccount(p => ({ ...p, client_name: e.target.value }))} placeholder="Nombre del cliente" />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-control" value={newAccount.client_phone} onChange={e => setNewAccount(p => ({ ...p, client_phone: e.target.value }))} placeholder="0412-..." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Monto Bs *</label>
                  <input type="number" className="form-control" value={newAccount.amount_bs} onChange={e => setNewAccount(p => ({ ...p, amount_bs: e.target.value }))} step="0.01" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Monto $</label>
                  <input type="number" className="form-control" value={newAccount.amount_usd} onChange={e => setNewAccount(p => ({ ...p, amount_usd: e.target.value }))} step="0.001" min="0" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-control" value={newAccount.date} onChange={e => setNewAccount(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha vencimiento</label>
                  <input type="date" className="form-control" value={newAccount.due_date} onChange={e => setNewAccount(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-control" rows={2} value={newAccount.notes} onChange={e => setNewAccount(p => ({ ...p, notes: e.target.value }))} placeholder="Descripción del fiado..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={addAccount} disabled={saving || !newAccount.client_name || !newAccount.amount_bs}>
                {saving ? '...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
