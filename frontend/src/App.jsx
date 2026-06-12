import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Caja from './pages/Caja'
import Inventario from './pages/Inventario'
import Recetario from './pages/Recetario'
import Compras from './pages/Compras'
import Cuentas from './pages/Cuentas'
import Historial from './pages/Historial'
import Mesero from './pages/Mesero'
import Cocina from './pages/Cocina'
import Barra from './pages/Barra'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute module="dashboard">
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/caja" element={
            <ProtectedRoute module="caja">
              <Layout><Caja /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/mesero" element={
            <ProtectedRoute module="mesero">
              <Layout><Mesero /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/cocina" element={
            <ProtectedRoute module="cocina">
              <Cocina />
            </ProtectedRoute>
          } />
          <Route path="/barra" element={
            <ProtectedRoute module="barra">
              <Barra />
            </ProtectedRoute>
          } />
          <Route path="/inventario" element={
            <ProtectedRoute module="inventario">
              <Layout><Inventario /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/recetario" element={
            <ProtectedRoute module="recetario">
              <Layout><Recetario /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/compras" element={
            <ProtectedRoute module="compras">
              <Layout><Compras /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/cuentas" element={
            <ProtectedRoute module="cuentas">
              <Layout><Cuentas /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/historial" element={
            <ProtectedRoute module="historial">
              <Layout><Historial /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
