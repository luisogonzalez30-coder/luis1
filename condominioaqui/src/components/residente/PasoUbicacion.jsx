import { useMemo, useState } from 'react'
import { Building2, Check, ChevronLeft, Search, Trees } from 'lucide-react'
import { TIPO_COMUN, TIPO_UNIDAD, buscarUbicaciones, torresConUnidades } from '../../utils/unidades'
import UltimosReportes from './UltimosReportes'

// Paso 1 de la vertical de condominios: reemplaza al mapa.
//
// El mapa no sirve acá y no es una opinión: un condominio de 6 torres ocupa
// menos que el margen de error del GPS de un celular. Lo que el conserje
// necesita saber es la torre, el piso y el número — datos que el residente
// tiene en la cabeza y que un pin nunca le va a dar.
//
// El selector va en dos niveles (primero torre, después unidad) porque 6
// torres × 20 pisos × 4 areas son 480 opciones: una lista plana en un
// celular es inservible. El buscador de arriba corta camino para quien ya sabe
// qué escribir ("A-1204", "piscina").

function Tarjeta({ seleccionada, onClick, children, icono = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-base transition-colors ${
        seleccionada
          ? 'border-primary bg-primary/5 font-medium text-primary'
          : 'border-gray-300 bg-white text-gray-700 hover:border-primary'
      }`}
    >
      {icono}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {seleccionada && <Check size={18} className="shrink-0" />}
    </button>
 )
}

// El listado de últimos reportes va acá abajo, en el primer paso, y no es
// decoración: es lo que le muestra al residente que reportar sirve para algo —
// ve lo que reportaron sus vecinos esta semana y en qué quedó. Sin eso, el
// formulario es un buzón del que nunca se sabe nada.
export default function PasoUbicacion({ condominio, ubicacion, onCambiar, ultimosReportes = [] }) {
  const [torreAbierta, setTorreAbierta] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  const torres = useMemo(() => torresConUnidades(condominio), [condominio])
  const espaciosComunes = condominio?.espacios_comunes || []
  const resultados = useMemo(() => buscarUbicaciones(busqueda, condominio), [busqueda, condominio])

  function elegirUnidad(torre, unidad) {
    onCambiar({ tipo: TIPO_UNIDAD, torre, unidad, etiqueta: `${torre} · ${unidad}` })
  }

  function elegirComun(espacio) {
    onCambiar({ tipo: TIPO_COMUN, espacio_comun: espacio, etiqueta: espacio })
  }

  function elegirResultado(resultado) {
    setBusqueda('')
    if (resultado.tipo === TIPO_COMUN) elegirComun(resultado.espacio_comun)
    else elegirUnidad(resultado.torre, resultado.unidad)
  }

  // Condominio sin estructura cargada: pasa mientras el administrador todavía
  // no la configura. Decirlo es mejor que mostrar una pantalla vacía que
  // parece un error de la app.
  if (torres.length === 0 && espaciosComunes.length === 0) {
    return (
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
        La administración todavía no ha cargado las torres y los espacios comunes del condominio.
        Avísale para poder reportar desde acá.
      </div>
   )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">1. ¿Dónde está el problema?</h2>
        <p className="text-sm text-gray-500">Elige tu unidad o el espacio común donde ocurre.</p>
      </div>

      {ubicacion && (
        <div className="flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-sm text-primary">
          <Check size={18} className="shrink-0" />
          <span className="font-medium">{ubicacion.etiqueta}</span>
          <button
            type="button"
            onClick={() => {
              onCambiar(null)
              setTorreAbierta(null)
            }}
            className="ml-auto shrink-0 text-xs underline"
          >
            Cambiar
          </button>
        </div>
     )}

      {!ubicacion && (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca tu unidad o un espacio común"
              className="w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {busqueda.trim() ? (
            <div className="flex flex-col gap-2">
              {resultados.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No encontramos "{busqueda}". Búscala en la lista de abajo.
                </p>
             ) : (
                resultados.map((r) => (
                  <Tarjeta
                    key={r.id}
                    onClick={() => elegirResultado(r)}
                    icono={
                      r.tipo === TIPO_COMUN ? (
                        <Trees size={18} className="shrink-0 text-gray-400" />
                     ) : (
                        <Building2 size={18} className="shrink-0 text-gray-400" />
                     )
                    }
                  >
                    {r.etiqueta}
                  </Tarjeta>
               ))
             )}
            </div>
         ) : torreAbierta ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setTorreAbierta(null)}
                className="flex items-center gap-1 self-start text-sm font-medium text-primary"
              >
                <ChevronLeft size={16} />
                {torreAbierta.nombre}
              </button>
              {/* Rejilla y no lista: los números de unidad son cortos y entran
                  3 o 4 por fila, así se ve un piso completo de una mirada. */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {torreAbierta.unidades.map((unidad) => (
                  <Tarjeta key={unidad} onClick={() => elegirUnidad(torreAbierta.nombre, unidad)}>
                    {unidad}
                  </Tarjeta>
               ))}
              </div>
            </div>
         ) : (
            <div className="flex flex-col gap-4">
              {torres.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Mi unidad</p>
                  <div className="grid grid-cols-2 gap-2">
                    {torres.map((torre) => (
                      <Tarjeta
                        key={torre.nombre}
                        onClick={() => setTorreAbierta(torre)}
                        icono={<Building2 size={18} className="shrink-0 text-gray-400" />}
                      >
                        {torre.nombre}
                      </Tarjeta>
                   ))}
                  </div>
                </div>
             )}

              {espaciosComunes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Espacio común</p>
                  <div className="grid grid-cols-2 gap-2">
                    {espaciosComunes.map((espacio) => (
                      <Tarjeta
                        key={espacio}
                        onClick={() => elegirComun(espacio)}
                        icono={<Trees size={18} className="shrink-0 text-gray-400" />}
                      >
                        {espacio}
                      </Tarjeta>
                   ))}
                  </div>
                </div>
             )}
            </div>
         )}
        </>
     )}
      {ultimosReportes.length > 0 && (
        <div className="mt-2 border-t border-borde pt-4">
          <UltimosReportes reportes={ultimosReportes} />
        </div>
     )}
    </div>
 )
}
