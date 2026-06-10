// node backend/seed.js  (ejecutar desde la raíz del proyecto)
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// ── Usuarios ──────────────────────────────────────────────────
const usuarios = [
  { email: 'admin@platanodulce.com',   nombre: 'Administrador',  rol: 'admin',   password: 'Admin123!' },
  { email: 'cajero@platanodulce.com',  nombre: 'Cajero',         rol: 'cajero',  password: 'Cajero123!' },
  { email: 'chef@platanodulce.com',    nombre: 'Chef Principal', rol: 'chef',    password: 'Chef123!' },
  { email: 'dueno@platanodulce.com',   nombre: 'Dueño',          rol: 'dueno',   password: 'Dueno123!' },
  { email: 'mesero1@platanodulce.com', nombre: 'Mesero 1',       rol: 'mesero',  password: 'Mesero123!' },
  { email: 'mesero2@platanodulce.com', nombre: 'Mesero 2',       rol: 'mesero',  password: 'Mesero123!' },
]

// ── Menú — Plátano Dulce C.A. ─────────────────────────────────
// Columnas de menu_items: nombre, categoria, precio (Bs), precio_usd, costo
const RATE = 36
const platos = [
  // Pasapalos / Entradas
  { nombre: 'Tequeños (6 uds)',          categoria: 'pasapalos',   precio_usd: 3.50, precio: 3.50 * RATE, costo: 3.50 * RATE * 0.30 },
  { nombre: 'Empanada de Queso',         categoria: 'pasapalos',   precio_usd: 2.00, precio: 2.00 * RATE, costo: 2.00 * RATE * 0.30 },
  { nombre: 'Empanada de Carne',         categoria: 'pasapalos',   precio_usd: 2.50, precio: 2.50 * RATE, costo: 2.50 * RATE * 0.35 },
  { nombre: 'Tostones con Guasacaca',    categoria: 'pasapalos',   precio_usd: 3.00, precio: 3.00 * RATE, costo: 3.00 * RATE * 0.28 },

  // Platos Principales
  { nombre: 'Pabellón Criollo',          categoria: 'principales', precio_usd: 8.00, precio: 8.00 * RATE, costo: 8.00 * RATE * 0.35 },
  { nombre: 'Carne Mechada con Arroz',   categoria: 'principales', precio_usd: 7.50, precio: 7.50 * RATE, costo: 7.50 * RATE * 0.38 },
  { nombre: 'Pollo Guisado con Arroz',   categoria: 'principales', precio_usd: 7.00, precio: 7.00 * RATE, costo: 7.00 * RATE * 0.35 },
  { nombre: 'Pernil al Horno con Arroz', categoria: 'principales', precio_usd: 8.50, precio: 8.50 * RATE, costo: 8.50 * RATE * 0.40 },
  { nombre: 'Chivo en Coco',             categoria: 'principales', precio_usd: 9.00, precio: 9.00 * RATE, costo: 9.00 * RATE * 0.40 },
  { nombre: 'Cazuela de Mariscos',       categoria: 'principales', precio_usd: 10.00, precio: 10.00 * RATE, costo: 10.00 * RATE * 0.42 },

  // Arepas
  { nombre: 'Arepa Reina Pepiada',       categoria: 'arepas',      precio_usd: 4.50, precio: 4.50 * RATE, costo: 4.50 * RATE * 0.32 },
  { nombre: 'Arepa de Pabellón',         categoria: 'arepas',      precio_usd: 5.00, precio: 5.00 * RATE, costo: 5.00 * RATE * 0.35 },
  { nombre: 'Arepa de Pernil',           categoria: 'arepas',      precio_usd: 4.50, precio: 4.50 * RATE, costo: 4.50 * RATE * 0.35 },
  { nombre: 'Arepa de Queso',            categoria: 'arepas',      precio_usd: 3.00, precio: 3.00 * RATE, costo: 3.00 * RATE * 0.28 },
  { nombre: 'Arepa de Chicharrón',       categoria: 'arepas',      precio_usd: 4.00, precio: 4.00 * RATE, costo: 4.00 * RATE * 0.33 },

  // Cachapas
  { nombre: 'Cachapa con Queso de Mano', categoria: 'cachapas',    precio_usd: 5.00, precio: 5.00 * RATE, costo: 5.00 * RATE * 0.33 },
  { nombre: 'Cachapa con Pernil',        categoria: 'cachapas',    precio_usd: 6.00, precio: 6.00 * RATE, costo: 6.00 * RATE * 0.38 },
  { nombre: 'Cachapa con Queso y Jamón', categoria: 'cachapas',    precio_usd: 5.50, precio: 5.50 * RATE, costo: 5.50 * RATE * 0.35 },

  // Bebidas
  { nombre: 'Jugo Natural',              categoria: 'bebidas',     precio_usd: 2.00, precio: 2.00 * RATE, costo: 2.00 * RATE * 0.25 },
  { nombre: 'Papelón con Limón',         categoria: 'bebidas',     precio_usd: 2.00, precio: 2.00 * RATE, costo: 2.00 * RATE * 0.20 },
  { nombre: 'Malta',                     categoria: 'bebidas',     precio_usd: 1.50, precio: 1.50 * RATE, costo: 1.50 * RATE * 0.40 },
  { nombre: 'Refresco',                  categoria: 'bebidas',     precio_usd: 1.50, precio: 1.50 * RATE, costo: 1.50 * RATE * 0.35 },
  { nombre: 'Agua Mineral',              categoria: 'bebidas',     precio_usd: 1.00, precio: 1.00 * RATE, costo: 1.00 * RATE * 0.30 },
  { nombre: 'Guarapo de Caña',           categoria: 'bebidas',     precio_usd: 2.00, precio: 2.00 * RATE, costo: 2.00 * RATE * 0.20 },

  // Postres
  { nombre: 'Quesillo Casero',           categoria: 'postres',     precio_usd: 3.00, precio: 3.00 * RATE, costo: 3.00 * RATE * 0.30 },
  { nombre: 'Dulce de Plátano Maduro',   categoria: 'postres',     precio_usd: 2.50, precio: 2.50 * RATE, costo: 2.50 * RATE * 0.25 },
  { nombre: 'Arroz con Leche',           categoria: 'postres',     precio_usd: 2.50, precio: 2.50 * RATE, costo: 2.50 * RATE * 0.28 },
  { nombre: 'Bienmesabe',                categoria: 'postres',     precio_usd: 3.00, precio: 3.00 * RATE, costo: 3.00 * RATE * 0.28 },
  { nombre: 'Merengón',                  categoria: 'postres',     precio_usd: 3.50, precio: 3.50 * RATE, costo: 3.50 * RATE * 0.32 },
]

