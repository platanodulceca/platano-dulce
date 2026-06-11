import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { estado } = req.query
  let q = supabase.from('cuentas_cobrar').select('*').order('fecha', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })
  res.json({ cuentas: data })
})

router.post('/', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { cliente, descripcion, monto_usd, monto_bs, fecha, observacion } = req.body
  const { data, error } = await supabase
    .from('cuentas_cobrar')
    .insert({
      fecha:       fecha || new Date().toISOString().split('T')[0],
      cliente,
      descripcion,
      monto_usd:   parseFloat(monto_usd) || 0,
      monto_bs:    parseFloat(monto_bs)  || 0,
      estado:      'pendiente',
      observacion: observacion || null,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ cuenta: data })
})

router.put('/:id', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { cliente, descripcion, monto_usd, monto_bs, estado, observacion } = req.body
  const updates = {}
  if (cliente     !== undefined) updates.cliente     = cliente
  if (descripcion !== undefined) updates.descripcion = descripcion
  if (monto_usd   !== undefined) updates.monto_usd   = parseFloat(monto_usd) || 0
  if (monto_bs    !== undefined) updates.monto_bs    = parseFloat(monto_bs)  || 0
  if (estado      !== undefined) updates.estado      = estado
  if (observacion !== undefined) updates.observacion = observacion
  const { data, error } = await supabase
    .from('cuentas_cobrar').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ cuenta: data })
})

router.put('/:id/pagar', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { metodo_pago, observacion } = req.body
  const { data, error } = await supabase
    .from('cuentas_cobrar')
    .update({
      estado:      'cobrado',
      metodo_pago: metodo_pago || null,
      fecha_pago:  new Date().toISOString().split('T')[0],
      observacion: observacion || null,
    })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ cuenta: data })
})

router.delete('/:id', requireRoles('admin', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('cuentas_cobrar').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Cuenta eliminada' })
})

export default router
