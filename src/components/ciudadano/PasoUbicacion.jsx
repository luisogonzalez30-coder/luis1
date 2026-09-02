import { CheckCircle2, AlertTriangle, Move, Signpost } from 'lucide-react'
import BuscadorDireccion from './BuscadorDireccion'
import MapaSeleccionUbicacion from './MapaSeleccionUbicacion'
import UltimosReportes from './UltimosReportes'

// Largo mínimo de la referencia. Bajo a propósito: "el puente" o "la posta" son
// referencias válidas y completas en un sector chico. Lo que se quiere descartar
// es el campo vacío o un carácter suelto puesto para pasar de pantalla.
export const MIN_REFERENCIA = 3

// Paso 1. Tres formas de fijar la ubicación, a propósito redundantes porque
// ninguna funciona para todo el mundo: el GPS (falla adentro de la casa y en
// celulares viejos), escribir la dirección (no siempre existe en el mapa, sobre
// todo en zona rural) y tocar el mapa a mano (exige saber leerlo). El vecino usa
// la que le resulte y puede corregir con otra.
export default function PasoUbicacion({
  coordenadas,
  cargando,
  error,
  onObtenerUbicacion,
  onCambiarCoordenadas,
  onElegirDireccion,
  municipio,
  sinConexion,
  enfoqueMapa,
  direccionAproximada,
  buscandoDireccion,
  pedirAjustarPin,
  ubicacionPorDefecto,
  referenciaUbicacion = '',
  onCambiarReferencia,
  incidenciasCercanas,
  ultimosReportes,
}) {
  const referenciaCorta = referenciaUbicacion.trim().length > 0 && referenciaUbicacion.trim().length < MIN_REFERENCIA

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-tinta-fuerte">¿Dónde está el problema?</h2>
        <p className="mt-1 text-sm font-medium text-tinta-suave">
          Busca tu dirección, toca el mapa, o usa el botón de GPS sobre el mapa.
        </p>
        {incidenciasCercanas?.length > 0 && (
          <p className="mt-1.5 text-xs text-tinta-suave">
            Los pines de colores son reportes activos de otros vecinos — tócalos para ver el detalle y sumarte si te afecta a ti también.
          </p>
        )}
      </div>

      <BuscadorDireccion municipio={municipio} sinConexion={sinConexion} onElegir={onElegirDireccion} />

      <MapaSeleccionUbicacion
        coordenadas={coordenadas}
        centroPorDefecto={municipio?.centro_mapa}
        enfoque={enfoqueMapa}
        onCambiar={onCambiarCoordenadas}
        incidenciasCercanas={incidenciasCercanas}
        onUbicarme={onObtenerUbicacion}
        ubicando={cargando}
      />

      {coordenadas ? (
        <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-100">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>
            Ubicación marcada en el mapa
            {/* La dirección del punto es una confirmación en palabras de lo que
                el pin ya dice en el mapa: para quien no lee bien un mapa, es la
                única señal de que marcó el lugar correcto. */}
            {direccionAproximada && (
              <span className="mt-0.5 block text-xs text-emerald-700">≈ {direccionAproximada}</span>
            )}
            {!direccionAproximada && buscandoDireccion && (
              <span className="mt-0.5 block text-xs text-emerald-700">Buscando la dirección de este punto...</span>
            )}
          </span>
        </div>
      ) : (
        <p className="text-xs font-medium text-tinta-suave">Toca el mapa para fijar la ubicación a mano.</p>
      )}

      {/* El GPS no estaba disponible y el pin lo puso la app en el centro de la
          comuna. Ese pin se ve idéntico a uno puesto a mano, así que si no se
          dice, el vecino manda el reporte creyendo que marcó su calle. */}
      {ubicacionPorDefecto && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          <Move size={18} className="mt-0.5 shrink-0" />
          <span>
            Sin GPS te dejamos en el centro de la comuna, que <strong>no es el lugar de tu reporte</strong>.
            Arrastra el pin hasta donde está el problema, o busca tu dirección más arriba.
          </span>
        </div>
      )}

      {/* Campo de referencia. Obligatorio, y va acá y no en el Paso 2 porque es
          parte de decir DÓNDE: en Lora, Placilla, Duao, Iloca y el resto de los
          sectores rurales de Licantén no hay numeración de calles, así que la
          coordenada y la dirección que devuelve el mapa no alcanzan. Lo que
          hace llegar a la cuadrilla es el hito: "el puente", "la posta", "la
          segunda casa después del cruce". */}
      <div>
        <label className="etiqueta-campo">Punto de referencia o hito cercano</label>
        <div className="relative">
          <Signpost
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-tenue"
            aria-hidden="true"
          />
          <input
            type="text"
            value={referenciaUbicacion}
            onChange={(e) => onCambiarReferencia(e.target.value)}
            placeholder="Ej: frente a la posta de Lora, pasando el puente"
            className={`campo pl-11 ${referenciaCorta ? 'campo-error' : ''}`}
          />
        </div>
        <p className={`mt-1.5 text-xs ${referenciaCorta ? 'font-medium text-rose-600' : 'text-tinta-suave'}`}>
          {referenciaCorta
            ? 'Escribe al menos un hito que la cuadrilla pueda reconocer.'
            : 'En los sectores rurales no hay numeración: un hito cercano es lo que hace que la cuadrilla llegue al lugar correcto.'}
        </p>
      </div>

      {/* Un sector o una localidad resuelven a su centro, que puede quedar a
          cientos de metros del problema. Decirlo evita que llegue una cuadrilla
          al lugar equivocado. */}
      {pedirAjustarPin && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-100">
          <Move size={18} className="mt-0.5 shrink-0" />
          <span>
            Esa dirección es aproximada: te dejamos en el centro del lugar. Arrastra el pin del mapa hasta el punto exacto del problema.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-100">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <UltimosReportes reportes={ultimosReportes} />
    </div>
  )
}