// ── Inventario ────────────────────────────────────────────────
const productos = [
  // Proteínas
  { name: 'Carne de res',        category: 'proteinas',   unit: 'kg',  current_stock: 5,  minimum_stock: 3,   cost_per_unit: 8 * RATE },
  { name: 'Pollo entero',        category: 'proteinas',   unit: 'kg',  current_stock: 8,  minimum_stock: 4,   cost_per_unit: 3.5 * RATE },
  { name: 'Pernil de cerdo',     category: 'proteinas',   unit: 'kg',  current_stock: 4,  minimum_stock: 2,   cost_per_unit: 5 * RATE },
  { name: 'Chivo',               category: 'proteinas',   unit: 'kg',  current_stock: 3,  minimum_stock: 1,   cost_per_unit: 6 * RATE },
  { name: 'Mariscos mixtos',     category: 'proteinas',   unit: 'kg',  current_stock: 2,  minimum_stock: 1,   cost_per_unit: 9 * RATE },
  { name: 'Chicharrón',          category: 'proteinas',   unit: 'kg',  current_stock: 2,  minimum_stock: 1,   cost_per_unit: 4 * RATE },
  { name: 'Jamón de pierna',     category: 'proteinas',   unit: 'kg',  current_stock: 2,  minimum_stock: 1,   cost_per_unit: 5 * RATE },

  // Granos y cereales
  { name: 'Arroz blanco',        category: 'granos',      unit: 'kg',  current_stock: 20, minimum_stock: 10,  cost_per_unit: 1.2 * RATE },
  { name: 'Caraotas negras',     category: 'granos',      unit: 'kg',  current_stock: 10, minimum_stock: 5,   cost_per_unit: 1.5 * RATE },
  { name: 'Caraotas rojas',      category: 'granos',      unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 1.5 * RATE },
  { name: 'Lentejas',            category: 'granos',      unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 1.3 * RATE },

  // Harina y masa
  { name: 'Harina PAN',          category: 'harinas',     unit: 'kg',  current_stock: 15, minimum_stock: 8,   cost_per_unit: 1.0 * RATE },
  { name: 'Harina de trigo',     category: 'harinas',     unit: 'kg',  current_stock: 8,  minimum_stock: 4,   cost_per_unit: 1.2 * RATE },
  { name: 'Maíz tierno molido',  category: 'harinas',     unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 0.8 * RATE },

  // Lácteos
  { name: 'Queso de mano',       category: 'lacteos',     unit: 'kg',  current_stock: 4,  minimum_stock: 2,   cost_per_unit: 5 * RATE },
  { name: 'Queso blanco duro',   category: 'lacteos',     unit: 'kg',  current_stock: 3,  minimum_stock: 1.5, cost_per_unit: 4 * RATE },
  { name: 'Queso amarillo',      category: 'lacteos',     unit: 'kg',  current_stock: 2,  minimum_stock: 1,   cost_per_unit: 6 * RATE },
  { name: 'Mantequilla',         category: 'lacteos',     unit: 'kg',  current_stock: 2,  minimum_stock: 0.5, cost_per_unit: 4.5 * RATE },
  { name: 'Leche entera',        category: 'lacteos',     unit: 'litros', current_stock: 10, minimum_stock: 4, cost_per_unit: 1.0 * RATE },
  { name: 'Nata / Crema de leche', category: 'lacteos',  unit: 'litros', current_stock: 3, minimum_stock: 1,  cost_per_unit: 2.5 * RATE },

  // Vegetales y condimentos
  { name: 'Tomate',              category: 'vegetales',   unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 1.0 * RATE },
  { name: 'Cebolla',             category: 'vegetales',   unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 0.8 * RATE },
  { name: 'Ají dulce',           category: 'vegetales',   unit: 'kg',  current_stock: 2,  minimum_stock: 0.5, cost_per_unit: 1.2 * RATE },
  { name: 'Ajo',                 category: 'vegetales',   unit: 'kg',  current_stock: 1,  minimum_stock: 0.3, cost_per_unit: 2.5 * RATE },
  { name: 'Cilantro',            category: 'vegetales',   unit: 'manojos', current_stock: 5, minimum_stock: 2, cost_per_unit: 0.5 * RATE },
  { name: 'Aguacate',            category: 'vegetales',   unit: 'unidades', current_stock: 10, minimum_stock: 5, cost_per_unit: 0.8 * RATE },
  { name: 'Papas',               category: 'vegetales',   unit: 'kg',  current_stock: 8,  minimum_stock: 3,   cost_per_unit: 0.7 * RATE },
  { name: 'Pollo desmenuzado (relleno)', category: 'vegetales', unit: 'kg', current_stock: 3, minimum_stock: 1.5, cost_per_unit: 4 * RATE },

  // Plátanos
  { name: 'Plátano verde',       category: 'platanos',    unit: 'kg',  current_stock: 10, minimum_stock: 5,   cost_per_unit: 0.5 * RATE },
  { name: 'Plátano maduro',      category: 'platanos',    unit: 'kg',  current_stock: 10, minimum_stock: 5,   cost_per_unit: 0.6 * RATE },
  { name: 'Cambur',              category: 'platanos',    unit: 'kg',  current_stock: 3,  minimum_stock: 1,   cost_per_unit: 0.5 * RATE },

  // Bebidas y líquidos
  { name: 'Malta (lata/botella)', category: 'bebidas',   unit: 'unidades', current_stock: 24, minimum_stock: 12, cost_per_unit: 0.6 * RATE },
  { name: 'Refresco 600ml',      category: 'bebidas',    unit: 'unidades', current_stock: 24, minimum_stock: 12, cost_per_unit: 0.5 * RATE },
  { name: 'Agua mineral 600ml',  category: 'bebidas',    unit: 'unidades', current_stock: 24, minimum_stock: 12, cost_per_unit: 0.3 * RATE },
  { name: 'Papelón',             category: 'bebidas',    unit: 'kg',  current_stock: 3,  minimum_stock: 1,   cost_per_unit: 1.0 * RATE },
  { name: 'Limón',               category: 'bebidas',    unit: 'kg',  current_stock: 2,  minimum_stock: 0.5, cost_per_unit: 0.8 * RATE },

  // Aceites y condimentos
  { name: 'Aceite vegetal',      category: 'condimentos', unit: 'litros', current_stock: 4, minimum_stock: 2,  cost_per_unit: 2.0 * RATE },
  { name: 'Sal',                 category: 'condimentos', unit: 'kg',  current_stock: 2,  minimum_stock: 0.5, cost_per_unit: 0.5 * RATE },
  { name: 'Azúcar',              category: 'condimentos', unit: 'kg',  current_stock: 5,  minimum_stock: 2,   cost_per_unit: 0.8 * RATE },
  { name: 'Comino',              category: 'condimentos', unit: 'kg',  current_stock: 0.5, minimum_stock: 0.2, cost_per_unit: 5.0 * RATE },
  { name: 'Pimienta negra',      category: 'condimentos', unit: 'kg',  current_stock: 0.3, minimum_stock: 0.1, cost_per_unit: 8.0 * RATE },
  { name: 'Onoto / Annatto',     category: 'condimentos', unit: 'kg',  current_stock: 0.3, minimum_stock: 0.1, cost_per_unit: 3.0 * RATE },
  { name: 'Salsa de tomate',     category: 'condimentos', unit: 'litros', current_stock: 2, minimum_stock: 0.5, cost_per_unit: 1.5 * RATE },
]

