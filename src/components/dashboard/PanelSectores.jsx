import { MapPin, Siren, Info } from 'lucide-react'
import { agruparPorSector, SECTOR_SIN_ASIGNAR } from '../../utils/sectores'

// Barra de cumplimiento del sector. El relleno lleva la severidad (rojo →
// ámbar → verde) y el riel es un paso más claro del mismo tono, para que el
// estado se lea a lo largo de toda la barra — regla de "meter" de la skill
// dataviz. El porcentaje va escrito al lado: el color nunca carga solo con el
// significado.
function BarraCumplimiento({ porcentaje }) {
  if (porcentaje === null) return <span className="text-xs text-tinta-tenue">Sin reportes</span>

  const tono =
    porcentaje >= 70 ? { relleno: '#0ca30c', riel: '#0ca30c1f' }
    : porcentaje >= 40 ? { relleno: '#fab219', riel: '#fab2192e' }
    : { relleno: '#d03b3b', riel: '#d03b3b1f' }

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: tono.riel }}>
        <div className="h-1.5 rounded-full" style={{ width: `${Math.max(porcentaje, 3)}%`, backgroundColor: tono.relleno }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-tinta">{porcentaje}%</span>
    </div>
  )
}

// Vista territorial para el Alcalde: qué sector de la comuna concentra los
// problemas sin resolver. Se calcula sobre las incidencias que la página ya
// tiene suscritas, sin consultas nuevas.
export default function PanelSectores({ incidencias, sectores, onSeleccionarSector }) {
  // Si el municipio no cargó sus sectores, se explica cómo hacerlo en vez de
  // mostrar un panel vacío sin razón aparente.
  if (!sectores?.length) {
    return (
      <section className="border-b border-borde bg-white px-4 py-5">
        <h2 className="mb-2 text-sm font-semibold text-tinta">Reportes por sector</h2>
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-tinta">
          <Info size={15} className="mt-0.5 shrink-0 text-tinta-tenue" />
          <span>
            Todavía no están cargados los sectores de la comuna (villas, poblaciones, sectores rurales). Una vez
            cargados, acá se ve qué territorio concentra los problemas sin resolver — la lectura que no da el mapa de
            pines sueltos.
          </span>
        </div>
      </section>
    )
  }

  const grupos = agruparPorSector(incidencias, sectores)
  const conReportes = grupos.filter((g) => g.total > 0)
  const masAtrasado = conReportes.find((g) => g.nombre !== SECTOR_SIN_ASIGNAR && g.sinResolver > 0)

  return (
    <section className="border-b border-borde bg-white px-4 py-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-tinta">Reportes por sector</h2>
        {masAtrasado && (
          <p className="text-xs text-tinta-suave">
            El sector con más pendientes es <span className="font-medium text-tinta-fuerte">{masAtrasado.nombre}</span>
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-xs text-tinta-suave">
              <th className="pb-2 font-medium">Sector</th>
              <th className="pb-2 text-right font-medium">Sin resolver</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2 pl-4 font-medium">Resolución</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const esSinAsignar = g.nombre === SECTOR_SIN_ASIGNAR
              return (
                <tr
                  key={g.nombre}
                  onClick={() => !esSinAsignar && g.sector && onSeleccionarSector?.(g.sector)}
                  className={`border-b border-borde ${
                    !esSinAsignar && g.sector ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                >
                  <td className="py-2">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className={esSinAsignar ? 'text-tinta-tenue' : 'text-tinta-tenue'} />
                      <span className={esSinAsignar ? 'text-tinta-suave' : 'text-tinta-fuerte'}>{g.nombre}</span>
                      {g.emergencias > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-[#d03b3b]/10 px-2 py-0.5 text-[11px] font-medium text-[#d03b3b]">
                          <Siren size={11} /> {g.emergencias} urgente{g.emergencias === 1 ? '' : 's'}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium text-tinta-fuerte">{g.sinResolver}</td>
                  <td className="py-2 text-right tabular-nums text-tinta-suave">{g.total}</td>
                  <td className="py-2 pl-4"><BarraCumplimiento porcentaje={g.porcentajeResuelto} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {grupos.some((g) => g.nombre === SECTOR_SIN_ASIGNAR) && (
        <p className="mt-2 text-[11px] leading-snug text-tinta-tenue">
          "{SECTOR_SIN_ASIGNAR}" son reportes cuya ubicación no cae dentro de ningún sector cargado. Si son muchos,
          conviene revisar los radios o agregar los sectores que falten.
        </p>
      )}
    </section>
  )
}
