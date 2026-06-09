import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_MODULES, ROLE_LABELS } from '../utils/helpers'

const NAV_ITEMS = [
  { module: 'dashboard',  path: '/',           label: 'Dashboard',  icon: '📊' },
  { module: 'caja',       path: '/caja',        label: 'Caja',       icon: '💰' },
  { module: 'mesero',     path: '/mesero',      label: 'Mesas',      icon: '🪑' },
  { module: 'cocina',     path: '/cocina',      label: 'Cocina',     icon: '👨‍🍳' },
  { module: 'inventario', path: '/inventario',  label: 'Inventario', icon: '📦' },
  { module: 'recetario',  path: '/recetario',   label: 'Recetario',  icon: '📋' },
  { module: 'compras',    path: '/compras',      label: 'Compras',    icon: '🛒' },
  { module: 'cuentas',    path: '/cuentas',      label: 'Cuentas',    icon: '💳' },
  { module: 'historial',  path: '/historial',    label: 'Historial',  icon: '📅' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const allowed = ROLE_MODULES[user?.role] || []
  const visibleItems = NAV_ITEMS.filter(i => allowed.includes(i.module))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={{ fontSize: '1.5rem' }}>🍌</span>
          <span style={styles.logoText}>Plátano Dulce</span>
        </div>
        <div style={styles.userArea}>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.name}</span>
            <span style={styles.userRole}>{ROLE_LABELS[user?.role]}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn} title="Cerrar sesión">
            ⏏
          </button>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav style={styles.bottomNav}>
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              ...styles.navItem,
              color: isActive ? 'var(--orange)' : 'var(--gray-500)',
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

const styles = {
  header: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 'var(--nav-h)',
    background: 'var(--dark)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,.3)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  logoText: {
    color: 'var(--cream)',
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '.01em',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    color: 'var(--white)',
    fontSize: '.82rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  userRole: {
    color: 'var(--orange)',
    fontSize: '.72rem',
    fontWeight: 600,
  },
  logoutBtn: {
    background: 'rgba(255,255,255,.1)',
    border: 'none',
    color: 'var(--cream)',
    width: 36,
    height: 36,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: 64,
    background: 'var(--white)',
    borderTop: '1px solid var(--gray-100)',
    display: 'flex',
    zIndex: 100,
    boxShadow: '0 -2px 12px rgba(0,0,0,.08)',
    overflowX: 'auto',
  },
  navItem: {
    flex: 1,
    minWidth: 60,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    textDecoration: 'none',
    padding: '6px 4px',
    transition: 'color .15s',
  },
  navIcon: { fontSize: '1.3rem', lineHeight: 1 },
  navLabel: { fontSize: '.68rem', fontWeight: 600, letterSpacing: '.01em' },
}
