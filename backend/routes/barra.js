import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const BARRA_CATEGORIAS = ['bebidas', 'cafes', 'jugos', 'smoothies', 'cervezas', 'bar']

router.get('/active', async (req, res) => {
  const { data: ordenes } = await supabase
    .from('ordenes')
    .select('*, orden_items(*), mesas(numero)')
    .in('estado', ['pendiente', 'en_preparacion', 'listo'])
    .order('id', { ascending: true })

  const barraOrdenes = (ordenes || [])
    .map(o => ({
      ...o,
      orden_items: (o.orden_items || []).filter(i =>
        BARRA_CATEGORIAS.includes((i.categoria || '').toLowerCase())
      ),
    }))
    .filter(o => o.orden_items.length > 0)

  res.json({ orders: barraOrdenes })
})

export default router
