import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

import authRoutes      from './routes/auth.js'
import cajaRoutes      from './routes/caja.js'
import inventarioRoutes from './routes/inventario.js'
import recetarioRoutes from './routes/recetario.js'
import comprasRoutes   from './routes/compras.js'
import cuentasRoutes   from './routes/cuentas.js'
import dashboardRoutes from './routes/dashboard.js'
import mesasRoutes     from './routes/mesas.js'
import ordersRoutes    from './routes/orders.js'
import ordenesRoutes   from './routes/ordenes.js'
import barraRoutes     from './routes/barra.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

const app = express()

app.use(cors({
  origin: isProd ? true : ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}))
app.use(express.json())

// ── API routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes)
app.use('/api/caja',       cajaRoutes)
app.use('/api/inventario', inventarioRoutes)
app.use('/api/recetario',  recetarioRoutes)
app.use('/api/compras',    comprasRoutes)
app.use('/api/cuentas',    cuentasRoutes)
app.use('/api/dashboard',  dashboardRoutes)
app.use('/api/mesas',      mesasRoutes)
app.use('/api/orders',     ordersRoutes)
app.use('/api/ordenes',    ordenesRoutes)
app.use('/api/barra',      barraRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Plátano Dulce C.A.', env: process.env.NODE_ENV, time: new Date() })
})

// ── Frontend estático en producción ──────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '../frontend/dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍌 Plátano Dulce API corriendo en http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`)
})
