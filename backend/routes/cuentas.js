import { Router } from 'express'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { status } = req.query
  let query = supabase
    .from('accounts_receivable')
    .select('*')
    .order('date', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  // Marcar vencidos automáticamente
  const today = new Date().toISOString().split('T')[0]
  const updated = data?.map(a => {
    if (a.status === 'pendiente' && a.due_date && a.due_date < today) {
      return { ...a, status: 'vencido' }
    }
    return a
  })

  res.json({ accounts: updated })
})

router.post('/', async (req, res) => {
  const { client_name, client_phone, amount_bs, amount_usd, date, due_date, notes, register_id } = req.body
  const { data, error } = await supabase
    .from('accounts_receivable')
    .insert({ client_name, client_phone, amount_bs, amount_usd, date, due_date, notes, register_id })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ account: data })
})

router.put('/:id', async (req, res) => {
  const { status, paid_date, notes, amount_bs, amount_usd } = req.body
  const updates = { notes }
  if (status) updates.status = status
  if (paid_date) updates.paid_date = paid_date
  if (amount_bs !== undefined) updates.amount_bs = amount_bs
  if (amount_usd !== undefined) updates.amount_usd = amount_usd
  if (status === 'pagado' && !paid_date) updates.paid_date = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('accounts_receivable')
    .update(updates)
    .eq('id', req.params.id)
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ account: data })
})

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('accounts_receivable')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Registro eliminado' })
})

export default router
