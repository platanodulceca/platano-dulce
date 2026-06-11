import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('mesas').select('*').order('numero')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ mesas: data })
})

router.post('/', requireRoles('admin', 'dueno'), async (req, res) => {
  const { numero, capacidad } = req.body
  const { data, error } = await supabase
    .from('mesas')
    .insert({ numero: parseInt(numero), capacidad: parseInt(capacidad) || 4, estado: 'disponible' })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ mesa: data })
})

router.put('/:id', async (req, res) => {
  const { numero, capacidad, estado } = req.body
  const updates = {}
  if (numero    !== undefined) updates.numero    = parseInt(numero)
  if (capacidad !== undefined) updates.capacidad = parseInt(capacidad)
  if (estado    !== undefined) updates.estado    = estado
  const { data, error } = await supabase
    .from('mesas').update(updates).eq('id', req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ mesa: data })
})

router.delete('/:id', requireRoles('admin', 'dueno'), async (req, res) => {
  const { error } = await supabase.from('mesas').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Mesa eliminada' })
})

export default router
