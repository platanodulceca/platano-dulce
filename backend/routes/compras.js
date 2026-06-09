import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Obtener lista de la semana actual
router.get('/current', async (req, res) => {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const ws = weekStart.toISOString().split('T')[0]
  const we = weekEnd.toISOString().split('T')[0]

  const { data: list } = await supabase
    .from('shopping_lists')
    .select('*, shopping_list_items(*)')
    .eq('week_start', ws)
    .single()

  res.json({ list: list || null, week_start: ws, week_end: we })
})

// Generar lista automática basada en inventario
router.post('/generate', requireRoles('administrador', 'chef', 'dueño'), async (req, res) => {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const ws = weekStart.toISOString().split('T')[0]
  const we = weekEnd.toISOString().split('T')[0]

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)

  // Calcular consumo de los últimos 7 días
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

  const { data: registers } = await supabase
    .from('daily_registers')
    .select('id')
    .gte('date', sevenDaysAgoStr)

  const weeklyConsumption = {}
  if (registers?.length) {
    const registerIds = registers.map(r => r.id)
    const { data: salesItems } = await supabase
      .from('sales_items')
      .select('dish_id, quantity')
      .in('register_id', registerIds)
      .not('dish_id', 'is', null)

    if (salesItems?.length) {
      const dishIds = [...new Set(salesItems.map(s => s.dish_id))]
      const { data: recipes } = await supabase
        .from('recipe_ingredients')
        .select('dish_id, product_id, quantity_per_portion')
        .in('dish_id', dishIds)

      salesItems.forEach(sale => {
        const ings = recipes?.filter(r => r.dish_id === sale.dish_id) || []
        ings.forEach(ing => {
          weeklyConsumption[ing.product_id] = (weeklyConsumption[ing.product_id] || 0)
            + (ing.quantity_per_portion * sale.quantity)
        })
      })
    }
  }

  // Generar items: stock actual < stock mínimo + consumo semanal
  const itemsNeeded = products
    ?.filter(p => {
      const consumption = weeklyConsumption[p.id] || 0
      return p.current_stock < (p.minimum_stock + consumption)
    })
    .map(p => {
      const consumption = weeklyConsumption[p.id] || 0
      const needed = Math.ceil((p.minimum_stock + consumption) - p.current_stock)
      return {
        product_id: p.id,
        product_name: p.name,
        category: p.category,
        quantity_needed: needed,
        unit: p.unit,
        estimated_cost: needed * p.cost_per_unit
      }
    })

  if (!itemsNeeded?.length) {
    return res.json({ message: 'No se necesitan compras esta semana', items: [] })
  }

  // Crear o reemplazar lista
  const { data: existingList } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('week_start', ws)
    .single()

  if (existingList) {
    await supabase.from('shopping_list_items').delete().eq('list_id', existingList.id)
    await supabase.from('shopping_list_items')
      .insert(itemsNeeded.map(i => ({ ...i, list_id: existingList.id })))

    const { data: updatedList } = await supabase
      .from('shopping_lists')
      .select('*, shopping_list_items(*)')
      .eq('id', existingList.id).single()

    return res.json({ list: updatedList })
  }

  const { data: newList, error } = await supabase
    .from('shopping_lists')
    .insert({ week_start: ws, week_end: we, created_by: req.user.id })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })

  await supabase.from('shopping_list_items')
    .insert(itemsNeeded.map(i => ({ ...i, list_id: newList.id })))

  const { data: finalList } = await supabase
    .from('shopping_lists')
    .select('*, shopping_list_items(*)')
    .eq('id', newList.id).single()

  res.status(201).json({ list: finalList })
})

// Marcar ítem como comprado
router.put('/items/:id', async (req, res) => {
  const { purchased, notes } = req.body
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({ purchased, notes })
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ item: data })
})

export default router
