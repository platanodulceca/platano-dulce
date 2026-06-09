import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_MODULES } from '../utils/helpers'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      const allowed = ROLE_MODULES[user.role] || []
      if (allowed.includes('dashboard'))   navigate('/')
      else if (allowed.includes('mesero')) navigate('/mesero')
      else if (allowed.includes('cocina')) navigate('/cocina')
      else if (allowed.includes('caja'))   navigate('/caja')
      else if (allowed.includes('inventario')) navigate('/inventario')
      else navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.bg}>
      {/* Decorative shapes */}
      <div style={s.circle1} />
      <div style={s.circle2} />
      <div style={s.circle3} />

      <div style={s.container}>
        {/* Logo / Brand */}
        <div style={s.brand}>
          <div style={s.logoWrap}>
            <span style={s.logoEmoji}>🍌</span>
          </div>
          <h1 style={s.brandName}>Plátano Dulce</h1>
          <p style={s.brandSub}>C.A. · Barquisimeto, Venezuela</p>
        </div>

        {/* Card */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Iniciar Sesión</h2>
          <p style={s.cardSub}>Ingresa tus credenciales para acceder</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="usuario@platanodulce.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div style={s.passWrap}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: '1.5rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={s.btnSpinner} />
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        {/* Role legend */}
        <div style={s.legend}>
          <p style={s.legendTitle}>Roles disponibles</p>
          <div style={s.roles}>
            {[
              { role: 'Administrador', icon: '⚙️', color: '#F39639' },
              { role: 'Dueño',         icon: '👑', color: '#FFD450' },
              { role: 'Cajero',        icon: '💰', color: '#A9703B' },
              { role: 'Chef',          icon: '👨‍🍳', color: '#E6616C' },
            ].map(r => (
              <div key={r.role} style={s.roleChip}>
                <span>{r.icon}</span>
                <span style={{ color: r.color, fontWeight: 600, fontSize: '.78rem' }}>{r.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const s = {
  bg: {
    minHeight: '100dvh',
    background: 'linear-gradient(145deg, #2C1A0E 0%, #3d2512 50%, #1a0f08 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem 1rem',
    position: 'relative',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    top: '-80px', right: '-80px',
    width: 280, height: 280,
    borderRadius: '50%',
    background: 'rgba(243,150,57,.12)',
    pointerEvents: 'none',
  },
  circle2: {
    position: 'absolute',
    bottom: '-60px', left: '-60px',
    width: 220, height: 220,
    borderRadius: '50%',
    background: 'rgba(255,212,80,.08)',
    pointerEvents: 'none',
  },
  circle3: {
    position: 'absolute',
    top: '40%', left: '-100px',
    width: 180, height: 180,
    borderRadius: '50%',
    background: 'rgba(169,112,59,.1)',
    pointerEvents: 'none',
  },
  container: {
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    textAlign: 'center',
  },
  logoWrap: {
    width: 80, height: 80,
    borderRadius: '50%',
    background: 'var(--orange)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto .75rem',
    boxShadow: '0 8px 24px rgba(243,150,57,.4)',
  },
  logoEmoji: {
    fontSize: '2.5rem',
    lineHeight: 1,
  },
  brandName: {
    color: 'var(--cream)',
    fontSize: '1.8rem',
    fontWeight: 700,
    letterSpacing: '-.01em',
    lineHeight: 1.1,
  },
  brandSub: {
    color: 'rgba(243,227,208,.6)',
    fontSize: '.85rem',
    marginTop: '.2rem',
  },
  card: {
    width: '100%',
    background: 'var(--white)',
    borderRadius: 16,
    padding: '1.75rem',
    boxShadow: '0 16px 48px rgba(0,0,0,.35)',
  },
  cardTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '.2rem',
  },
  cardSub: {
    fontSize: '.85rem',
    color: 'var(--gray-500)',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  passWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '.2rem',
    lineHeight: 1,
  },
  btnSpinner: {
    display: 'inline-block',
    width: 16, height: 16,
    border: '2px solid rgba(255,255,255,.4)',
    borderTopColor: 'var(--white)',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
  },
  legend: {
    textAlign: 'center',
    width: '100%',
  },
  legendTitle: {
    color: 'rgba(243,227,208,.5)',
    fontSize: '.75rem',
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    marginBottom: '.6rem',
  },
  roles: {
    display: 'flex',
    gap: '.5rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  roleChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '.3rem',
    background: 'rgba(255,255,255,.06)',
    borderRadius: 8,
    padding: '.3rem .65rem',
    border: '1px solid rgba(255,255,255,.08)',
  },
}