// ── Mesas ─────────────────────────────────────────────────────
const mesas = [
  { number: 1,  name: 'Mesa 1',     capacity: 4 },
  { number: 2,  name: 'Mesa 2',     capacity: 4 },
  { number: 3,  name: 'Mesa 3',     capacity: 4 },
  { number: 4,  name: 'Mesa 4',     capacity: 4 },
  { number: 5,  name: 'Mesa 5',     capacity: 6 },
  { number: 6,  name: 'Mesa 6',     capacity: 6 },
  { number: 7,  name: 'Mesa 7',     capacity: 2 },
  { number: 8,  name: 'Mesa 8',     capacity: 2 },
  { number: 9,  name: 'Terraza 1',  capacity: 4 },
  { number: 10, name: 'Terraza 2',  capacity: 4 },
  { number: 11, name: 'Barra 1',    capacity: 2 },
  { number: 12, name: 'Barra 2',    capacity: 2 },
]

async function seed() {
  // ── Usuarios ────────────────────────────────────────────────
  console.log('\n👤 Usuarios...')
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10)
    const { error } = await supabase.from('users').upsert(
      { email: u.email, nombre: u.nombre, rol: u.rol, password: hash },
      { onConflict: 'email' }
    )
    if (error) console.error(`  ✗ ${u.email}:`, error.message)
    else console.log(`  ✓ ${u.rol.padEnd(8)} ${u.email}  /  ${u.password}`)
  }

  // ── Mesas ───────────────────────────────────────────────────
  console.log('\n🪑 Mesas...')
  const { data: existingTables } = await supabase.from('mesas').select('id').limit(1)
  if (existingTables?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const { error } = await supabase.from('mesas').insert(mesas)
    if (error) console.error('  ✗ mesas:', error.message)
    else console.log(`  ✓ ${mesas.length} mesas insertadas`)
  }

  // ── Platos del menú ─────────────────────────────────────────
  console.log('\n🍽️  Platos del menú...')
  const { data: existingDishes } = await supabase.from('menu_items').select('id').limit(1)
  if (existingDishes?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const rows = platos.map(p => ({
      nombre:    p.nombre,
      categoria: p.categoria,
      precio:    Math.round(p.precio),
      precio_usd: p.precio_usd,
      costo:     Math.round(p.costo),
      activo:    true,
    }))
    const { error } = await supabase.from('menu_items').insert(rows)
    if (error) console.error('  ✗ dishes:', error.message)
    else console.log(`  ✓ ${rows.length} platos insertados`)
  }

  // ── Productos de inventario ─────────────────────────────────
  console.log('\n📦 Inventario...')
  const { data: existingProducts } = await supabase.from('inventario').select('id').limit(1)
  if (existingProducts?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const rows = productos.map(p => ({
      ...p,
      cost_per_unit: Math.round(p.cost_per_unit),
      active: true,
    }))
    const { error } = await supabase.from('inventario').insert(rows)
    if (error) console.error('  ✗ products:', error.message)
    else console.log(`  ✓ ${rows.length} productos insertados`)
  }

  console.log('\n✅ Seed completado.\n')
}

seed()
