-- ============================================================
-- PLÁTANO DULCE C.A. — Schema V2: Módulos Mesero + Cocina
-- Ejecutar después de schema.sql
-- ============================================================

-- ─── Actualizar constraint de roles si ya existe la tabla ───
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('administrador','cajero','chef','dueño','mesero'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── MESAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number           INTEGER NOT NULL UNIQUE,
  name             VARCHAR(50),
  capacity         INTEGER DEFAULT 4,
  status           VARCHAR(20) DEFAULT 'disponible'
                   CHECK (status IN ('disponible','ocupada','reservada')),
  current_order_id UUID,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÓRDENES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id     UUID REFERENCES tables(id),
  table_number INTEGER,
  table_name   VARCHAR(50),
  waiter_id    UUID REFERENCES users(id),
  waiter_name  VARCHAR(255),
  register_id  UUID REFERENCES daily_registers(id),
  status       VARCHAR(20) DEFAULT 'borrador'
               CHECK (status IN ('borrador','pendiente','en_preparacion','lista','entregada','cobrada','cancelada')),
  notes        TEXT,
  split_count  INTEGER DEFAULT 1,
  total_bs     NUMERIC(10,2) DEFAULT 0,
  sent_at      TIMESTAMPTZ,
  ready_at     TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cobrado_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍTEMS DE ORDEN ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id     UUID REFERENCES dishes(id),
  dish_name   VARCHAR(255) NOT NULL,
  item_type   VARCHAR(20) DEFAULT 'plato',
  quantity    INTEGER NOT NULL DEFAULT 1,
  price_bs    NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_bs     NUMERIC(10,2) DEFAULT 0,
  notes       TEXT,
  status      VARCHAR(20) DEFAULT 'pendiente'
              CHECK (status IN ('pendiente','en_preparacion','listo','entregado')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_table      ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_waiter     ON orders(waiter_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date       ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- ─── HABILITAR REAL-TIME en Supabase ────────────────────────
-- Ejecutar en SQL Editor de Supabase para activar real-time:
-- ALTER PUBLICATION supabase_realtime ADD TABLE tables;
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ─── MESAS DE EJEMPLO ───────────────────────────────────────
INSERT INTO tables (number, name, capacity) VALUES
  (1,  'Mesa 1',    4),
  (2,  'Mesa 2',    4),
  (3,  'Mesa 3',    6),
  (4,  'Mesa 4',    4),
  (5,  'Mesa 5',    2),
  (6,  'Mesa 6',    8),
  (7,  'Terraza 1', 4),
  (8,  'Terraza 2', 4),
  (9,  'Barra 1',   2),
  (10, 'Barra 2',   2)
ON CONFLICT DO NOTHING;
