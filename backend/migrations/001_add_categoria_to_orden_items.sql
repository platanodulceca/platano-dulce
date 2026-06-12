-- Ejecutar en el SQL Editor de Supabase:
-- https://supabase.com/dashboard → SQL Editor → New query

ALTER TABLE orden_items ADD COLUMN IF NOT EXISTS categoria text;
