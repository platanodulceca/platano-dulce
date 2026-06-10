import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// ── Listar órdenes activas (para cocina y mesero) ─────────────
router.get('/active', async (req, res) => {
  const activeStatuses = ['pendiente', 'en_preparacion', 'lista']
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .in('status', activeStatuses)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// ── Órdenes del mesero autenticado ────────────────────────────
router.get('/mine', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .eq('waiter_id', req.user.id)
    .not('status', 'in', '("cobrada","cancelada")')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// ── Órdenes listas para cobrar (para cajero) ──────────────────
router.get('/to-collect', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .in('status', ['lista', 'entregada'])
    .order('ready_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ orders: data })
})

// ── Obtener orden por ID ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Orden no encontrada' })
  res.json({ order: data })
})

// ── Crear nueva orden (borrador) ──────────────────────────────
router.post('/', async (req, res) => {
  const { table_id, notes } = req.body

  const { data: table } = await supabase
    .from('mesas')
    .select('id, number, name, status')
    .eq('id', table_id)
    .single()

  if (!table) return res.status(404).json({ error: 'Mesa no encontrada' })
  if (table.status === 'ocupada') {
    // Check if there's already an active draft for this table by this waiter
    const { data: existingOrder } = await supabase
      .from('ordenes')
      .select('id')
      .eq('table_id', table_id)
      .eq('waiter_id', req.user.id)
      .eq('status', 'borrador')
      .single()
    if (existingOrder) return res.status(400).json({ error: 'Ya tienes un borrador para esta mesa', order_id: existingOrder.id })
  }

  const { data, error } = await supabase
    .from('ordenes')
    .insert({
      table_id,
      table_number: table.number,
      table_name: table.name || `Mesa ${table.number}`,
      waiter_id: req.user.id,
      waiter_name: req.user.name,
      notes,
      status: 'borrador'
    })
    .select('*, order_items(*)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ order: data })
})

// ── Agregar ítem a orden ──────────────────────────────────────
router.post('/:id/items', async (req, res) => {
  const { dish_id, dish_name, item_type, quantity, price_bs, cost_bs, notes } = req.body

  const { data: order } = await supabase.from('ordenes').select('status, waiter_id').eq('id', req.params.id).single()
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' })
  if (order.waiter_id !== req.user.id && !['admin','dueno'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sin acceso a esta orden' })
  }
  if (['cobrada','cancelada'].includes(order.status)) {
    return res.status(400).json({ error: 'No se puede modificar una orden cerrada' })
  }

  const { data, error } = await supabase
    .from('orden_items')
    .insert({
      order_id: req.params.id,
      dish_id, dish_name, item_type,
      quantity: parseInt(quantity) || 1,
      price_bs: parseFloat(price_bs) || 0,
      cost_bs: parseFloat(cost_bs) || 0,
      notes
    })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })

  await recalcTotal(req.params.id)
  res.status(201).json({ item: data })
})

// ── Actualizar ítem (cantidad / notas) ────────────────────────
router.put('/:id/items/:itemId', async (req, res) => {
  const { quantity, notes, price_bs, cost_bs } = req.body
  const updates = {}
  if (quantity !== undefined) updates.quantity = parseInt(quantity) || 1
  if (notes !== undefined) updates.notes = notes
  if (price_bs !== undefined) updates.price_bs = parseFloat(price_bs)
  if (cost_bs !== undefined) updates.cost_bs = parseFloat(cost_bs)
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('orden_items')
    .update(updates)
    .eq('id', req.params.itemId)
    .eq('order_id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  await recalcTotal(req.params.id)
  res.json({ item: data })
})

// ── Eliminar ítem ─────────────────────────────────────────────
router.delete('/:id/items/:itemId', async (req, res) => {
  const { error } = await supabase
    .from('orden_items')
    .delete()
    .eq('id', req.params.itemId)
    .eq('order_id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  await recalcTotal(req.params.id)
  res.json({ message: 'Ítem eliminado' })
})

// ── Enviar orden a cocina ─────────────────────────────────────
router.put('/:id/send', async (req, res) => {
  const { data: order } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single()

  if (!order) return res.status(404).json({ error: 'Orden no encontrada' })
  if (order.status !== 'borrador') return res.status(400).json({ error: 'La orden ya fue enviada' })
  if (!order.order_items?.length) return res.status(400).json({ error: 'La orden no tiene ítems' })

  const { data, error } = await supabase
    .from('ordenes')
    .update({ status: 'pendiente', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*, order_items(*)').single()

  if (error) return res.status(500).json({ error: error.message })

  // Marcar mesa como ocupada
  await supabase
    .from('mesas')
    .update({ status: 'ocupada', current_order_id: req.params.id })
    .eq('id', order.table_id)

  res.json({ order: data })
})

// ── Actualizar estado de ítem (para chef) ─────────────────────
router.put('/:id/items/:itemId/status', requireRoles('admin','chef','dueno'), async (req, res) => {
  const { status } = req.body
  const validStatuses = ['pendiente','en_preparacion','listo','entregado']
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' })

  const { error } = await supabase
    .from('orden_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.itemId)
    .eq('order_id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })

  // Auto-actualizar estado de la orden
  const newOrderStatus = await autoUpdateOrderStatus(req.params.id)

  // Obtener orden actualizada
  const { data: updatedOrder } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single()

  res.json({ order: updatedOrder, order_status: newOrderStatus })
})

// ── Marcar orden como entregada (mesero) ──────────────────────
router.put('/:id/deliver', async (req, res) => {
  const { data: order } = await supabase.from('ordenes').select('status, waiter_id').eq('id', req.params.id).single()
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' })
  if (!['lista','en_preparacion'].includes(order.status)) {
    return res.status(400).json({ error: 'La orden no está lista para entrega' })
  }

  const { data, error } = await supabase
    .from('ordenes')
    .update({ status: 'entregada', delivered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select('*, order_items(*)').single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ order: data })
})

// ── Cobrar orden (cajero) ─────────────────────────────────────
router.put('/:id/cobrar', requireRoles('admin','cajero','dueno'), async (req, res) => {
  const { data: order } = await supabase
    .from('ordenes')
    .select('*, order_items(*)')
    .eq('id', req.params.id)
    .single()

  if (!order) return res.status(404).json({ error: 'Orden no encontrada' })
  if (!['lista','entregada'].includes(order.status)) {
    return res.status(400).json({ error: 'La orden no está lista para cobrar' })
  }

  // Obtener o crear registro del día
  const today = new Date().toISOString().split('T')[0]
  let { data: register } = await supabase
    .from('caja_registros')
    .select('id')
    .eq('date', today)
    .single()

  if (!register) {
    const { data: newReg } = await supabase
      .from('caja_registros')
      .insert({ date: today, exchange_rate_bcv: 0, created_by: req.user.id })
      .select('id').single()
    register = newReg
  }

  // Insertar ítems en sales_items
  if (order.order_items?.length) {
    const salesItems = order.order_items.map(item => ({
      register_id: register.id,
      dish_id: item.dish_id,
      dish_name: item.dish_name,
      item_type: item.item_type,
      quantity: item.quantity,
      price_bs: item.price_bs,
      cost_bs: item.cost_bs
    }))
    await supabase.from('sales_items').insert(salesItems)
  }

  // Marcar orden como cobrada
  const { data, error } = await supabase
    .from('ordenes')
    .update({
      status: 'cobrada',
      register_id: register.id,
      cobrado_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select('*, order_items(*)').single()

  if (error) return res.status(500).json({ error: error.message })

  // Liberar mesa
  await supabase
    .from('mesas')
    .update({ status: 'disponible', current_order_id: null })
    .eq('id', order.table_id)

  res.json({ order: data, register_id: register.id })
})

// ── Cancelar orden ────────────────────────────────────────────
router.put('/:id/cancel', async (req, res) => {
  const { data: order } = await supabase.from('ordenes').select('status, table_id').eq('id', req.params.id).single()
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' })
  if (['cobrada','cancelada'].includes(order.status)) {
    return res.status(400).json({ error: 'No se puede cancelar esta orden' })
  }

  await supabase.from('ordenes').update({ status: 'cancelada', updated_at: new Date().toISOString() }).eq('id', req.params.id)

  // Solo liberar mesa si no hay otra orden activa
  const { data: otherOrders } = await supabase
    .from('ordenes')
    .select('id')
    .eq('table_id', order.table_id)
    .not('status', 'in', '("cobrada","cancelada","borrador")')
    .neq('id', req.params.id)

  if (!otherOrders?.length) {
    await supabase.from('mesas').update({ status: 'disponible', current_order_id: null }).eq('id', order.table_id)
  }

  res.json({ message: 'Orden cancelada' })
})

// ── Helpers internos ──────────────────────────────────────────
async function recalcTotal(orderId) {
  const { data: items } = await supabase
    .from('orden_items')
    .select('price_bs, quantity')
    .eq('order_id', orderId)

  const total = items?.reduce((s, i) => s + Number(i.price_bs) * i.quantity, 0) || 0
  await supabase.from('ordenes').update({ total_bs: total, updated_at: new Date().toISOString() }).eq('id', orderId)
}

async function autoUpdateOrderStatus(orderId) {
  const { data: items } = await supabase
    .from('orden_items')
    .select('status')
    .eq('order_id', orderId)

  if (!items?.length) return null

  const { data: currentOrder } = await supabase.from('ordenes').select('status').eq('id', orderId).single()
  if (!currentOrder || ['cobrada','cancelada','entregada'].includes(currentOrder.status)) return currentOrder?.status

  const allListo = items.every(i => i.status === 'listo')
  const anyPrep = items.some(i => i.status === 'en_preparacion')
  const anyListo = items.some(i => i.status === 'listo')

  let newStatus = currentOrder.status
  if (allListo) newStatus = 'lista'
  else if (anyPrep || anyListo) newStatus = 'en_preparacion'
  else newStatus = 'pendiente'

  if (newStatus !== currentOrder.status) {
    const updates = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'lista') updates.ready_at = new Date().toISOString()
    await supabase.from('ordenes').update(updates).eq('id', orderId)
  }

  return newStatus
}

export default router
