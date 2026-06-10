import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Normaliza fila de menu_items (columnas ES) → campos inglés que espera el frontend
const todish = d => d ? ({
  id:        d.id,
  name:      d.nombre,
  category:  d.categoria,
  price_bs:  d.precio,
  price_usd: d.precio_usd,
  cost_bs:   d.costo,
  active:    d.activo,
  created_at: d.created_at,
}) : null

// Listar platos con ingredientes
router.get('/', async (req, res) => {
  const { data: rows, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('activo', true)
    .order('categoria').order('nombre')

  if (error) return res.status(500).json({ error: error.message })

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('*, inventario(id, name, unit)')

  const dishes = rows.map(d => ({
    ...todish(d),
    ingredients: ingredients?.filter(i => i.dish_id === d.id) || []
  }))

  res.json({ dishes })
})

// Crear plato
router.post('/dishes', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { name, category, price_bs, price_usd, cost_bs } = req.body
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ nombre: name, categoria: category, precio: price_bs, precio_usd: price_usd, costo: cost_bs, activo: true })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ dish: todish(data) })
})

// Editar plato
router.put('/dishes/:id', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { name, category, price_bs, price_usd, cost_bs, active } = req.body
  const { data, error } = await supabase
    .from('menu_items')
    .update({ nombre: name, categoria: category, precio: price_bs, precio_usd: price_usd, costo: cost_bs, activo: active })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ dish: todish(data) })
})

// Agregar/actualizar ingrediente en receta
router.post('/ingredients', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { dish_id, product_id, quantity_per_portion } = req.body

  const { data: existing } = await supabase
    .from('recipe_ingredients')
    .select('id')
    .eq('dish_id', dish_id)
    .eq('product_id', product_id)
    .single()

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('recipe_ingredients')
      .update({ quantity_per_portion })
      .eq('id', existing.id)
      .select('*, inventario(id, name, unit)').single())
  } else {
    ;({ data, error } = await supabase
      .from('recipe_ingredients')
      .insert({ dish_id, product_id, quantity_per_portion })
      .select('*, inventario(id, name, unit)').single())
  }

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ingredient: data })
})

// Eliminar ingrediente de receta
router.delete('/ingredients/:id', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { error } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Ingrediente eliminado' })
})

export default router
