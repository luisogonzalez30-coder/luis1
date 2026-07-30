import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './components/common/RutaProtegida'
import Spinner from './components/common/Spinner'
import LandingPage from './pages/LandingPage'
import CiudadanoPage from './pages/CiudadanoPage'
import LoginPage from './pages/LoginPage'
import CuadrillaPage from './pages/CuadrillaPage'
import ConsultaTicketPage from './pages/ConsultaTicketPage'
import { useSincronizacionOffline } from './hooks/useSincronizacionOffline'

// Carga perezosa: el Dashboard trae recharts (gráficos) que solo usa el ADMIN.
// Sin esto, ese peso extra se descargaría también en el flujo del ciudadano
// (/:municipioSlug), justo lo que queremos evitar para adopción rural con
// señal débil y celulares de gama baja.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

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
          <Route
            path="/dashboard"
            element={
              <RutaProtegida rolesPermitidos={['ADMIN']}>
                <Suspense
                  fallback={
                    <div className="flex min-h-screen items-center justify-center">
                      <Spinner />
                    </div>
                  }
                >
                  <DashboardPage />
                </Suspense>
              </RutaProtegida>
            }
          />
          <Route
            path="/cuadrilla"
            element={
              <RutaProtegida rolesPermitidos={['TERRENO', 'ADMIN']}>
                <CuadrillaPage />
              </RutaProtegida>
            }
          />

          {/* Vista ciudadano pública, sin login, específica de cada municipalidad */}
          <Route path="/:municipioSlug" element={<CiudadanoPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
