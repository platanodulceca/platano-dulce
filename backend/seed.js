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
// Columnas reales: nombre, unidad, stock_minimo, categoria, activo
const productos = [
  // Proteínas
  { nombre: 'Carne de res',        categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 3   },
  { nombre: 'Pollo entero',        categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 4   },
  { nombre: 'Pernil de cerdo',     categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 2   },
  { nombre: 'Chivo',               categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 1   },
  { nombre: 'Mariscos mixtos',     categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 1   },
  { nombre: 'Chicharrón',          categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 1   },
  { nombre: 'Jamón de pierna',     categoria: 'proteinas',   unidad: 'kg',       stock_minimo: 1   },

  // Granos y cereales
  { nombre: 'Arroz blanco',        categoria: 'granos',      unidad: 'kg',       stock_minimo: 10  },
  { nombre: 'Caraotas negras',     categoria: 'granos',      unidad: 'kg',       stock_minimo: 5   },
  { nombre: 'Caraotas rojas',      categoria: 'granos',      unidad: 'kg',       stock_minimo: 2   },
  { nombre: 'Lentejas',            categoria: 'granos',      unidad: 'kg',       stock_minimo: 2   },

  // Harina y masa
  { nombre: 'Harina PAN',          categoria: 'harinas',     unidad: 'kg',       stock_minimo: 8   },
  { nombre: 'Harina de trigo',     categoria: 'harinas',     unidad: 'kg',       stock_minimo: 4   },
  { nombre: 'Maíz tierno molido',  categoria: 'harinas',     unidad: 'kg',       stock_minimo: 2   },

  // Lácteos
  { nombre: 'Queso de mano',       categoria: 'lacteos',     unidad: 'kg',       stock_minimo: 2   },
  { nombre: 'Queso blanco duro',   categoria: 'lacteos',     unidad: 'kg',       stock_minimo: 1.5 },
  { nombre: 'Queso amarillo',      categoria: 'lacteos',     unidad: 'kg',       stock_minimo: 1   },
  { nombre: 'Mantequilla',         categoria: 'lacteos',     unidad: 'kg',       stock_minimo: 0.5 },
  { nombre: 'Leche entera',        categoria: 'lacteos',     unidad: 'litros',   stock_minimo: 4   },
  { nombre: 'Nata / Crema de leche', categoria: 'lacteos',  unidad: 'litros',   stock_minimo: 1   },

  // Vegetales
  { nombre: 'Tomate',              categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 2   },
  { nombre: 'Cebolla',             categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 2   },
  { nombre: 'Ají dulce',           categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 0.5 },
  { nombre: 'Ajo',                 categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 0.3 },
  { nombre: 'Cilantro',            categoria: 'vegetales',   unidad: 'manojos',  stock_minimo: 2   },
  { nombre: 'Aguacate',            categoria: 'vegetales',   unidad: 'unidades', stock_minimo: 5   },
  { nombre: 'Papas',               categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 3   },
  { nombre: 'Pollo desmenuzado',   categoria: 'vegetales',   unidad: 'kg',       stock_minimo: 1.5 },

  // Plátanos
  { nombre: 'Plátano verde',       categoria: 'platanos',    unidad: 'kg',       stock_minimo: 5   },
  { nombre: 'Plátano maduro',      categoria: 'platanos',    unidad: 'kg',       stock_minimo: 5   },
  { nombre: 'Cambur',              categoria: 'platanos',    unidad: 'kg',       stock_minimo: 1   },

  // Bebidas
  { nombre: 'Malta (lata/botella)', categoria: 'bebidas',   unidad: 'unidades', stock_minimo: 12  },
  { nombre: 'Refresco 600ml',      categoria: 'bebidas',    unidad: 'unidades', stock_minimo: 12  },
  { nombre: 'Agua mineral 600ml',  categoria: 'bebidas',    unidad: 'unidades', stock_minimo: 12  },
  { nombre: 'Papelón',             categoria: 'bebidas',    unidad: 'kg',       stock_minimo: 1   },
  { nombre: 'Limón',               categoria: 'bebidas',    unidad: 'kg',       stock_minimo: 0.5 },

  // Aceites y condimentos
  { nombre: 'Aceite vegetal',      categoria: 'condimentos', unidad: 'litros',  stock_minimo: 2   },
  { nombre: 'Sal',                 categoria: 'condimentos', unidad: 'kg',      stock_minimo: 0.5 },
  { nombre: 'Azúcar',              categoria: 'condimentos', unidad: 'kg',      stock_minimo: 2   },
  { nombre: 'Comino',              categoria: 'condimentos', unidad: 'kg',      stock_minimo: 0.2 },
  { nombre: 'Pimienta negra',      categoria: 'condimentos', unidad: 'kg',      stock_minimo: 0.1 },
  { nombre: 'Onoto / Annatto',     categoria: 'condimentos', unidad: 'kg',      stock_minimo: 0.1 },
  { nombre: 'Salsa de tomate',     categoria: 'condimentos', unidad: 'litros',  stock_minimo: 0.5 },
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
      nombre:       p.nombre,
      categoria:    p.categoria,
      unidad:       p.unidad,
      stock_minimo: p.stock_minimo,
      activo:       true,
    }))
    const { error } = await supabase.from('inventario').insert(rows)
    if (error) console.error('  ✗ products:', error.message)
    else console.log(`  ✓ ${rows.length} productos insertados`)
  }

  // ── Cafés (upsert por nombre) ───────────────────────────────
  console.log('\n☕ Cafés...')
  const cafes = [
    { nombre: 'Café Guayoyo',       categoria: 'cafes', precio_usd: 1.50, precio: Math.round(1.50 * RATE), costo: Math.round(1.50 * RATE * 0.20), activo: true },
    { nombre: 'Café con Leche',     categoria: 'cafes', precio_usd: 2.00, precio: Math.round(2.00 * RATE), costo: Math.round(2.00 * RATE * 0.22), activo: true },
    { nombre: 'Capuchino',          categoria: 'cafes', precio_usd: 2.50, precio: Math.round(2.50 * RATE), costo: Math.round(2.50 * RATE * 0.25), activo: true },
    { nombre: 'Chocolate Caliente', categoria: 'cafes', precio_usd: 2.50, precio: Math.round(2.50 * RATE), costo: Math.round(2.50 * RATE * 0.25), activo: true },
  ]
  for (const c of cafes) {
    const { error } = await supabase.from('menu_items').upsert(c, { onConflict: 'nombre' })
    if (error) console.error(`  ✗ ${c.nombre}:`, error.message)
    else console.log(`  ✓ ${c.nombre}  $${c.precio_usd}`)
  }

  console.log('\n✅ Seed completado.\n')
}

seed()
