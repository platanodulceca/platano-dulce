import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const PAYMENT_CURRENCIES = {
  efectivo_bs:   'bs',
  efectivo_usd:  'usd',
  pago_movil:    'bs',
  punto_venta:   'bs',
  zelle:         'usd',
  transferencia: 'bs',
  delivery:      'bs',
  propina:       'bs',
  vuelto:        'bs',
  credito_fiado: 'bs'
}

// Obtener o crear registro del día
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  let { data: register } = await supabase
    .from('daily_registers')
    .select('*, daily_payments(*), sales_items(*)')
    .eq('date', today)
    .single()

  if (!register) {
    const { data: newReg, error } = await supabase
      .from('daily_registers')
      .insert({ date: today, exchange_rate_bcv: 0, created_by: req.user.id })
      .select('*, daily_payments(*), sales_items(*)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    register = newReg
  }

  res.json({ register })
})

// Obtener registro por fecha específica
router.get('/date/:date', async (req, res) => {
  const { data: register, error } = await supabase
    .from('daily_registers')
    .select('*, daily_payments(*), sales_items(*)')
    .eq('date', req.params.date)
    .single()

  if (error) return res.status(404).json({ error: 'Registro no encontrado' })
  res.json({ register })
})

// Actualizar tasa BCV
router.put('/:id/rate', async (req, res) => {
  const { exchange_rate_bcv } = req.body
  const { data, error } = await supabase
    .from('daily_registers')
    .update({ exchange_rate_bcv })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ register: data })
})

// Guardar/actualizar pago
router.put('/:id/payment', async (req, res) => {
  const { method, amount, notes } = req.body
  const register_id = req.params.id
  const currency = PAYMENT_CURRENCIES[method] || 'bs'

  const { data: existing } = await supabase
    .from('daily_payments')
    .select('id')
    .eq('register_id', register_id)
    .eq('method', method)
    .single()

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('daily_payments')
      .update({ amount, currency, notes })
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ;({ data, error } = await supabase
      .from('daily_payments')
      .insert({ register_id, method, amount, currency, notes })
      .select()
      .single())
  }

  if (error) return res.status(500).json({ error: error.message })
  res.json({ payment: data })
})

// Agregar artículo vendido
router.post('/:id/items', async (req, res) => {
  const { dish_id, dish_name, item_type, quantity, price_bs, price_usd, cost_bs } = req.body
  const { data, error } = await supabase
    .from('sales_items')
    .insert({
      register_id: req.params.id,
      dish_id, dish_name, item_type,
      quantity: quantity || 1,
      price_bs, price_usd, cost_bs
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ item: data })
})

// Eliminar artículo vendido
router.delete('/:id/items/:itemId', async (req, res) => {
  const { error } = await supabase
    .from('sales_items')
    .delete()
    .eq('id', req.params.itemId)
    .eq('register_id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Artículo eliminado' })
})

// Cerrar el día
router.put('/:id/close', requireRoles('administrador', 'cajero', 'dueño'), async (req, res) => {
  const { notes } = req.body
  const { data, error } = await supabase
    .from('daily_registers')
    .update({
      status: 'cerrado',
      notes,
      closed_by: req.user.id,
      closed_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select('*, daily_payments(*), sales_items(*)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ register: data })
})

export default router
