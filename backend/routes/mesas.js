import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Listar todas las mesas con orden activa si la tienen
router.get('/', async (req, res) => {
  const { data: tables, error } = await supabase
    .from('mesas')
    .select('*')
    .eq('active', true)
    .order('number')

  if (error) return res.status(500).json({ error: error.message })

  // Adjuntar orden activa si existe
  const activeStatuses = ['borrador', 'pendiente', 'en_preparacion', 'lista', 'entregada']
  const { data: activeOrders } = await supabase
    .from('ordenes')
    .select('id, table_id, status, total_bs, waiter_name, sent_at, created_at')
    .in('status', activeStatuses)

  const orderByTable = {}
  activeOrders?.forEach(o => { orderByTable[o.table_id] = o })

  const result = tables.map(t => ({
    ...t,
    active_order: orderByTable[t.id] || null
  }))

  res.json({ tables: result })
})

// Crear mesa
router.post('/', requireRoles('admin', 'dueno'), async (req, res) => {
  const { number, name, capacity } = req.body
  const { data, error } = await supabase
    .from('mesas')
    .insert({ number, name: name || `Mesa ${number}`, capacity: capacity || 4 })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ table: data })
})

// Actualizar mesa
router.put('/:id', requireRoles('admin', 'dueno'), async (req, res) => {
  const { number, name, capacity, status, active } = req.body
  const { data, error } = await supabase
    .from('mesas')
    .update({ number, name, capacity, status, active })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ table: data })
})

export default router
