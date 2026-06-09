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
// price_usd: precio de venta en dólares
// price_bs:  precio en bolívares (aprox. rate 36 Bs/$)
// cost_bs:   costo de producción (~35% del precio en Bs)
const RATE = 36
const platos = [
  // Pasapalos / Entradas
  { name: 'Tequeños (6 uds)',          category: 'pasapalos', price_usd: 3.50, price_bs: 3.50 * RATE, cost_bs: 3.50 * RATE * 0.30 },
  { name: 'Empanada de Queso',         category: 'pasapalos', price_usd: 2.00, price_bs: 2.00 * RATE, cost_bs: 2.00 * RATE * 0.30 },
  { name: 'Empanada de Carne',         category: 'pasapalos', price_usd: 2.50, price_bs: 2.50 * RATE, cost_bs: 2.50 * RATE * 0.35 },
  { name: 'Tostones con Guasacaca',    category: 'pasapalos', price_usd: 3.00, price_bs: 3.00 * RATE, cost_bs: 3.00 * RATE * 0.28 },

  // Platos Principales
  { name: 'Pabellón Criollo',          category: 'principales', price_usd: 8.00, price_bs: 8.00 * RATE, cost_bs: 8.00 * RATE * 0.35 },
  { name: 'Carne Mechada con Arroz',   category: 'principales', price_usd: 7.50, price_bs: 7.50 * RATE, cost_bs: 7.50 * RATE * 0.38 },
  { name: 'Pollo Guisado con Arroz',   category: 'principales', price_usd: 7.00, price_bs: 7.00 * RATE, cost_bs: 7.00 * RATE * 0.35 },
  { name: 'Pernil al Horno con Arroz', category: 'principales', price_usd: 8.50, price_bs: 8.50 * RATE, cost_bs: 8.50 * RATE * 0.40 },
  { name: 'Chivo en Coco',             category: 'principales', price_usd: 9.00, price_bs: 9.00 * RATE, cost_bs: 9.00 * RATE * 0.40 },
  { name: 'Cazuela de Mariscos',       category: 'principales', price_usd: 10.00, price_bs: 10.00 * RATE, cost_bs: 10.00 * RATE * 0.42 },

  // Arepas
  { name: 'Arepa Reina Pepiada',       category: 'arepas', price_usd: 4.50, price_bs: 4.50 * RATE, cost_bs: 4.50 * RATE * 0.32 },
  { name: 'Arepa de Pabellón',         category: 'arepas', price_usd: 5.00, price_bs: 5.00 * RATE, cost_bs: 5.00 * RATE * 0.35 },
  { name: 'Arepa de Pernil',           category: 'arepas', price_usd: 4.50, price_bs: 4.50 * RATE, cost_bs: 4.50 * RATE * 0.35 },
  { name: 'Arepa de Queso',            category: 'arepas', price_usd: 3.00, price_bs: 3.00 * RATE, cost_bs: 3.00 * RATE * 0.28 },
  { name: 'Arepa de Chicharrón',       category: 'arepas', price_usd: 4.00, price_bs: 4.00 * RATE, cost_bs: 4.00 * RATE * 0.33 },

  // Cachapas
  { name: 'Cachapa con Queso de Mano', category: 'cachapas', price_usd: 5.00, price_bs: 5.00 * RATE, cost_bs: 5.00 * RATE * 0.33 },
  { name: 'Cachapa con Pernil',        category: 'cachapas', price_usd: 6.00, price_bs: 6.00 * RATE, cost_bs: 6.00 * RATE * 0.38 },
  { name: 'Cachapa con Queso y Jamón', category: 'cachapas', price_usd: 5.50, price_bs: 5.50 * RATE, cost_bs: 5.50 * RATE * 0.35 },

  // Bebidas
  { name: 'Jugo Natural',              category: 'bebidas', price_usd: 2.00, price_bs: 2.00 * RATE, cost_bs: 2.00 * RATE * 0.25 },
  { name: 'Papelón con Limón',         category: 'bebidas', price_usd: 2.00, price_bs: 2.00 * RATE, cost_bs: 2.00 * RATE * 0.20 },
  { name: 'Malta',                     category: 'bebidas', price_usd: 1.50, price_bs: 1.50 * RATE, cost_bs: 1.50 * RATE * 0.40 },
  { name: 'Refresco',                  category: 'bebidas', price_usd: 1.50, price_bs: 1.50 * RATE, cost_bs: 1.50 * RATE * 0.35 },
  { name: 'Agua Mineral',              category: 'bebidas', price_usd: 1.00, price_bs: 1.00 * RATE, cost_bs: 1.00 * RATE * 0.30 },
  { name: 'Guarapo de Caña',           category: 'bebidas', price_usd: 2.00, price_bs: 2.00 * RATE, cost_bs: 2.00 * RATE * 0.20 },

  // Postres
  { name: 'Quesillo Casero',           category: 'postres', price_usd: 3.00, price_bs: 3.00 * RATE, cost_bs: 3.00 * RATE * 0.30 },
  { name: 'Dulce de Plátano Maduro',   category: 'postres', price_usd: 2.50, price_bs: 2.50 * RATE, cost_bs: 2.50 * RATE * 0.25 },
  { name: 'Arroz con Leche',           category: 'postres', price_usd: 2.50, price_bs: 2.50 * RATE, cost_bs: 2.50 * RATE * 0.28 },
  { name: 'Bienmesabe',                category: 'postres', price_usd: 3.00, price_bs: 3.00 * RATE, cost_bs: 3.00 * RATE * 0.28 },
  { name: 'Merengón',                  category: 'postres', price_usd: 3.50, price_bs: 3.50 * RATE, cost_bs: 3.50 * RATE * 0.32 },
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
  const { data: existingTables } = await supabase.from('tables').select('id').limit(1)
  if (existingTables?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const { error } = await supabase.from('tables').insert(mesas)
    if (error) console.error('  ✗ mesas:', error.message)
    else console.log(`  ✓ ${mesas.length} mesas insertadas`)
  }

  // ── Platos del menú ─────────────────────────────────────────
  console.log('\n🍽️  Platos del menú...')
  const { data: existingDishes } = await supabase.from('dishes').select('id').limit(1)
  if (existingDishes?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const rows = platos.map(p => ({
      ...p,
      price_bs:  Math.round(p.price_bs),
      cost_bs:   Math.round(p.cost_bs),
      active: true,
    }))
    const { error } = await supabase.from('dishes').insert(rows)
    if (error) console.error('  ✗ dishes:', error.message)
    else console.log(`  ✓ ${rows.length} platos insertados`)
  }

  // ── Productos de inventario ─────────────────────────────────
  console.log('\n📦 Inventario...')
  const { data: existingProducts } = await supabase.from('products').select('id').limit(1)
  if (existingProducts?.length) {
    console.log('  ↳ ya existen, se omiten')
  } else {
    const rows = productos.map(p => ({
      ...p,
      cost_per_unit: Math.round(p.cost_per_unit),
      active: true,
    }))
    const { error } = await supabase.from('products').insert(rows)
    if (error) console.error('  ✗ products:', error.message)
    else console.log(`  ✓ ${rows.length} productos insertados`)
  }

  console.log('\n✅ Seed completado.\n')
}

seed()
