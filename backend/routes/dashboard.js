import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/summary', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: register } = await supabase
    .from('caja_registros')
    .select('*, caja_pagos(*), sales_items(*)')
    .eq('date', today)
    .single()

  const { data: pendingAccounts } = await supabase
    .from('accounts_receivable')
    .select('id, amount_bs, client_name')
    .eq('status', 'pendiente')

  const { data: allProducts } = await supabase
    .from('inventario')
    .select('id, name, current_stock, minimum_stock, unit')
    .eq('active', true)
  const alertProducts = allProducts?.filter(p => Number(p.current_stock) <= Number(p.minimum_stock)) || []

  let totalBs = 0
  let totalUsd = 0
  let totalCost = 0
  const rate = register?.exchange_rate_bcv || 1

  if (register?.caja_pagos) {
    register.caja_pagos.forEach(p => {
      if (p.moneda === 'bs') {
        totalBs += Number(p.monto)
      } else {
        totalUsd += Number(p.monto)
        totalBs += Number(p.monto) * rate
      }
    })
    totalUsd = rate > 0 ? totalBs / rate : 0
  }

  if (register?.sales_items) {
    register.sales_items.forEach(i => {
      totalCost += Number(i.cost_bs) * i.quantity
    })
  }

  const totalItems = register?.sales_items?.reduce((s, i) => s + i.quantity, 0) || 0
  const avgTicket = totalItems > 0 ? totalBs / totalItems : 0
  const margin = totalBs > 0 ? ((totalBs - totalCost) / totalBs) * 100 : 0

  res.json({
    today: {
      date: today,
      total_bs: totalBs,
      total_usd: totalUsd,
      total_cost: totalCost,
      total_items: totalItems,
      avg_ticket_bs: avgTicket,
      margin_pct: margin,
      register_status: register?.status || 'sin_registro',
      exchange_rate: rate
    },
    pending_accounts: pendingAccounts || [],
    pending_amount_bs: pendingAccounts?.reduce((s, a) => s + Number(a.amount_bs), 0) || 0
  })
})

router.get('/top-dishes', async (req, res) => {
  const { days = 7 } = req.query
  const since = new Date()
  since.setDate(since.getDate() - Number(days))
  const sinceStr = since.toISOString().split('T')[0]

  const { data: registers } = await supabase
    .from('caja_registros')
    .select('id')
    .gte('date', sinceStr)

  if (!registers?.length) return res.json({ dishes: [] })

  const { data: items } = await supabase
    .from('sales_items')
    .select('dish_name, item_type, quantity, price_bs')
    .in('register_id', registers.map(r => r.id))

  const aggregated = {}
  items?.forEach(i => {
    const key = i.dish_name
    if (!aggregated[key]) {
      aggregated[key] = { name: key, type: i.item_type, quantity: 0, revenue_bs: 0 }
    }
    aggregated[key].quantity += i.quantity
    aggregated[key].revenue_bs += Number(i.price_bs) * i.quantity
  })

  const sorted = Object.values(aggregated)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  res.json({ dishes: sorted })
})

router.get('/historial', async (req, res) => {
  const { limit = 30 } = req.query
  const { data, error } = await supabase
    .from('caja_registros')
    .select('*, caja_pagos(*), sales_items(id, dish_name, quantity, price_bs, cost_bs)')
    .eq('status', 'cerrado')
    .order('date', { ascending: false })
    .limit(Number(limit))

  if (error) return res.status(500).json({ error: error.message })
  res.json({ history: data })
})

export default router
