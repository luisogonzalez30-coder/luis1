import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCondominio } from '../hooks/useCondominio'
import { registrarMantencion, suscribirMantenciones } from '../services/mantencionesService'
import { formatearDia, planMantenciones, resumenCumplimiento } from '../utils/mantenciones'
import Spinner from '../components/common/Spinner'
import Modal from '../components/common/Modal'
import EncabezadoCondominio from '../components/common/EncabezadoCondominio'
import ResumenCumplimiento from '../components/cumplimiento/ResumenCumplimiento'
import TarjetaObligacion from '../components/cumplimiento/TarjetaObligacion'
import ModalRegistroMantencion from '../components/cumplimiento/ModalRegistroMantencion'

// Panel de Cumplimiento de la Ley 21.442 — el diferenciador de TuCondoAquí.
//
// El software de condominios que existe en Chile está construido alrededor del
// dinero (gasto común, recaudación, conciliación). El vencimiento de una
// certificación obligatoria vive en un Excel o en la memoria del administrador,
// y se descubre vencido cuando llega la fiscalización o, peor, después del
// siniestro. Ver docs/ESTUDIO-MERCADO.md la documentación
//
// Quién puede qué:
//   - ADMINISTRADOR (el administrador del condominio) registra cumplimientos.
//     Es quien responde por ellos ante la ley.
//   - COMITE (el Comité de Administración) solo mira. Su rol es
//     fiscalizar al administrador, no ejecutar: si pudiera registrar, el panel
//     dejaría de servir como control cruzado, que es de lo poco que el comité
//     tiene hoy.
// Ambas restricciones están también en firestore.rules, no solo en esta pantalla.

export default function CumplimientoPage() {
  const { perfil } = useAuth()
  const { condominio, cargando: cargandoCondominio } = useCondominio(perfil?.condominio_id)

  const [registros, setRegistros] = useState(null)
  const [filtro, setFiltro] = useState(null)
  const [enRegistro, setEnRegistro] = useState(null)
  const [enHistorial, setEnHistorial] = useState(null)

  const puedeRegistrar = perfil?.rol === 'ADMINISTRADOR'

  useEffect(() => {
    if (!condominio?.id) return
    return suscribirMantenciones(condominio.id, setRegistros)
  }, [condominio?.id])

  // `hoy` se congela al montar en vez de llamarse dentro del useMemo: si se
  // recalculara en cada render, los "días restantes" podrían cambiar a mitad de
  // una sesión larga y el modal abierto quedaría describiendo otro estado que la
  // tarjeta de atrás.
  const [hoy] = useState(() => new Date())

  const plan = useMemo(
    () => (condominio && registros ? planMantenciones(condominio, registros, hoy) : []),
    [condominio, registros, hoy],
 )
  const resumen = useMemo(() => resumenCumplimiento(plan), [plan])
  const visibles = filtro ? plan.filter((item) => item.estado === filtro) : plan

  async function guardarRegistro(datos) {
    await registrarMantencion({
      ...datos,
      condominioId: condominio.id,
      obligacionId: enRegistro.id,
      registroAnterior: registros?.[enRegistro.id],
      registradoPor: perfil?.nombre || perfil?.email || '',
    })
    setEnRegistro(null)
  }

  if (cargandoCondominio || (condominio && !registros)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
   )
  }

  // Tenant no encontrado (perfil apuntando a un condominio borrado, o un id mal
  // escrito): sin esto caería en la rama de "no es un condominio" y culparía a la
  // vertical de un problema que es de la cuenta.
  if (!condominio) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-tinta-suave">
          No pudimos cargar los datos de tu condominio. Revisa tu conexión e intenta de nuevo.
        </p>
        <Link to="/panel" className="font-medium text-primary hover:underline">
          Volver al panel
        </Link>
      </div>
   )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-borde bg-white/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <EncabezadoCondominio condominio={condominio} tituloDefecto="Cumplimiento Ley 21.442" />
          <Link
            to="/panel"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/5"
          >
            <ChevronLeft size={16} /> Volver al panel
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        <ResumenCumplimiento resumen={resumen} filtroActivo={filtro} onFiltrar={setFiltro} />

        {!puedeRegistrar && (
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Estás viendo el panel como Comité de Administración: puedes revisar el estado y los respaldos, pero
            el registro lo hace la administración.
          </p>
       )}

        {visibles.length === 0 ? (
          <p className="py-10 text-center text-sm text-tinta-suave">
            No hay obligaciones en estado "{filtro}".{' '}
            <button type="button" onClick={() => setFiltro(null)} className="font-medium text-primary underline">
              Ver todas
            </button>
          </p>
       ) : (
          <ul className="flex flex-col gap-3">
            {visibles.map((item) => (
              <TarjetaObligacion
                key={item.id}
                item={item}
                puedeRegistrar={puedeRegistrar}
                onRegistrar={setEnRegistro}
                onVerHistorial={setEnHistorial}
              />
           ))}
          </ul>
       )}

        {/* No es letra chica escondida: es el límite real del producto y tiene
            que estar donde se usa, no solo en el contrato. El sistema lleva el
            calendario que el administrador configura; no interpreta la ley. */}
        <p className="mt-2 rounded-xl bg-tinta-fuerte/[0.04] px-4 py-3 text-xs leading-relaxed text-tinta-suave">
          Las periodicidades que vienen cargadas son un punto de partida editable. La periodicidad que
          corresponde a cada obligación depende de la normativa vigente, del reglamento de copropiedad del
          condominio, del manual del fabricante de cada equipo y de su uso.{' '}
          <strong>Esta herramienta lleva el calendario que configura la administración y avisa antes del
          vencimiento; no constituye asesoría legal.</strong>
        </p>
      </main>

      {enRegistro && (
        <ModalRegistroMantencion
          obligacion={enRegistro}
          condominioId={condominio.id}
          onGuardar={guardarRegistro}
          onCerrar={() => setEnRegistro(null)}
        />
     )}

      {enHistorial && (
        <Modal
          titulo={`Historial — ${enHistorial.nombre}`}
          subtitulo="Cumplimientos anteriores, del más reciente al más antiguo"
          onCerrar={() => setEnHistorial(null)}
          ancho="lg"
        >
          <ul className="flex flex-col gap-2">
            {[...enHistorial.historial].reverse().map((registro, i) => (
              <li key={`${registro.ultima_fecha}-${i}`} className="rounded-xl border border-borde p-3 text-sm">
                <p className="font-medium text-tinta-fuerte">{formatearDia(registro.ultima_fecha)}</p>
                <p className="text-xs text-tinta-suave">{registro.proveedor || 'Proveedor no registrado'}</p>
                {registro.documento_url && (
                  <a
                    href={registro.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-primary underline"
                  >
                    Ver respaldo
                  </a>
               )}
              </li>
           ))}
          </ul>
        </Modal>
     )}
    </div>
 )
}
