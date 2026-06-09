// Ejecutar una sola vez: node seed.js
// Crea los 4 usuarios por defecto con passwords hasheadas

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const usuarios = [
  { email: 'admin@platanodulce.com',   name: 'Administrador',  role: 'administrador', password: 'Admin123!' },
  { email: 'cajero@platanodulce.com',  name: 'Cajero',         role: 'cajero',        password: 'Cajero123!' },
  { email: 'chef@platanodulce.com',    name: 'Chef Principal', role: 'chef',          password: 'Chef123!' },
  { email: 'dueno@platanodulce.com',   name: 'Dueño',          role: 'dueño',         password: 'Dueno123!' },
  { email: 'mesero1@platanodulce.com', name: 'Mesero 1',       role: 'mesero',        password: 'Mesero123!' },
  { email: 'mesero2@platanodulce.com', name: 'Mesero 2',       role: 'mesero',        password: 'Mesero123!' },
]

async function seed() {
  console.log('Insertando usuarios...')
  for (const u of usuarios) {
    const password_hash = await bcrypt.hash(u.password, 10)
    const { error } = await supabase.from('users').upsert(
      { email: u.email, name: u.name, role: u.role, password_hash },
      { onConflict: 'email' }
    )
    if (error) {
      console.error(`Error con ${u.email}:`, error.message)
    } else {
      console.log(`✓ ${u.role} — ${u.email} / ${u.password}`)
    }
  }
  console.log('\nSeed completado.')
}

seed()
