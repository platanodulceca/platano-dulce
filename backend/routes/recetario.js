import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Listar platos activos (para selección en caja/mesero)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('activo', true)
    .order('categoria').order('nombre')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ items: data })
})

// Listar todos los platos (para administración)
router.get('/todos', async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('categoria').order('nombre')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ items: data })
})

router.post('/', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { nombre, categoria, precio, costo } = req.body
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ nombre, categoria, precio: parseFloat(precio) || 0, costo: parseFloat(costo) || 0, activo: true })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ item: data })
})

router.put('/:id', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { nombre, categoria, precio, costo, activo } = req.body
  const updates = {}
  if (nombre    !== undefined) updates.nombre    = nombre
  if (categoria !== undefined) updates.categoria = categoria
  if (precio    !== undefined) updates.precio    = parseFloat(precio) || 0
  if (costo     !== undefined) updates.costo     = parseFloat(costo) || 0
  if (activo    !== undefined) updates.activo    = activo
  const { data, error } = await supabase
    .from('menu_items').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ item: data })
})

router.delete('/:id', requireRoles('admin', 'dueno'), async (req, res) => {
  const { error } = await supabase
    .from('menu_items').update({ activo: false }).eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Plato desactivado' })
})

// Ingredientes de un plato
router.get('/:id/ingredientes', async (req, res) => {
  const { data, error } = await supabase
    .from('receta_ingredientes')
    .select('*, inventario(id, nombre, unidad)')
    .eq('menu_item_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ingredientes: data })
})

router.post('/:id/ingredientes', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { inventario_id, ingrediente, cantidad, unidad } = req.body
  const { data, error } = await supabase
    .from('receta_ingredientes')
    .insert({ menu_item_id: req.params.id, inventario_id, ingrediente, cantidad: parseFloat(cantidad) || 0, unidad })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ingrediente: data })
})

router.delete('/:id/ingredientes/:ingId', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { error } = await supabase
    .from('receta_ingredientes')
    .delete()
    .eq('id', req.params.ingId)
    .eq('menu_item_id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Ingrediente eliminado' })
})

export default router
