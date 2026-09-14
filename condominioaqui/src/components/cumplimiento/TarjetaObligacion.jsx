import { FileText, History, Paperclip, Scale } from 'lucide-react'
import { ESTADO_MANTENCION, formatearDia, textoPeriodicidad, textoVencimiento } from '../../utils/mantenciones'
import BadgeCumplimiento from './BadgeCumplimiento'

// Una obligación de la lista. Todo lo que el administrador necesita para decidir
// si actuar hoy, sin abrir nada: en qué estado está, cuándo vence, quién la hizo
// la última vez y si hay papel que lo respalde.

const COLOR_TEXTO_VENCIMIENTO = {
  [ESTADO_MANTENCION.VENCIDA]: 'text-red-700 font-medium',
  [ESTADO_MANTENCION.SIN_REGISTRO]: 'text-tinta-suave',
  [ESTADO_MANTENCION.POR_VENCER]: 'text-amber-700 font-medium',
  [ESTADO_MANTENCION.AL_DIA]: 'text-tinta-suave',
}

export default function TarjetaObligacion({ item, onRegistrar, onVerHistorial, puedeRegistrar }) {
  const sinPapel = item.ultima_fecha && !item.documento_url

  return (
    <li className="rounded-2xl border border-borde bg-white p-4 shadow-tarjeta">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-tinta-fuerte">{item.nombre}</h3>
          <p className="mt-0.5 text-xs text-tinta-tenue">
            {item.grupo} · {textoPeriodicidad(item.periodicidad_meses)}
            {item.periodicidad_personalizada && ' (ajustada para este condominio)'}
          </p>
        </div>
        <BadgeCumplimiento estado={item.estado} />
      </div>

      <p className={`mt-2 text-sm ${COLOR_TEXTO_VENCIMIENTO[item.estado] || 'text-tinta-suave'}`}>
        {textoVencimiento(item)}
      </p>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs text-tinta-suave">
        {item.ultima_fecha && (
          <div className="flex gap-1.5">
            <dt className="shrink-0 text-tinta-tenue">Última vez:</dt>
            <dd>
              {formatearDia(item.ultima_fecha)}
              {item.proveedor && ` · ${item.proveedor}`}
            </dd>
          </div>
       )}
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-tinta-tenue">
            <Scale size={12} className="mt-0.5 inline" aria-hidden="true" /> Base:
          </dt>
          <dd>{item.base_legal}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="shrink-0 text-tinta-tenue">
            <FileText size={12} className="mt-0.5 inline" aria-hidden="true" /> Respaldo:
          </dt>
          <dd>{item.evidencia}</dd>
        </div>
      </dl>

      {/* Un registro sin documento adjunto se ve "al día" en pantalla y no sirve
          de nada ante una fiscalización ni ante la aseguradora. Hay que decirlo
          donde se mira, no solo en el manual. */}
      {sinPapel && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Registrada sin documento adjunto. Sin el respaldo, este registro no prueba nada frente a una
          fiscalización.
        </p>
     )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {puedeRegistrar && (
          <button
            type="button"
            onClick={() => onRegistrar(item)}
            className="min-h-[38px] rounded-xl bg-primary px-3 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            {item.ultima_fecha ? 'Registrar nueva' : 'Registrar'}
          </button>
       )}

        {item.documento_url && (
          <a
            href={item.documento_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-tinta-fuerte/[0.06] px-3 text-sm font-medium text-tinta transition-colors hover:bg-tinta-fuerte/[0.1]"
          >
            <Paperclip size={15} /> Ver respaldo
          </a>
       )}

        {item.historial.length > 0 && (
          <button
            type="button"
            onClick={() => onVerHistorial(item)}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-tinta-suave transition-colors hover:bg-tinta-fuerte/5 hover:text-tinta"
          >
            <History size={15} /> Historial ({item.historial.length})
          </button>
       )}
      </div>
    </li>
 )
}
