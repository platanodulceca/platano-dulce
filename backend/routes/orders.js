import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Órdenes activas (cocina / mesero)
router.get('/active', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .in('estado', ['pendiente', 'en_preparacion', 'lista'])
    .order('id', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// Órdenes del mesero autenticado
router.get('/mine', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*)')
    .eq('mesero_id', req.user.id)
    .not('estado', 'in', '("cobrada","cancelada")')
    .order('id', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// Órdenes listas para cobrar (cajero)
router.get('/to-collect', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .in('estado', ['lista', 'entregada'])
    .order('id', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// Obtener orden por ID
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero, estado)')
    .eq('id', req.params.id)
    .single()
  if (error) return res.status(404).json({ error: 'Orden no encontrada' })
  res.json({ order: data })
})

// Crear nueva orden (borrador)
router.post('/', requireRoles('admin', 'mesero', 'dueno'), async (req, res) => {
  const { mesa_id, personas, notas } = req.body
  console.log('[orders POST /] body:', req.body, 'user:', req.user?.id)

  const { data: mesa } = await supabase
    .from('mesas')
    .select('id, numero, estado')
    .eq('id', mesa_id)
    .single()
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' })

  const payload = {
    mesa_id,
    mesero_id: req.user.id,
    estado:    'borrador',
    total:     0,
    personas:  parseInt(personas) || 1,
    notas:     notas || null,
  }
  console.log('[orders POST /] inserting:', payload)
  const { data, error } = await supabase
    .from('ordenes')
    .insert(payload)
    .select('*, orden_items(*), mesas(numero)')
    .single()
  if (error) {
    console.error('[orders POST /] error:', { message: error.message, details: error.details, hint: error.hint, code: error.code })
    return res.status(500).json({ error: error.message })
  }
  res.status(201).json({ order: data })
})

// Agregar ítem a orden
router.post('/:id/items', async (req, res) => {
  const { nombre, precio, cantidad, notas } = req.body

  const { data: orden } = await supabase
    .from('ordenes').select('estado, mesero_id').eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (orden.mesero_id !== req.user.id && !['admin', 'dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin acceso a esta orden' })
  }
  if (['cobrada', 'cancelada'].includes(orden.estado)) {
    return res.status(400).json({ error: 'No se puede modificar una orden cerrada' })
  }

  const { data, error } = await supabase
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
  if (error) { console.error('[orders POST /:id/items]', error); return res.status(500).json({ error: error.message }) }
  await recalcTotal(req.params.id)
  res.status(201).json({ item: data })
})

// Actualizar ítem (cantidad / notas / precio / costo)
router.put('/:id/items/:itemId', async (req, res) => {
  const { cantidad, notas, precio, costo } = req.body
  const updates = {}
  if (cantidad !== undefined) updates.cantidad = parseInt(cantidad) || 1
  if (notas    !== undefined) updates.notas    = notas
  if (precio   !== undefined) updates.precio   = parseFloat(precio)
  if (costo    !== undefined) updates.costo    = parseFloat(costo)

  const { data, error } = await supabase
    .from('orden_items')
    .update(updates)
    .eq('id', req.params.itemId)
    .eq('orden_id', req.params.id)
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  await recalcTotal(req.params.id)
  res.json({ item: data })
})

// Eliminar ítem
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

// Enviar orden a cocina
router.put('/:id/send', async (req, res) => {
  const { data: orden } = await supabase
    .from('ordenes').select('*, orden_items(*)').eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (orden.estado !== 'borrador') return res.status(400).json({ error: 'La orden ya fue enviada' })
  if (!orden.orden_items?.length) return res.status(400).json({ error: 'La orden no tiene ítems' })

  const { data, error } = await supabase
    .from('ordenes')
    .update({ estado: 'pendiente' })
    .eq('id', req.params.id)
    .select('*, orden_items(*), mesas(numero)').single()
  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('mesas').update({ estado: 'ocupada' }).eq('id', orden.mesa_id)
  res.json({ order: data })
})

// Actualizar estado de ítem (para chef)
router.put('/:id/items/:itemId/status', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { estado } = req.body
  const validos = ['pendiente', 'en_preparacion', 'listo', 'entregado']
  if (!validos.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })

  const { error } = await supabase
    .from('orden_items')
    .update({ estado })
    .eq('id', req.params.itemId)
    .eq('orden_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })

  const nuevoEstado = await autoActualizarOrden(req.params.id)

  const { data: ordenActualizada } = await supabase
    .from('ordenes').select('*, orden_items(*), mesas(numero)').eq('id', req.params.id).single()
  res.json({ order: ordenActualizada, order_status: nuevoEstado })
})

