import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_MODULES } from '../utils/helpers'

const MODULE_PATHS = {
  dashboard:  '/',
  caja:       '/caja',
  mesero:     '/mesero',
  cocina:     '/cocina',
  inventario: '/inventario',
  recetario:  '/recetario',
  compras:    '/compras',
  cuentas:    '/cuentas',
  historial:  '/historial',
}

export default function ProtectedRoute({ children, module }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Cargando...</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (module && !ROLE_MODULES[user.role]?.includes(module)) {
    // Redirigir al primer módulo permitido del rol (evita bucle infinito)
    const allowed = ROLE_MODULES[user.role] || []
    const firstPath = MODULE_PATHS[allowed[0]] || '/login'
    return <Navigate to={firstPath} replace />
  }

  return children
}
