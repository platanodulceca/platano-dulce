import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const recalcTotal = async (ordenId) => {
  const { data } = await supabase.from('orden_items').select('precio,cantidad').eq('orden_id', ordenId)
  const total = data?.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0) || 0
  await supabase.from('ordenes').update({ total }).eq('id', ordenId)
  return total
}

// Órdenes activas
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero, estado)')
    .not('estado', 'in', '("cobrada","cancelada")')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ordenes: data })
})

// Órdenes listas para cobrar
router.get('/cobrar', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .in('estado', ['lista', 'entregada'])
    .order('id')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ordenes: data })
})

// Órdenes del mesero autenticado
router.get('/mias', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .eq('mesero_id', req.user.id)
    .not('estado', 'in', '("cobrada","cancelada")')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ordenes: data })
})

router.post('/', requireRoles('admin', 'mesero', 'dueno'), async (req, res) => {
  const { mesa_id, personas, notas } = req.body
  const { data, error } = await supabase
    .from('ordenes')
    .insert({
      mesa_id, mesero_id: req.user.id,
      estado: 'pendiente', total: 0,
      personas: parseInt(personas) || 1,
      notas: notas || null,
    })
    .select('*, orden_items(*), mesas(numero)').single()
  if (error) return res.status(500).json({ error: error.message })
  await supabase.from('mesas').update({ estado: 'ocupada' }).eq('id', mesa_id)
  res.status(201).json({ orden: data })
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .eq('id', req.params.id).single()
  if (error) return res.status(404).json({ error: 'Orden no encontrada' })
  res.json({ orden: data })
})

router.put('/:id/estado', async (req, res) => {
  const { estado } = req.body
  const { data, error } = await supabase
    .from('ordenes')
    .update({ estado })
    .eq('id', req.params.id)
    .select('*, orden_items(*), mesas(numero)').single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ orden: data })
})

router.post('/:id/items', async (req, res) => {
  const { nombre, precio, cantidad, notas } = req.body
  const { data: item, error } = await supabase
    .from('orden_items')
    .insert({
      orden_id: req.params.id,
      nombre,
      precio:   parseFloat(precio)   || 0,
      cantidad: parseInt(cantidad)   || 1,
      notas:    notas || null,
      estado:   'pendiente',
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  await recalcTotal(req.params.id)
  res.status(201).json({ item })
})

router.put('/:id/items/:itemId', async (req, res) => {
  const { cantidad, notas, estado } = req.body
  const updates = {}
  if (cantidad !== undefined) updates.cantidad = parseInt(cantidad)
  if (notas    !== undefined) updates.notas    = notas
  if (estado   !== undefined) updates.estado   = estado
  const { data, error } = await supabase
    .from('orden_items')
    .update(updates)
    .eq('id', req.params.itemId)
    .eq('orden_id', req.params.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ item: data })
})

router.delete('/:id/items/:itemId', async (req, res) => {
  const { error } = await supabase
    .from('orden_items')
    .delete()
    .eq('id', req.params.itemId)
    .eq('orden_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  await recalcTotal(req.params.id)
  res.json({ message: 'Ítem eliminado' })
})

// Cobrar orden — transfiere ítems a venta_items
router.put('/:id/cobrar', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { data: orden } = await supabase
    .from('ordenes')
    .select('*, orden_items(*)')
    .eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (!['lista', 'entregada'].includes(orden.estado)) {
    return res.status(400).json({ error: 'La orden no está lista para cobrar' })
  }

  const today = new Date().toISOString().split('T')[0]
  let { data: caja } = await supabase.from('caja_registros').select('id').eq('fecha', today).single()
  if (!caja) {
    const { data: nueva } = await supabase
      .from('caja_registros')
      .insert({ fecha: today, tasa_bcv: 0, created_by: req.user.id })
      .select('id').single()
    caja = nueva
  }

  if (orden.orden_items?.length) {
    await supabase.from('venta_items').insert(
      orden.orden_items.map(i => ({
        caja_id: caja.id,
        nombre:  i.nombre,
        precio:  Number(i.precio),
        costo:   0,
        cantidad: Number(i.cantidad),
      }))
    )
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update({ estado: 'cobrada' })
    .eq('id', req.params.id)
    .select('*, orden_items(*), mesas(numero)').single()
  if (error) return res.status(500).json({ error: error.message })

  // Liberar mesa si no hay otras órdenes activas
  const { data: otras } = await supabase
    .from('ordenes')
    .select('id')
    .eq('mesa_id', orden.mesa_id)
    .not('estado', 'in', '("cobrada","cancelada")')
  if (!otras?.length) {
    await supabase.from('mesas').update({ estado: 'disponible' }).eq('id', orden.mesa_id)
  }

  res.json({ orden: data })
})

export default router
