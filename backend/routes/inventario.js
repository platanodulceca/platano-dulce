import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('inventario')
    .select('*')
    .order('categoria').order('nombre')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ inventario: data })
})

router.post('/', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { nombre, categoria, unidad, stock_minimo } = req.body
  const { data, error } = await supabase
    .from('inventario')
    .insert({ nombre, categoria, unidad, stock_minimo: parseFloat(stock_minimo) || 0, activo: true })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ producto: data })
})

router.put('/:id', requireRoles('admin', 'chef', 'dueno'), async (req, res) => {
  const { nombre, categoria, unidad, stock_minimo, activo } = req.body
  const updates = {}
  if (nombre       !== undefined) updates.nombre       = nombre
  if (categoria    !== undefined) updates.categoria    = categoria
  if (unidad       !== undefined) updates.unidad       = unidad
  if (stock_minimo !== undefined) updates.stock_minimo = parseFloat(stock_minimo) || 0
  if (activo       !== undefined) updates.activo       = activo
  const { data, error } = await supabase
    .from('inventario').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ producto: data })
})

// Conteo del día (con última lectura conocida)
router.get('/conteo/hoy', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const dia_semana = dias[new Date().getDay()]

  const { data: productos } = await supabase
    .from('inventario').select('*').eq('activo', true).order('categoria').order('nombre')

  const { data: conteos } = await supabase
    .from('conteos_inventario').select('*').eq('fecha', today)

  const mapa = {}
  conteos?.forEach(c => { mapa[c.inventario_id] = c })

  const resultado = productos?.map(p => ({
    ...p,
    conteo_hoy:      mapa[p.id] || null,
    cantidad_fisica: mapa[p.id]?.cantidad_fisica ?? null,
    bajo_minimo:     (mapa[p.id]?.cantidad_fisica ?? Infinity) < p.stock_minimo,
  })) || []

  res.json({ inventario: resultado, fecha: today, dia_semana })
})

// Guardar conteo físico
router.post('/conteo', requireRoles('admin', 'chef', 'dueno', 'cajero'), async (req, res) => {
  const { inventario_id, cantidad_fisica, cantidad_teorica, diferencia } = req.body
  const today = new Date().toISOString().split('T')[0]
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const dia_semana = dias[new Date().getDay()]

  const { data: existing } = await supabase
    .from('conteos_inventario')
    .select('id').eq('inventario_id', inventario_id).eq('fecha', today).single()

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('conteos_inventario')
      .update({ cantidad_fisica, cantidad_teorica, diferencia })
      .eq('id', existing.id).select().single())
  } else {
    ;({ data, error } = await supabase
      .from('conteos_inventario')
      .insert({ inventario_id, fecha: today, dia_semana, cantidad_fisica, cantidad_teorica, diferencia })
      .select().single())
  }
  if (error) return res.status(500).json({ error: error.message })
  res.json({ conteo: data })
})

export default router
