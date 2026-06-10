import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Listar productos activos
router.get('/products', async (req, res) => {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  res.json({ products: data })
})

// Agregar producto
router.post('/products', async (req, res) => {
  const { name, category, unit, minimum_stock, current_stock, cost_per_unit } = req.body
  const { data, error } = await supabase
    .from('inventario')
    .insert({ name, category, unit, minimum_stock, current_stock, cost_per_unit })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ product: data })
})

// Editar producto
router.put('/products/:id', async (req, res) => {
  const { name, category, unit, minimum_stock, current_stock, cost_per_unit, active } = req.body
  const { data, error } = await supabase
    .from('inventario')
    .update({ name, category, unit, minimum_stock, current_stock, cost_per_unit, active })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ product: data })
})

// Conteo del día actual
router.get('/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: products } = await supabase
    .from('inventario')
    .select('*')
    .eq('active', true)
    .order('category').order('name')

  const { data: counts } = await supabase
    .from('inventory_counts')
    .select('*')
    .eq('date', today)

  const countMap = {}
  counts?.forEach(c => { countMap[c.product_id] = c })

  // Calcular consumo teórico desde las ventas de hoy
  const { data: todayRegister } = await supabase
    .from('caja_registros')
    .select('id')
    .eq('date', today)
    .single()

  const theoreticalConsumption = {}
  if (todayRegister) {
    const { data: salesItems } = await supabase
      .from('sales_items')
      .select('dish_id, quantity')
      .eq('register_id', todayRegister.id)
      .not('dish_id', 'is', null)

    if (salesItems?.length) {
      const dishIds = [...new Set(salesItems.map(s => s.dish_id))]
      const { data: recipes } = await supabase
        .from('recipe_ingredients')
        .select('dish_id, product_id, quantity_per_portion')
        .in('dish_id', dishIds)

      salesItems.forEach(sale => {
        const ingredientes = recipes?.filter(r => r.dish_id === sale.dish_id) || []
        ingredientes.forEach(ing => {
          theoreticalConsumption[ing.product_id] = (theoreticalConsumption[ing.product_id] || 0)
            + (ing.quantity_per_portion * sale.quantity)
        })
      })
    }
  }

  const result = products?.map(p => {
    const count = countMap[p.id]
    const theoretical = theoreticalConsumption[p.id] || 0
    const physical = count?.physical_count ?? p.current_stock
    const difference = physical - theoretical
    let status = 'ok'
    if (physical <= 0) status = 'agotado'
    else if (physical <= p.minimum_stock) status = 'reponer'

    return {
      ...p,
      physical_count: physical,
      theoretical_count: theoretical,
      difference,
      status,
      count_id: count?.id || null
    }
  })

  res.json({ inventory: result, date: today })
})

// Guardar conteo físico
router.post('/count', async (req, res) => {
  const { product_id, physical_count, date } = req.body
  const countDate = date || new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('inventory_counts')
    .select('id')
    .eq('date', countDate)
    .eq('product_id', product_id)
    .single()

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('inventory_counts')
      .update({ physical_count, counted_by: req.user.id })
      .eq('id', existing.id)
      .select().single())
  } else {
    ;({ data, error } = await supabase
      .from('inventory_counts')
      .insert({ date: countDate, product_id, physical_count, counted_by: req.user.id })
      .select().single())
  }

  // Actualizar stock en products
  await supabase
    .from('inventario')
    .update({ current_stock: physical_count })
    .eq('id', product_id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ count: data })
})

export default router
