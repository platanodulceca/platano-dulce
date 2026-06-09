import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div style={{ paddingTop: 'var(--nav-h)', paddingBottom: 68, minHeight: '100dvh' }}>
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
