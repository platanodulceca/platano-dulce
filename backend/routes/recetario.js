import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Listar platos con ingredientes
router.get('/', async (req, res) => {
  const { data: dishes, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('active', true)
    .order('category').order('name')

  if (error) return res.status(500).json({ error: error.message })

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('*, products(id, name, unit)')

  const result = dishes.map(d => ({
    ...d,
    ingredients: ingredients?.filter(i => i.dish_id === d.id) || []
  }))

  res.json({ dishes: result })
})

// Crear plato
router.post('/dishes', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { name, category, price_bs, price_usd, cost_bs } = req.body
  const { data, error } = await supabase
    .from('dishes')
    .insert({ name, category, price_bs, price_usd, cost_bs })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ dish: data })
})

// Editar plato
router.put('/dishes/:id', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { name, category, price_bs, price_usd, cost_bs, active } = req.body
  const { data, error } = await supabase
    .from('dishes')
    .update({ name, category, price_bs, price_usd, cost_bs, active })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ dish: data })
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
      .select('*, products(id, name, unit)').single())
  } else {
    ;({ data, error } = await supabase
      .from('recipe_ingredients')
      .insert({ dish_id, product_id, quantity_per_portion })
      .select('*, products(id, name, unit)').single())
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
