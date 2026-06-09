# 🍌 Plátano Dulce C.A. — Sistema de Gestión

Sistema web completo para la gestión de restaurante **Plátano Dulce C.A.** en Barquisimeto, Venezuela.

**Stack:** React + Vite · Node.js + Express · Supabase (PostgreSQL)

---

## Módulos incluidos

| # | Módulo | Roles con acceso |
|---|--------|-----------------|
| 1 | **Login** — 6 roles con acceso diferenciado | Todos |
| 2 | **Caja del Día** — Métodos de pago, tasa BCV, cierre | Admin, Cajero, Dueño |
| 3 | **Inventario** — Conteo físico vs teórico, semáforo | Admin, Chef, Dueño |
| 4 | **Recetario** — Platos con ingredientes por porción | Admin, Chef, Dueño |
| 5 | **Lista de Compras** — Generativa automática semanal | Admin, Chef, Dueño |
| 6 | **Cuentas por Cobrar** — Créditos/fiados con estado | Admin, Cajero, Dueño |
| 7 | **Dashboard** — KPIs, gráficas, alertas | Admin, Dueño |
| 8 | **Historial** — Registros cerrados de caja | Admin, Dueño |
| 9 | **Mesero** — Toma de órdenes desde el celular | Mesero |
| 10 | **Cocina** — Pantalla del chef en tiempo real | Chef |

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Git

---

## 1. Instalación local

### Clonar / descargar el proyecto

```bash
cd platano-dulce
```

### Instalar dependencias

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

## 2. Configurar Supabase

### a) Crear las tablas

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto → **SQL Editor**
3. Pegar y ejecutar el contenido de `database/schema.sql`
4. Luego pegar y ejecutar `database/schema_v2.sql`

### b) Habilitar Real-time (opcional — para actualizaciones instantáneas en cocina)

En **SQL Editor**, ejecutar:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
```

### c) Variables de entorno del backend

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env`:

```env
SUPABASE_URL=https://beprnklwjnaucywtledd.supabase.co
SUPABASE_KEY=sb_publishable_7lnIDfK7yDKQpRBp0-KR1A_NJKE71ez
JWT_SECRET=cambia_por_clave_secreta_larga_aqui
PORT=3001
```

---

## 3. Crear usuarios por defecto

```bash
cd backend
node seed.js
```

Usuarios creados:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@platanodulce.com | Admin123! |
| Cajero | cajero@platanodulce.com | Cajero123! |
| Chef | chef@platanodulce.com | Chef123! |
| Dueño | dueno@platanodulce.com | Dueno123! |
| Mesero 1 | mesero1@platanodulce.com | Mesero123! |
| Mesero 2 | mesero2@platanodulce.com | Mesero123! |

---

## 4. Correr el proyecto localmente

Necesitas **2 terminales**:

**Terminal 1 — Backend:**
```bash
cd platano-dulce/backend
npm run dev
# API corriendo en http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd platano-dulce/frontend
npm run dev
# App en http://localhost:5173
```

Abrir el navegador en: **http://localhost:5173**

---

## 5. Despliegue en producción

La estrategia recomendada es un **solo servicio** donde Express sirve tanto la API como el frontend compilado.

### Opción A: Railway (recomendado)

Railway despliega automáticamente desde GitHub.

#### Paso 1: Subir a GitHub

```bash
cd platano-dulce
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/platano-dulce.git
git push -u origin main
```

#### Paso 2: Crear servicio en Railway

