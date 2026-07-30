import { Link } from 'react-router-dom'
import { CheckCircle2, CloudOff } from 'lucide-react'
import Boton from '../common/Boton'

export default function TicketConfirmacion({ numeroTicket, pendienteSincronizar, onReportarOtra }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {pendienteSincronizar ? (
        <>
          <CloudOff size={56} className="text-amber-600" />
          <h2 className="text-xl font-semibold text-gray-900">Guardado sin conexión</h2>
          <p className="text-gray-500">
            Se guardó en tu dispositivo y se enviará automáticamente la próxima vez que abras la app con señal.
            Guarda este número para hacer seguimiento a tu solicitud:
          </p>
        </>
      ) : (
        <>
          <CheckCircle2 size={56} className="text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">¡Reporte enviado!</h2>
          <p className="text-gray-500">Guarda este número para hacer seguimiento a tu solicitud:</p>
        </>
      )}

      <div className={`w-full rounded-xl py-4 ${pendienteSincronizar ? 'bg-amber-50' : 'bg-gray-100'}`}>
        <span className="text-2xl font-bold tracking-wide text-primary">{numeroTicket}</span>
      </div>

      <Link to="/estado" className="text-sm font-medium text-primary hover:underline">
        Podrás consultar el estado de tu reporte más adelante con este número
      </Link>

      <Boton onClick={onReportarOtra} variante="secundario" className="w-full">
        Reportar otra incidencia
      </Boton>
    </div>
  )
}
