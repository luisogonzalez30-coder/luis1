import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RutaProtegida from './components/common/RutaProtegida'
import Spinner from './components/common/Spinner'
import LandingPage from './pages/LandingPage'
import PortadaCondominioPage from './pages/PortadaCondominioPage'
import ResidentePage from './pages/ResidentePage'
import LoginPage from './pages/LoginPage'
import ConserjeriaPage from './pages/ConserjeriaPage'
import ConsultaTicketPage from './pages/ConsultaTicketPage'
import { useSincronizacionOffline } from './hooks/useSincronizacionOffline'

// Carga perezosa: los dashboards traen recharts/mapas que solo usan los
// usuarios. Sin esto, ese peso extra se descargaría también en el flujo
// del residente (/:condominioSlug), justo lo que queremos evitar para
// adopción rural con señal débil y celulares de gama baja.
const PanelAdministracionPage = lazy(() => import('./pages/PanelAdministracionPage'))
const PanelComitePage = lazy(() => import('./pages/PanelComitePage'))
const GestionUsuariosPage = lazy(() => import('./pages/GestionUsuariosPage'))
// El diferenciador del producto: el calendario de obligaciones de la Ley 21.442.
const CumplimientoPage = lazy(() => import('./pages/CumplimientoPage'))
// Textos legales: el residente los abre una vez, no en cada reporte. Que no pesen
// en el bundle del formulario, que es el que se descarga siempre.
const PrivacidadPage = lazy(() => import('./pages/PrivacidadPage'))
const TerminosPage = lazy(() => import('./pages/TerminosPage'))

const conSuspenso = (elemento) => (
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
    {elemento}
  </Suspense>
)

// "/panel" a secas no es una vista propia: una vez que RutaProtegida
// garantiza que hay perfil cargado, manda a cada rol a SU dashboard según
// utils/area.js — ver RBAC.
function RedirectorDashboard() {
  const { perfil } = useAuth()

  if (perfil.rol === 'ADMINISTRADOR') return <Navigate to="/panel/administracion" replace />
  if (perfil.rol === 'COMITE') return <Navigate to="/panel/area" replace />
  if (perfil.rol === 'CONSERJERIA') return <Navigate to="/conserjeria" replace />

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-gray-500">
      Tu rol ("{perfil.rol}") no está reconocido. Contacta al administrador.
    </div>
 )
}

function App() {
  // A nivel raíz, sin importar la ruta: sincroniza reportes guardados offline
  // apenas vuelve la señal, sin depender de que el residente siga en el formulario.
  useSincronizacionOffline()

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing neutra: cada condominio reparte su propio link /:condominioSlug */}
          <Route path="/" element={<LandingPage />} />

          {/* Consulta pública de ticket: sin login y sin tenant en la URL, el ticket
              público ya trae su propio condominio_id */}
          <Route path="/estado" element={<ConsultaTicketPage />} />

          {/* Acceso usuarios: el tenant sale de perfil.condominio_id tras login, no de la URL */}
          <Route path="/login" element={<LoginPage />} />

          {/* RBAC: 3 roles — ADMINISTRADOR (todo el condominio + métricas),
              COMITE (acotado a perfil.area), CONSERJERIA (equipo). */}
          <Route
            path="/panel"
            element={
              <RutaProtegida>
                <RedirectorDashboard />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/administracion"
            element={
              <RutaProtegida rolesPermitidos={['ADMINISTRADOR']}>
                {conSuspenso(<PanelAdministracionPage />)}
              </RutaProtegida>
            }
          />
          {/* Informe de gestión para la Cuenta Pública anual del Administrador */}
          {/* Cumplimiento Ley 21.442. Lo abren los dos roles con permisos
              distintos: la administración registra, el Comité solo mira — el
              control cruzado es el punto. La distinción real está en
              firestore.rules, no en la pantalla. */}
          <Route
            path="/panel/cumplimiento"
            element={
              <RutaProtegida rolesPermitidos={['ADMINISTRADOR', 'COMITE']}>
                {conSuspenso(<CumplimientoPage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/usuarios"
            element={
              <RutaProtegida rolesPermitidos={['ADMINISTRADOR']}>
                {conSuspenso(<GestionUsuariosPage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/area"
            element={
              <RutaProtegida rolesPermitidos={['COMITE']}>
                {conSuspenso(<PanelComitePage />)}
              </RutaProtegida>
            }
          />
          <Route
            path="/conserjeria"
            element={
              <RutaProtegida rolesPermitidos={['CONSERJERIA', 'ADMINISTRADOR']}>
                <ConserjeriaPage />
              </RutaProtegida>
            }
          />

          {/* Transparencia pública por condominio, sin login — ver TransparenciaPage.jsx.
              Ruta de 2 segmentos: no choca con /:condominioSlug (1 segmento), React
              Router los distingue por profundidad sin importar el orden acá. */}

          {/* Textos legales exigidos por la Ley 21.719 (vigente desde el 1-dic-2026).
              Públicos y sin login a propósito: el residente tiene que poder leerlos ANTES
              de entregar su nombre y su WhatsApp, no después de haberlos entregado. */}
          <Route path="/:condominioSlug/privacidad" element={conSuspenso(<PrivacidadPage />)} />
          <Route path="/:condominioSlug/terminos" element={conSuspenso(<TerminosPage />)} />

          {/* Misma consulta de ticket que "/estado", pero dentro de el condominio:
              es lo que permite que la barra inferior del residente tenga las tres
              pestañas del mismo tenant. "/estado" se mantiene tal cual para los
              links y QR ya repartidos. */}
          <Route path="/:condominioSlug/estado" element={<ConsultaTicketPage />} />

          {/* Formulario de reporte propiamente tal — antes vivía directo en
              "/:condominioSlug"; se corrió acá para que esa ruta pueda mostrar
              la portada (PortadaCondominioPage) primero. */}
          <Route path="/:condominioSlug/reportar" element={<ResidentePage />} />

          {/* Portada de cada condominio: logo grande, tema del tenant, y las
              3 opciones (reportar / consultar / acceso usuarios). Sin login,
              específica de cada condominio. */}
          <Route path="/:condominioSlug" element={<PortadaCondominioPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
 )
}

export default App
