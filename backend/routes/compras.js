import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const semanaActual = () => {
  const d = new Date()
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay()
  const lunes = new Date(d)
  lunes.setDate(d.getDate() + diff)
  return lunes.toISOString().split('T')[0]
}

router.get('/actual', async (req, res) => {
  const semana = semanaActual()
  const { data } = await supabase
    .from('listas_compras')
    .select('*, listas_compras_items(*)')
    .eq('semana', semana).single()
  res.json({ lista: data || null, semana })
})

router.post('/generar', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const semana = semanaActual()

  const { data: productos } = await supabase
    .from('inventario').select('*').eq('activo', true)

  // Obtener el último conteo por producto
  const { data: conteos } = await supabase
    .from('conteos_inventario')
    .select('inventario_id, cantidad_fisica, fecha')
    .order('fecha', { ascending: false })

  const stockActual = {}
  conteos?.forEach(c => {
    if (stockActual[c.inventario_id] === undefined) stockActual[c.inventario_id] = c.cantidad_fisica
  })

  const { data: existing } = await supabase
    .from('listas_compras').select('id').eq('semana', semana).single()

  let lista_id
  if (existing) {
    lista_id = existing.id
    await supabase.from('listas_compras_items').delete().eq('lista_id', lista_id)
  } else {
    const { data: nueva } = await supabase
      .from('listas_compras')
      .insert({ semana, estado: 'borrador', total_estimado: 0 })
      .select('id').single()
    lista_id = nueva.id
  }

  const items = productos
    ?.filter(p => (stockActual[p.id] ?? 0) < p.stock_minimo)
    .map(p => ({
      lista_id,
      inventario_id:      p.id,
      nombre:             p.nombre,
      unidad:             p.unidad,
      cantidad_sugerida:  Math.max(0, p.stock_minimo - (stockActual[p.id] ?? 0)),
      cantidad_ajustada:  null,
      precio_unitario:    0,
      total:              0,
      comprado:           false,
    }))

  if (items?.length) {
    await supabase.from('listas_compras_items').insert(items)
  }

  const { data: listaFinal } = await supabase
    .from('listas_compras').select('*, listas_compras_items(*)').eq('id', lista_id).single()

  res.json({ lista: listaFinal })
})

router.put('/items/:id', async (req, res) => {
  const { cantidad_ajustada, precio_unitario, comprado } = req.body
  const updates = {}
  if (cantidad_ajustada !== undefined) updates.cantidad_ajustada = parseFloat(cantidad_ajustada)
  if (precio_unitario   !== undefined) updates.precio_unitario   = parseFloat(precio_unitario) || 0
  if (comprado          !== undefined) updates.comprado          = comprado
  // Recalcular total si cambian cantidad o precio
  if (updates.cantidad_ajustada !== undefined || updates.precio_unitario !== undefined) {
    const { data: current } = await supabase.from('listas_compras_items').select('cantidad_ajustada,cantidad_sugerida,precio_unitario').eq('id', req.params.id).single()
    const qty = updates.cantidad_ajustada ?? current?.cantidad_ajustada ?? current?.cantidad_sugerida ?? 0
    const pu  = updates.precio_unitario   ?? current?.precio_unitario ?? 0
    updates.total = qty * pu
  }
  const { data, error } = await supabase
    .from('listas_compras_items').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ item: data })
})

export default router
