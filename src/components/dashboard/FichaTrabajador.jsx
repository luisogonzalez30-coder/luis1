import { MapPin, Phone, Mail, Clock, Building2, UserCog, ExternalLink } from 'lucide-react'
import { horasDeTrabajador, jefaturaDe, enlaceWhatsapp } from '../../utils/equipo'
import { etiquetaCategoria } from '../../utils/categorias'

function formatearHoras(horas) {
  if (!horas) return '0 h'
  return Number.isInteger(horas) ? `${horas} h` : `${horas.toFixed(1)} h`
}

// Dato suelto de la ficha. Etiqueta muted arriba, valor en tinta primaria —
// mismo contrato de "stat tile" que el resto del panel, en miniatura.
function Dato({ etiqueta, valor, apoyo }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[11px] text-gray-500">{etiqueta}</p>
      <p className="mt-0.5 text-base font-semibold leading-none text-gray-900">{valor}</p>
      {apoyo && <p className="mt-1 text-[11px] leading-snug text-gray-400">{apoyo}</p>}
    </div>
  )
}

function Contacto({ persona, etiqueta }) {
  if (!persona) return null
  const whatsapp = enlaceWhatsapp(persona.telefono)

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="text-gray-500">{etiqueta}:</span>
      <span className="font-medium text-gray-900">{persona.nombre}</span>
      {persona.correo && (
        <a
          href={`mailto:${persona.correo}`}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Mail size={12} /> Correo
        </a>
      )}
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Phone size={12} /> WhatsApp
        </a>
      )}
    </div>
  )
}

// Ficha de una persona del roster, desplegada al hacer clic en su nombre dentro
// de ModalTrabajadoresDepartamento. Responde las preguntas que el Alcalde se
// hace mirando un nombre: de qué departamento es, de quién depende, si está en
// terreno y dónde exactamente, y cuántas horas lleva.
//
// Todo se calcula sobre datos que el Dashboard ya tiene suscritos (incidencias,
// roster del departamento, funcionarios) — sin consultas nuevas.
export default function FichaTrabajador({
  trabajador,
  departamento,
  incidencias = [],
  companeros = [],
  funcionarios = [],
  trabajosEnCurso = [],
}) {
  const horas = horasDeTrabajador(trabajador.id, incidencias)
  const { jefeDepartamento, jefeCuadrilla } = jefaturaDe({
    departamento,
    funcionarios,
    companeros,
    trabajadorId: trabajador.id,
  })

  const enTerreno = trabajosEnCurso.length > 0

  return (
    <div className="mt-3 space-y-3 border-t border-black/5 pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <Building2 size={13} className="text-gray-400" />
          {departamento}
        </span>
        {trabajador.tarifa_hora > 0 && (
          <span className="text-gray-500">
            ${trabajador.tarifa_hora.toLocaleString('es-CL')}/hora
          </span>
        )}
      </div>

      {/* Jefatura: dos niveles distintos, y el Alcalde necesita los dos. */}
      <div className="space-y-1.5 rounded-xl border border-black/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          <UserCog size={12} /> Jefatura directa
        </p>
        {!jefeDepartamento && !jefeCuadrilla ? (
          <p className="text-xs text-gray-400">
            Este departamento no tiene un jefe con cuenta creada todavía.
          </p>
        ) : (
          <>
            <Contacto persona={jefeCuadrilla} etiqueta="Jefe de cuadrilla" />
            <Contacto persona={jefeDepartamento} etiqueta="Jefe de departamento" />
          </>
        )}
      </div>

      {/* Terreno: si está designado, la dirección exacta y el enlace para llegar. */}
      <div className="space-y-2 rounded-xl border border-black/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          <MapPin size={12} /> En terreno
        </p>

        {!enTerreno ? (
          <p className="text-xs text-gray-400">
            {trabajador.disponible
              ? 'Disponible, sin trabajos en ejecución.'
              : trabajador.asignado_a
                ? `Designado a "${trabajador.asignado_a}", sin un reporte asociado en el sistema.`
                : 'Designado, sin un reporte asociado en el sistema.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {trabajosEnCurso.map((inc) => (
              <li key={inc.id} className="text-xs">
                <p className="font-medium text-gray-900">
                  {etiquetaCategoria(inc.categoria)}
                  <span className="ml-1.5 font-normal text-gray-400">{inc.numero_ticket}</span>
                </p>
                <p className="text-gray-600">
                  {inc.direccion_texto || 'Sin dirección de referencia'}
                </p>
                {inc.coordenadas?.lat && (
                  <a
                    href={`https://www.google.com/maps?q=${inc.coordenadas.lat},${inc.coordenadas.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink size={11} />
                    Cómo llegar ({inc.coordenadas.lat.toFixed(5)}, {inc.coordenadas.lng.toFixed(5)})
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Horas. Tres cifras que responden preguntas distintas — ver equipo.js. */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          <Clock size={12} /> Carga de trabajo
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Dato
            etiqueta="Comprometidas"
            valor={formatearHoras(horas.comprometidas)}
            apoyo="Estimadas en lo que tiene abierto"
          />
          <Dato
            etiqueta="Este mes"
            valor={formatearHoras(horas.esteMes)}
            apoyo="Reales, en trabajos ya cerrados"
          />
          <Dato
            etiqueta="Histórico"
            valor={formatearHoras(horas.historicas)}
            apoyo={`${horas.trabajosCerrados} trabajo${horas.trabajosCerrados === 1 ? '' : 's'} cerrado${horas.trabajosCerrados === 1 ? '' : 's'}`}
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-gray-400">
          No se muestran horas del día porque la asistencia registra la fecha, no la hora de entrada.
        </p>
      </div>
    </div>
  )
}