1. Ir a [railway.app](https://railway.app) → **New Project**
2. Seleccionar **Deploy from GitHub repo**
3. Elegir tu repositorio
4. Railway detectará el `package.json` raíz automáticamente

#### Paso 3: Configurar variables de entorno en Railway

En el panel de Railway → tu servicio → **Variables**:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://beprnklwjnaucywtledd.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_7lnIDfK7yDKQpRBp0-KR1A_NJKE71ez` |
| `JWT_SECRET` | *(cadena aleatoria larga, min 32 caracteres)* |

> Railway asigna `PORT` automáticamente.

#### Paso 4: Desplegar

Railway construirá y desplegará automáticamente. En ~2-3 minutos tendrás una URL tipo:
`https://platano-dulce-production.up.railway.app`

Después de desplegar, ejecutar el seed una vez:
```bash
# En tu máquina local, apuntando a producción:
SUPABASE_URL=https://... SUPABASE_KEY=sb_... node backend/seed.js
```

---

### Opción B: Render

#### Paso 1: Subir a GitHub (igual que Railway)

#### Paso 2: Crear Web Service en Render

1. Ir a [render.com](https://render.com) → **New Web Service**
2. Conectar tu repositorio de GitHub
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Name** | platano-dulce |
| **Build Command** | `npm install --prefix frontend && npm run build --prefix frontend && npm install --prefix backend` |
| **Start Command** | `node backend/server.js` |
| **Root Directory** | *(dejar vacío)* |

#### Paso 3: Variables de entorno en Render

Igual que en Railway (ver tabla arriba).

#### Paso 4: Desplegar

Render construirá el proyecto. URL tipo: `https://platano-dulce.onrender.com`

> **Nota:** El plan gratuito de Render "duerme" el servicio tras 15 min de inactividad. Para uso 24/7 considera el plan Starter ($7/mes) o usa Railway que no tiene esta limitación.

---

### Despliegue alternativo: solo frontend en Vercel/Netlify

Si prefieres separar frontend y backend:

**Frontend en Vercel:**
1. Ir a [vercel.com](https://vercel.com) → importar repositorio
2. Configurar: Root Directory = `frontend`
3. Agregar variable de entorno: `VITE_API_URL=https://tu-backend.railway.app/api`

**Backend en Railway** (solo la carpeta `backend`):
- Root Directory en Railway: `backend`
- Start Command: `node server.js`

---

## 6. Flujo completo del sistema

```
Mesero toma orden desde su celular (Módulo Mesero)
         ↓
La orden aparece en tiempo real en Cocina
         ↓
Chef marca ítems: Pendiente → Preparando → Listo
         ↓ (todos listos = orden LISTA automáticamente)
🔔 Mesero recibe notificación → marca como Entregada
         ↓
Cajero ve "Órdenes para cobrar" en módulo Caja
         ↓
Cajero confirma cobro → ítems se agregan a ventas del día
         ↓
Caja registra todos los métodos de pago con tasa BCV
         ↓
Al cerrar el día: Inventario descuenta consumo teórico
         ↓
Sistema genera lista de compras para la semana siguiente
```

---

## 7. Estructura del proyecto

```
platano-dulce/
├── database/
│   ├── schema.sql          # Tablas principales
│   └── schema_v2.sql       # Módulos Mesero + Cocina
├── backend/
│   ├── server.js           # Express API + sirve frontend en prod
│   ├── seed.js             # Crea usuarios por defecto
│   ├── .env                # Variables (NO subir a git)
│   ├── .env.example        # Plantilla de variables
│   ├── config/
│   │   └── supabase.js
│   ├── middleware/
│   │   └── auth.js         # JWT + verificación de roles
│   └── routes/             # 9 módulos de API
│       ├── auth.js
│       ├── caja.js
│       ├── inventario.js
│       ├── recetario.js
│       ├── compras.js
│       ├── cuentas.js
│       ├── dashboard.js
│       ├── mesas.js
│       └── orders.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Rutas protegidas por módulo
        ├── index.css           # Estilos globales + colores de marca
        ├── context/
        │   └── AuthContext.jsx # Estado de autenticación global
        ├── services/
        │   └── api.js          # Axios con JWT interceptor
        ├── utils/
        │   └── helpers.js      # Formatos, roles, constantes
        ├── components/
        │   ├── Layout.jsx
        │   ├── Navbar.jsx      # Top bar + bottom tab nav (mobile)
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Caja.jsx
            ├── Inventario.jsx
            ├── Recetario.jsx
            ├── Compras.jsx
            ├── Cuentas.jsx
            ├── Historial.jsx
            ├── Mesero.jsx      # Toma de órdenes + plano de mesas
            └── Cocina.jsx      # Pantalla chef (pantalla completa)
```

---

## 8. Paleta de colores

| Token | Color | Uso |
|-------|-------|-----|
| `--orange` | `#F39639` | Primario, botones, precios |
| `--brown` | `#A9703B` | Secundario, categorías |
| `--dark` | `#2C1A0E` | Texto principal, fondo header |
| `--cream` | `#F3E3D0` | Fondos suaves, íconos |
| `--yellow` | `#FFD450` | Acentos, dueño badge |
| `--coral` | `#E6616C` | Alertas, eliminar, vencido |

---

## 9. API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET/PUT | `/api/caja/today` | Caja del día |
| PUT | `/api/caja/:id/payment` | Registrar pago |
| PUT | `/api/caja/:id/close` | Cerrar caja |
| GET | `/api/inventario/today` | Conteo del día |
| POST | `/api/inventario/count` | Guardar conteo físico |
| GET | `/api/recetario` | Platos con ingredientes |
| GET | `/api/mesas` | Estado de todas las mesas |
| GET | `/api/orders/active` | Órdenes activas (cocina) |
| GET | `/api/orders/mine` | Órdenes del mesero actual |
| GET | `/api/orders/to-collect` | Órdenes listas para cobrar |
| POST | `/api/orders` | Nueva orden |
| PUT | `/api/orders/:id/send` | Enviar a cocina |
| PUT | `/api/orders/:id/items/:itemId/status` | Chef actualiza ítem |
| PUT | `/api/orders/:id/cobrar` | Cajero cobra orden |
| GET | `/api/dashboard/summary` | KPIs del día |
| GET | `/api/dashboard/top-dishes` | Platos más vendidos |
| GET | `/api/dashboard/historial` | Historial de cierres |
| GET | `/api/compras/current` | Lista de compras semana |
| POST | `/api/compras/generate` | Generar lista automática |
| GET | `/api/cuentas` | Cuentas por cobrar |
| GET | `/api/health` | Estado del servidor |

---

## 10. Soporte y contribución

Desarrollado para **Plátano Dulce C.A.**, Barquisimeto, Venezuela.

Para reportar errores o solicitar mejoras, contactar al equipo de desarrollo.

---

*Versión 1.0 — Junio 2026*
