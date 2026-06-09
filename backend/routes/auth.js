import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('active', true)
    .limit(1)
    // mesero is a valid role

  if (error || !users?.length) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const user = users[0]
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, name, role, active')
    .eq('id', req.user.id)
    .single()

  if (error || !user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  res.json({ user })
})

router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

export default router
