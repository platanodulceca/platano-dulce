import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const d7 = new Date(); d7.setDate(d7.getDate() - 7)
  const desde = d7.toISOString().split('T')[0]

  const [cajaRes, semanaRes, ordenesRes, cuentasRes] = await Promise.all([
    supabase.from('caja_registros').select('*, caja_pagos(*), venta_items(*)').eq('fecha', today).single(),
    supabase.from('caja_registros').select('fecha, tasa_bcv, caja_pagos(*), venta_items(nombre,cantidad)').gte('fecha', desde).order('fecha'),
    supabase.from('ordenes').select('id, estado').not('estado', 'in', '("cobrada","cancelada")'),
    supabase.from('cuentas_cobrar').select('monto_usd, monto_bs').eq('estado', 'pendiente'),
  ])

  const caja  = cajaRes.data
  const tasa  = caja?.tasa_bcv || 1

  const calcBs = (pagos) => {
    let bs = 0
    pagos?.forEach(p => {
      bs += p.moneda === 'usd' ? Number(p.monto) * tasa : Number(p.monto)
    })
    return bs
  }

  const ventaHoyBs  = calcBs(caja?.caja_pagos)
  const ventaHoyUsd = tasa > 0 ? ventaHoyBs / tasa : 0
  const itemsHoy    = caja?.venta_items?.reduce((s, i) => s + Number(i.cantidad), 0) || 0

  const series = (semanaRes.data || []).map(r => ({
    fecha:    r.fecha,
    total_bs: calcBs(r.caja_pagos),
    tasa:     r.tasa_bcv,
  }))

  // Top platos de la semana
  const todasVentas = (semanaRes.data || []).flatMap(r => r.venta_items || [])
  const conteo = {}
  todasVentas.forEach(v => {
    conteo[v.nombre] = (conteo[v.nombre] || 0) + Number(v.cantidad)
  })
  const topPlatos = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))

  res.json({
    hoy: {
      fecha:       today,
      venta_bs:    ventaHoyBs,
      venta_usd:   ventaHoyUsd,
      tasa_bcv:    tasa,
      cerrado:     caja?.cerrado || false,
      items_count: itemsHoy,
    },
    ordenes_activas:        ordenesRes.data?.length || 0,
    cuentas_pendientes_usd: cuentasRes.data?.reduce((s, c) => s + Number(c.monto_usd), 0) || 0,
    series,
    top_platos: topPlatos,
  })
})

export default router
