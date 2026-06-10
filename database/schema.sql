-- ============================================================
-- PLÁTANO DULCE C.A. — Schema Supabase / PostgreSQL
-- ============================================================

-- ─── USUARIOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  rol         VARCHAR(50) NOT NULL CHECK (rol IN ('admin','cajero','chef','dueno','mesero')),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PRODUCTOS / INVENTARIO ─────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100) NOT NULL CHECK (category IN ('viveres_barra_bebidas','frutas_vegetales','carniceria_frigorifico')),
  unit          VARCHAR(50) NOT NULL,
  minimum_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLATOS / MENÚ ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dishes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(50) NOT NULL CHECK (category IN ('plato','bebida','postre','entrada','otro')),
  price_bs    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_usd   NUMERIC(10,4) DEFAULT 0,
  cost_bs     NUMERIC(10,2) DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RECETARIO ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id              UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_per_portion NUMERIC(10,4) NOT NULL,
  UNIQUE(dish_id, product_id)
);

-- ─── REGISTRO DIARIO DE CAJA ────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_registers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date              DATE NOT NULL UNIQUE,
  exchange_rate_bcv NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','cerrado')),
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  closed_by         UUID REFERENCES users(id),
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MÉTODOS DE PAGO POR DÍA ────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_payments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id  UUID NOT NULL REFERENCES daily_registers(id) ON DELETE CASCADE,
  method       VARCHAR(50) NOT NULL CHECK (method IN (
                 'efectivo_bs','efectivo_usd','pago_movil','punto_venta',
                 'zelle','transferencia','delivery','propina','vuelto','credito_fiado'
               )),
  amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency     VARCHAR(5) NOT NULL DEFAULT 'bs' CHECK (currency IN ('bs','usd')),
  notes        TEXT
);

-- ─── ARTÍCULOS VENDIDOS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID NOT NULL REFERENCES daily_registers(id) ON DELETE CASCADE,
  dish_id     UUID REFERENCES dishes(id),
  dish_name   VARCHAR(255) NOT NULL,
  item_type   VARCHAR(20) NOT NULL DEFAULT 'plato' CHECK (item_type IN ('plato','bebida','postre','entrada','otro')),
  quantity    INTEGER NOT NULL DEFAULT 1,
  price_bs    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_usd   NUMERIC(10,4) DEFAULT 0,
  cost_bs     NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTEO FÍSICO DE INVENTARIO ────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_counts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date              DATE NOT NULL,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  physical_count    NUMERIC(10,3) NOT NULL DEFAULT 0,
  theoretical_count NUMERIC(10,3) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'ok' CHECK (status IN ('ok','reponer','agotado')),
  counted_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, product_id)
);

-- ─── LISTAS DE COMPRAS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_lists (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL,
  week_end    DATE NOT NULL,
  status      VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente','completada')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id          UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id),
  product_name     VARCHAR(255) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  quantity_needed  NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit             VARCHAR(50) NOT NULL,
  estimated_cost   NUMERIC(10,2),
  purchased        BOOLEAN DEFAULT false,
  notes            TEXT
);

-- ─── CUENTAS POR COBRAR ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name  VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  amount_bs    NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_usd   NUMERIC(10,4) DEFAULT 0,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','pagado','vencido')),
  register_id  UUID REFERENCES daily_registers(id),
  notes        TEXT,
  paid_date    DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLAS NUEVAS (español) ────────────────────────────────

-- Menú del restaurante (reemplaza dishes)
CREATE TABLE IF NOT EXISTS menu_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     VARCHAR(255) NOT NULL,
  categoria  VARCHAR(50) NOT NULL,
  precio     NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_usd NUMERIC(10,4) DEFAULT 0,
  costo      NUMERIC(10,2) DEFAULT 0,
  activo     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos individuales de caja (reemplaza daily_payments)