// Marcar orden como entregada (mesero)
router.put('/:id/deliver', async (req, res) => {
  const { data: orden } = await supabase
    .from('ordenes').select('estado, mesero_id').eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (!['lista', 'en_preparacion'].includes(orden.estado)) {
    return res.status(400).json({ error: 'La orden no está lista para entrega' })
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update({ estado: 'entregada' })
    .eq('id', req.params.id)
    .select('*, orden_items(*), mesas(numero)').single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ order: data })
})

// Cobrar orden (cajero)
router.put('/:id/cobrar', requireRoles('admin', 'cajero', 'dueno'), async (req, res) => {
  const { data: orden } = await supabase
    .from('ordenes').select('*, orden_items(*)').eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (!['lista', 'entregada'].includes(orden.estado)) {
    return res.status(400).json({ error: 'La orden no está lista para cobrar' })
  }

  const today = new Date().toISOString().split('T')[0]
  let { data: caja } = await supabase
    .from('caja_registros').select('id').eq('fecha', today).single()
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
        caja_id:  caja.id,
        nombre:   i.nombre,
        precio:   Number(i.precio),
        costo:    Number(i.costo) || 0,
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

  const { data: otras } = await supabase
    .from('ordenes').select('id')
    .eq('mesa_id', orden.mesa_id)
    .not('estado', 'in', '("cobrada","cancelada")')
  if (!otras?.length) {
    await supabase.from('mesas').update({ estado: 'disponible' }).eq('id', orden.mesa_id)
  }

  res.json({ order: data, caja_id: caja.id })
})

// Cancelar orden
router.put('/:id/cancel', async (req, res) => {
  const { data: orden } = await supabase
    .from('ordenes').select('estado, mesa_id').eq('id', req.params.id).single()
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' })
  if (['cobrada', 'cancelada'].includes(orden.estado)) {
    return res.status(400).json({ error: 'No se puede cancelar esta orden' })
  }

  await supabase.from('ordenes').update({ estado: 'cancelada' }).eq('id', req.params.id)

  const { data: otras } = await supabase
    .from('ordenes').select('id')
    .eq('mesa_id', orden.mesa_id)
    .not('estado', 'in', '("cobrada","cancelada","borrador")')
    .neq('id', req.params.id)
  if (!otras?.length) {
    await supabase.from('mesas').update({ estado: 'disponible' }).eq('id', orden.mesa_id)
  }

  res.json({ message: 'Orden cancelada' })
})

async function recalcTotal(ordenId) {
  const { data } = await supabase
    .from('orden_items').select('precio, cantidad').eq('orden_id', ordenId)
  const total = data?.reduce((s, i) => s + Number(i.precio) * Number(i.cantidad), 0) || 0
  await supabase.from('ordenes').update({ total }).eq('id', ordenId)
}

async function autoActualizarOrden(ordenId) {
  const { data: items } = await supabase
    .from('orden_items').select('estado').eq('orden_id', ordenId)
  if (!items?.length) return null

  const { data: orden } = await supabase.from('ordenes').select('estado').eq('id', ordenId).single()
  if (!orden || ['cobrada', 'cancelada', 'entregada'].includes(orden.estado)) return orden?.estado

  const todosListos  = items.every(i => i.estado === 'listo')
  const hayPrep      = items.some(i => i.estado === 'en_preparacion')
  const hayListo     = items.some(i => i.estado === 'listo')

  let nuevoEstado = orden.estado
  if (todosListos)         nuevoEstado = 'lista'
  else if (hayPrep || hayListo) nuevoEstado = 'en_preparacion'
  else                     nuevoEstado = 'pendiente'

  if (nuevoEstado !== orden.estado) {
    const { error: upErr } = await supabase.from('ordenes').update({ estado: nuevoEstado }).eq('id', ordenId)
    if (upErr) console.error('[autoActualizarOrden] error al pasar a', nuevoEstado, upErr)
    else console.log('[autoActualizarOrden] orden', ordenId, '→', nuevoEstado)
  }
  return nuevoEstado
}

export default router
