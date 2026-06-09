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
    .limit(1)

  if (error || !users?.length) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const u = users[0]

  // Soporta tanto 'password' como 'password_hash' según el schema
  const storedHash = u.password ?? u.password_hash
  if (!storedHash) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const valid = await bcrypt.compare(password, storedHash)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  // Normalizar campos: soporta nombre/name y rol/role
  const name = u.nombre ?? u.name ?? u.email
  const role = u.rol   ?? u.role

  const token = jwt.sign(
    { id: u.id, email: u.email, name, role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  )

  res.json({
    token,
    user: { id: u.id, email: u.email, name, role }
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const { data: u, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (error || !u) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const name = u.nombre ?? u.name ?? u.email
  const role = u.rol   ?? u.role

  res.json({ user: { id: u.id, email: u.email, name, role } })
})

router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Sesión cerrada' })
})

export default router