-- Requiere que exista la tabla caja_registros
CREATE TABLE IF NOT EXISTS caja_pagos (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caja_id    UUID NOT NULL REFERENCES caja_registros(id) ON DELETE CASCADE,
  metodo     VARCHAR(50) NOT NULL CHECK (metodo IN (
               'efectivo_bs','efectivo_usd','pago_movil','punto_venta',
               'zelle','transferencia','delivery','propina','vuelto','credito_fiado'
             )),
  monto      NUMERIC(10,2) NOT NULL DEFAULT 0,
  moneda     VARCHAR(5) NOT NULL DEFAULT 'bs' CHECK (moneda IN ('bs','usd')),
  referencia TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caja_pagos_caja     ON caja_pagos(caja_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_categoria ON menu_items(categoria);

-- ─── ÓRDENES ────────────────────────────────────────────────
-- Requiere: mesas, users, caja_registros (ya existen en Supabase)
CREATE TABLE IF NOT EXISTS ordenes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id      UUID REFERENCES mesas(id),
  table_number  INTEGER,
  table_name    VARCHAR(255),
  waiter_id     UUID NOT NULL REFERENCES users(id),
  waiter_name   VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'borrador'
                  CHECK (status IN ('borrador','pendiente','en_preparacion','lista','entregada','cobrada','cancelada')),
  notes         TEXT,
  total_bs      NUMERIC(10,2) DEFAULT 0,
  sent_at       TIMESTAMPTZ,
  ready_at      TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  cobrado_at    TIMESTAMPTZ,
  register_id   UUID REFERENCES caja_registros(id),
  split_count   INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orden_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  dish_id     UUID REFERENCES menu_items(id),
  dish_name   VARCHAR(255) NOT NULL,
  item_type   VARCHAR(20) DEFAULT 'plato',
  quantity    INTEGER NOT NULL DEFAULT 1,
  price_bs    NUMERIC(10,2) DEFAULT 0,
  cost_bs     NUMERIC(10,2) DEFAULT 0,
  notes       TEXT,
  status      VARCHAR(20) DEFAULT 'pendiente'
                CHECK (status IN ('pendiente','en_preparacion','listo','entregado','cancelado')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ARTÍCULOS VENDIDOS POR CAJA ────────────────────────────
CREATE TABLE IF NOT EXISTS venta_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  register_id UUID NOT NULL REFERENCES caja_registros(id) ON DELETE CASCADE,
  dish_id     UUID REFERENCES menu_items(id),
  dish_name   VARCHAR(255) NOT NULL,
  item_type   VARCHAR(20) DEFAULT 'plato',
  quantity    INTEGER NOT NULL DEFAULT 1,
  price_bs    NUMERIC(10,2) DEFAULT 0,
  price_usd   NUMERIC(10,4) DEFAULT 0,
  cost_bs     NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CUENTAS POR COBRAR ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuentas_cobrar (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name  VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  amount_bs    NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_usd   NUMERIC(10,4) DEFAULT 0,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                 CHECK (status IN ('pendiente','pagado','vencido')),
  register_id  UUID REFERENCES caja_registros(id),
  notes        TEXT,
  paid_date    DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RECETARIO ──────────────────────────────────────────────
-- Requiere: menu_items, inventario
CREATE TABLE IF NOT EXISTS receta_ingredientes (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_id              UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  quantity_per_portion NUMERIC(10,4) NOT NULL,
  UNIQUE(dish_id, product_id)
);

-- ─── LISTAS DE COMPRAS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS listas_compras (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL,
  week_end    DATE NOT NULL,
  status      VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente','completada')),
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listas_compras_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id          UUID NOT NULL REFERENCES listas_compras(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES inventario(id),
  product_name     VARCHAR(255) NOT NULL,
  category         VARCHAR(100) NOT NULL,
  quantity_needed  NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit             VARCHAR(50) NOT NULL,
  estimated_cost   NUMERIC(10,2),
  purchased        BOOLEAN DEFAULT false,
  notes            TEXT
);

-- ─── CONTEOS DE INVENTARIO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS conteos_inventario (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date           DATE NOT NULL,
  product_id     UUID NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  physical_count NUMERIC(10,3) NOT NULL DEFAULT 0,
  counted_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, product_id)
);

-- ─── ÍNDICES NUEVAS TABLAS ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ordenes_status        ON ordenes(status);
CREATE INDEX IF NOT EXISTS idx_ordenes_waiter        ON ordenes(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orden_items_order     ON orden_items(order_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_register  ON venta_items(register_id);
CREATE INDEX IF NOT EXISTS idx_venta_items_dish      ON venta_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_status        ON cuentas_cobrar(status);
CREATE INDEX IF NOT EXISTS idx_receta_dish           ON receta_ingredientes(dish_id);
CREATE INDEX IF NOT EXISTS idx_listas_compras_status ON listas_compras(status);
CREATE INDEX IF NOT EXISTS idx_conteos_date          ON conteos_inventario(date);
CREATE INDEX IF NOT EXISTS idx_conteos_product       ON conteos_inventario(product_id);

-- ─── ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_registers_date      ON daily_registers(date);
CREATE INDEX IF NOT EXISTS idx_daily_payments_register   ON daily_payments(register_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_register      ON sales_items(register_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_dish          ON sales_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_date     ON inventory_counts(date);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_product  ON inventory_counts(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_dish   ON recipe_ingredients(dish_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status);

-- ─── DATOS SEMILLA — Usuarios por defecto ───────────────────
-- Passwords (bcrypt, 10 rounds):
--   Admin123!   → $2b$10$7x9qK2L4m3N8pR1sT5vYuO5e.JQmZhXwIkLdA3fPgHjMnBqCyDtFu
--   Cajero123!  → (generado con seed.js)
--   Chef123!    → (generado con seed.js)
--   Dueno123!   → (generado con seed.js)
-- EJECUTAR: cd backend && node seed.js

-- ─── DATOS DEMO — Productos base ────────────────────────────
INSERT INTO products (name, category, unit, minimum_stock, current_stock, cost_per_unit) VALUES
  ('Harina PAN',          'viveres_barra_bebidas',  'kg',   5,   10,  4.50),
  ('Aceite',              'viveres_barra_bebidas',  'lt',   3,    5,  3.20),
  ('Azúcar',              'viveres_barra_bebidas',  'kg',   4,    8,  2.80),
  ('Sal',                 'viveres_barra_bebidas',  'kg',   2,    4,  1.50),
  ('Plátano maduro',      'frutas_vegetales',       'kg',   3,    6,  2.00),
  ('Tomate',              'frutas_vegetales',       'kg',   2,    4,  3.00),
  ('Cebolla',             'frutas_vegetales',       'kg',   2,    5,  2.50),
  ('Cilantro',            'frutas_vegetales',       'mazo', 2,    4,  1.00),
  ('Pimentón',            'frutas_vegetales',       'kg',   1,    3,  4.00),
  ('Pollo entero',        'carniceria_frigorifico', 'kg',   5,   10,  7.00),
  ('Carne molida',        'carniceria_frigorifico', 'kg',   3,    6,  9.00),
  ('Pernil de cerdo',     'carniceria_frigorifico', 'kg',   3,    5,  8.50),
  ('Queso blanco',        'carniceria_frigorifico', 'kg',   2,    4, 12.00),
  ('Leche',               'carniceria_frigorifico', 'lt',   4,    8,  2.20),
  ('Mantequilla',         'carniceria_frigorifico', 'kg',   1,    2, 10.00),
  ('Refresco 2lt',        'viveres_barra_bebidas',  'und',  6,   12,  2.50),
  ('Cerveza',             'viveres_barra_bebidas',  'und', 12,   24,  1.80),
  ('Agua mineral',        'viveres_barra_bebidas',  'und',  6,   12,  0.80)
ON CONFLICT DO NOTHING;

-- ─── DATOS DEMO — Platos base ───────────────────────────────
INSERT INTO dishes (name, category, price_bs, price_usd, cost_bs) VALUES
  ('Pabellón criollo',     'plato',   45.00, 1.25, 15.00),
  ('Arepa reina pepiada',  'plato',   25.00, 0.70, 8.00),
  ('Arepa pelúa',          'plato',   28.00, 0.78, 9.00),
  ('Pernil con yuca',      'plato',   55.00, 1.53, 18.00),
  ('Tostones con queso',   'entrada', 20.00, 0.56, 6.00),
  ('Tajadas con queso',    'entrada', 18.00, 0.50, 5.50),
  ('Tequeños (6 und)',     'entrada', 22.00, 0.61, 7.00),
  ('Bienmesabe',           'postre',  20.00, 0.56, 5.00),
  ('Quesillo casero',      'postre',  18.00, 0.50, 4.50),
  ('Jugo natural',         'bebida',  15.00, 0.42, 3.00),
  ('Refresco',             'bebida',  12.00, 0.33, 2.50),
  ('Cerveza fría',         'bebida',  18.00, 0.50, 1.80),
  ('Agua mineral',         'bebida',   8.00, 0.22, 0.80)
ON CONFLICT DO NOTHING;
