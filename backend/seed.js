// Ejecutar una sola vez: node seed.js
// Crea los 4 usuarios por defecto con passwords hasheadas

import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const usuarios = [
  { email: 'admin@platanodulce.com',   nombre: 'Administrador',  rol: 'admin',   password: 'Admin123!' },
  { email: 'cajero@platanodulce.com',  nombre: 'Cajero',         rol: 'cajero',  password: 'Cajero123!' },
  { email: 'chef@platanodulce.com',    nombre: 'Chef Principal', rol: 'chef',    password: 'Chef123!' },
  { email: 'dueno@platanodulce.com',   nombre: 'Dueño',          rol: 'dueno',   password: 'Dueno123!' },
  { email: 'mesero1@platanodulce.com', nombre: 'Mesero 1',       rol: 'mesero',  password: 'Mesero123!' },
  { email: 'mesero2@platanodulce.com', nombre: 'Mesero 2',       rol: 'mesero',  password: 'Mesero123!' },
]

async function seed() {
  console.log('Insertando usuarios...')
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10)
    const { error } = await supabase.from('users').upsert(
      { email: u.email, nombre: u.nombre, rol: u.rol, password: hash },
      { onConflict: 'email' }
    )
    if (error) {
      console.error(`Error con ${u.email}:`, error.message)
    } else {
      console.log(`✓ ${u.rol} — ${u.email} / ${u.password}`)
    }
  }
  console.log('\nSeed completado.')
}

seed()
