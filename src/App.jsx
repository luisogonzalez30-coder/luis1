import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RutaProtegida from './components/common/RutaProtegida'
import Spinner from './components/common/Spinner'
import LandingPage from './pages/LandingPage'
import CiudadanoPage from './pages/CiudadanoPage'
import LoginPage from './pages/LoginPage'
import CuadrillaPage from './pages/CuadrillaPage'
import ConsultaTicketPage from './pages/ConsultaTicketPage'
import { useSincronizacionOffline } from './hooks/useSincronizacionOffline'

// Carga perezosa: los dashboards traen recharts/mapas que solo usan los
// funcionarios. Sin esto, ese peso extra se descargaría también en el flujo
// del ciudadano (/:municipioSlug), justo lo que queremos evitar para
// adopción rural con señal débil y celulares de gama baja.
const DashboardGeneralPage = lazy(() => import('./pages/DashboardGeneralPage'))
const DashboardDepartamentoPage = lazy(() => import('./pages/DashboardDepartamentoPage'))
const GestionFuncionariosPage = lazy(() => import('./pages/GestionFuncionariosPage'))
const TransparenciaPage = lazy(() => import('./pages/TransparenciaPage'))
const CuentaPublicaPage = lazy(() => import('./pages/CuentaPublicaPage'))

const conSuspenso = (elemento) => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
    {elemento}
  </Suspense>
)

// "/dashboard" a secas no es una vista propia: una vez que RutaProtegida
// garantiza que hay perfil cargado, manda a cada rol a SU dashboard según
// utils/departamento.js — ver RBAC en ESTADO_PROYECTO.md.
function RedirectorDashboard() {
  const { perfil } = useAuth()

  if (perfil.rol === 'ALCALDE_ADMIN') return <Navigate to="/dashboard/general" replace />
  if (perfil.rol === 'JEFE_DEPARTAMENTO') return <Navigate to="/dashboard/departamento" replace />
  if (perfil.rol === 'TERRENO') return <Navigate to="/cuadrilla" replace />

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
      Tu rol ("{perfil.rol}") no está reconocido. Contacta al administrador.
    </div>
  )
}

function App() {
  // A nivel raíz, sin importar la ruta: sincroniza reportes guardados offline
  // apenas vuelve la señal, sin depender de que el ciudadano siga en el formulario.
  useSincronizacionOffline()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing neutra: cada municipalidad reparte su propio link /:municipioSlug */}
          <Route path="/" element={<LandingPage />} />

          {/* Consulta pública de ticket: sin login y sin tenant en la URL, el ticket
              público ya trae su propio municipio_id */}
          <Route path="/estado" element={<ConsultaTicketPage />} />

          {/* Acceso funcionarios: el tenant sale de perfil.municipio_id tras login, no de la URL */}
          <Route path="/login" element={<LoginPage />} />

          {/* RBAC: 3 roles — ALCALDE_ADMIN (todo el municipio + métricas),
              JEFE_DEPARTAMENTO (acotado a perfil.departamento), TERRENO (cuadrilla). */}
          <Route
            path="/dashboard"
            element={
              <RutaProtegida>
                <RedirectorDashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/dashboard/general"
            element={
              <RutaProtegida rolesPermitidos={['ALCALDE_ADMIN']}>
                {conSuspenso(<DashboardGeneralPage />)}
              </RutaProtegida>
            }
          />
          {/* Informe de gestión para la Cuenta Pública anual del Alcalde (§31) */}
          <Route
            path="/dashboard/cuenta-publica"
            element={
              <RutaProtegida rolesPermitidos={['ALCALDE_ADMIN']}>
                {conSuspenso(<CuentaPublicaPage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/dashboard/funcionarios"
            element={
              <RutaProtegida rolesPermitidos={['ALCALDE_ADMIN']}>
                {conSuspenso(<GestionFuncionariosPage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/dashboard/departamento"
            element={
              <RutaProtegida rolesPermitidos={['JEFE_DEPARTAMENTO']}>
                {conSuspenso(<DashboardDepartamentoPage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/cuadrilla"
            element={
              <RutaProtegida rolesPermitidos={['TERRENO', 'ALCALDE_ADMIN']}>
                <CuadrillaPage />
              </RutaProtegida>
            }
          />

          {/* Transparencia pública por municipalidad, sin login — ver TransparenciaPage.jsx.
              Ruta de 2 segmentos: no choca con /:municipioSlug (1 segmento), React
              Router los distingue por profundidad sin importar el orden acá. */}
          <Route path="/:municipioSlug/transparencia" element={conSuspenso(<TransparenciaPage />)} />

          {/* Vista ciudadano pública, sin login, específica de cada municipalidad */}
          <Route path="/:municipioSlug" element={<CiudadanoPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
