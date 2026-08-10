import { Link } from 'react-router-dom'
import { CheckCircle2, CloudOff, ThumbsUp, MessageCircle } from 'lucide-react'
import Boton from '../common/Boton'
import { formatearNumeroTicket } from '../../utils/ticket'

export default function TicketConfirmacion({ numeroTicket, pendienteSincronizar, esVotoExistente, onReportarOtra }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {pendienteSincronizar ? (
        <>
          <CloudOff size={56} className="text-amber-600" />
          <h2 className="text-xl font-semibold text-gray-900">Guardado sin conexión</h2>
          {/* Las dos condiciones van dichas a propósito: useSincronizacionOffline
              reacciona al evento 'online' (se envía solo, sin que el vecino haga
              nada, si dejó la app abierta) y también al volver a primer plano.
              Decir solo "la próxima vez que abras la app" hacía pensar que había
              que hacer algo a mano. */}
          <p className="text-gray-500">
            Se guardó en tu teléfono y se enviará automáticamente <strong>en cuanto vuelva la señal</strong>, o la
            próxima vez que abras la app. Anota este número:
          </p>
        </>
      ) : esVotoExistente ? (
        <>
          <ThumbsUp size={56} className="text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">¡Te sumaste al reporte!</h2>
          <p className="text-gray-500">
            No hacía falta crear uno nuevo — este es el número al que te sumaste:
          </p>
        </>
      ) : (
        <>
          <CheckCircle2 size={56} className="text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">¡Reporte enviado!</h2>
          <p className="text-gray-500">Este es el número de tu reporte:</p>
        </>
      )}

      <div
        className={`w-full rounded-3xl py-6 shadow-sm ring-1 ${
          pendienteSincronizar ? 'bg-amber-50 ring-amber-200' : 'bg-gradient-to-b from-primary/10 to-primary/5 ring-primary/20'
        }`}
      >
        <span className="text-4xl font-bold tracking-[0.2em] text-primary">
          {formatearNumeroTicket(numeroTicket)}
        </span>
      </div>

      {!pendienteSincronizar && !esVotoExistente && (
        <div className="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-left text-sm text-gray-600">
          <MessageCircle size={18} className="mt-0.5 shrink-0 text-primary" />
          <span>
            También te lo mandamos por WhatsApp. Si se te pierde, escríbenos <strong>"mis reportes"</strong> por
            ahí mismo y te lo reenviamos.
          </span>
        </div>
      )}

      <Link to="/estado" className="text-sm font-medium text-primary hover:underline">
        Consultar el estado de mi reporte
      </Link>

      <Boton onClick={onReportarOtra} variante="secundario" className="w-full">
        Reportar otra incidencia
      </Boton>
    </div>
  )
}
