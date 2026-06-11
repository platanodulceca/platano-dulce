import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const MONEDA = {
  efectivo_bs: 'bs', efectivo_usd: 'usd', pago_movil: 'bs',
  punto_venta: 'bs', zelle: 'usd', transferencia: 'bs',
  delivery: 'bs', propina: 'bs', vuelto: 'bs', credito: 'bs',
}

// Obtener o crear registro de una fecha (por defecto hoy)
router.get('/hoy', async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0]
  let { data: caja } = await supabase
    .from('caja_registros')
    .select('*, caja_pagos(*), venta_items(*)')
    .eq('fecha', fecha).single()
  if (!caja) {
    const { data: nueva, error } = await supabase
      .from('caja_registros')
      .insert({ fecha, tasa_bcv: 0, created_by: req.user.id })
      .select('*, caja_pagos(*), venta_items(*)')
      .single()
    if (error) return res.status(500).json({ error: error.message })
    caja = nueva
  }
  res.json({ caja })
})

// Historial de cierres
router.get('/historial', async (req, res) => {
  const { limit = 30 } = req.query
  const { data, error } = await supabase
    .from('caja_registros')
    .select('*, caja_pagos(*), venta_items(*)')
    .eq('cerrado', true)
    .order('fecha', { ascending: false })
    .limit(parseInt(limit))
  if (error) return res.status(500).json({ error: error.message })
  res.json({ registros: data })
})

// Registro por fecha
router.get('/fecha/:fecha', async (req, res) => {
  const { data, error } = await supabase
    .from('caja_registros')
    .select('*, caja_pagos(*), venta_items(*)')
    .eq('fecha', req.params.fecha).single()
  if (error) return res.status(404).json({ error: 'No encontrado' })
  res.json({ caja: data })
})

// Actualizar tasa BCV
router.put('/:id/tasa', async (req, res) => {
  const { tasa_bcv } = req.body
  const { data, error } = await supabase
    .from('caja_registros')
    .update({ tasa_bcv: parseFloat(tasa_bcv) || 0 })
    .eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ caja: data })
})

// Crear fila de pago
router.post('/:id/pagos', async (req, res) => {
  const { metodo, monto, referencia } = req.body
  const moneda = MONEDA[metodo] || 'bs'
  const { data, error } = await supabase
    .from('caja_pagos')
    .insert({ caja_id: req.params.id, metodo, monto: parseFloat(monto) || 0, moneda, referencia: referencia || null })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ pago: data })
})

// Actualizar fila de pago
router.put('/:id/pagos/:pagId', async (req, res) => {
  const { metodo, monto, referencia } = req.body
  const moneda = MONEDA[metodo] || 'bs'
  const { data, error } = await supabase
    .from('caja_pagos')
    .update({ metodo, monto: parseFloat(monto) || 0, moneda, referencia: referencia || null })
    .eq('id', req.params.pagId)
    .eq('caja_id', req.params.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ pago: data })
})

// Eliminar fila de pago
router.delete('/:id/pagos/:pagId', async (req, res) => {
  const { error } = await supabase
    .from('caja_pagos')
    .delete()
    .eq('id', req.params.pagId)
    .eq('caja_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Pago eliminado' })
})

// Agregar ítem vendido
router.post('/:id/ventas', async (req, res) => {
  const { nombre, precio, costo, cantidad } = req.body
  const { data, error } = await supabase
    .from('venta_items')
    .insert({
      caja_id:  req.params.id,
      nombre,
      precio:   parseFloat(precio)   || 0,
      costo:    parseFloat(costo)    || 0,
      cantidad: parseInt(cantidad)   || 1,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ venta: data })
})

// Eliminar ítem vendido
router.delete('/:id/ventas/:itemId', async (req, res) => {
  const { error } = await supabase
    .from('venta_items')
    .delete()
    .eq('id', req.params.itemId)
    .eq('caja_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Venta eliminada' })
})

// Cerrar caja del día
router.put('/:id/cerrar', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { notes } = req.body
  const { data, error } = await supabase
    .from('caja_registros')
    .update({ cerrado: true, notes, closed_by: req.user.id, closed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*, caja_pagos(*), venta_items(*)')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ caja: data })
})

export default router
