import { useRef, useState } from 'react'
import { AlertTriangle, Paperclip, Upload, X } from 'lucide-react'
import { subirDocumento } from '../../services/storageService'
import { textoPeriodicidad } from '../../utils/mantenciones'
import Modal from '../common/Modal'
import Boton from '../common/Boton'

// Registrar el cumplimiento de una obligación.
//
// Tres campos y uno solo obligatorio: la fecha. El resto —proveedor, respaldo,
// periodicidad— se puede completar después. Es deliberado: si el formulario
// exige el PDF, el administrador que tiene el certificado en papel sobre el
// escritorio no carga nada, y el sistema queda con menos información que el
// Excel que vino a reemplazar. Mejor un registro incompleto y visible (la
// tarjeta avisa que le falta el respaldo) que ningún registro.

function hoyISO() {
  // El input date trabaja en hora local; toISOString() convierte a UTC y en
  // Chile eso puede devolver el día siguiente, ofreciendo una fecha futura como
  // valor por defecto. Se arma a mano con los componentes locales.
  const f = new Date()
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  const dia = String(f.getDate()).padStart(2, '0')
  return `${f.getFullYear()}-${mes}-${dia}`
}

export default function ModalRegistroMantencion({ obligacion, condominioId, onGuardar, onCerrar }) {
  const [fecha, setFecha] = useState(obligacion.ultima_fecha || hoyISO())
  const [proveedor, setProveedor] = useState(obligacion.proveedor || '')
  const [periodicidad, setPeriodicidad] = useState(String(obligacion.periodicidad_meses))
  const [documentoUrl, setDocumentoUrl] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)
  const campoArchivo = useRef(null)

  const maximo = hoyISO()
  const fechaFutura = fecha > maximo
  const periodicidadValida = Number(periodicidad) >= 1 && Number(periodicidad) <= 120
  const puedeGuardar = Boolean(fecha) && !fechaFutura && periodicidadValida && !subiendo

  async function manejarArchivo(evento) {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    setError(null)
    setSubiendo(true)
    try {
      const url = await subirDocumento(archivo, `mantenciones/${condominioId}/${obligacion.id}`)
      setDocumentoUrl(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
      // Se limpia el input para que elegir el MISMO archivo otra vez (tras un
      // error) vuelva a disparar el change.
      if (campoArchivo.current) campoArchivo.current.value = ''
    }
  }

  async function guardar() {
    setError(null)
    try {
      await onGuardar({
        ultimaFecha: fecha,
        proveedor: proveedor.trim(),
        documentoUrl,
        // Solo viaja si de verdad cambió respecto del default del catálogo.
        periodicidadMeses:
          Number(periodicidad) === obligacion.periodicidad_meses ? null : Number(periodicidad),
      })
    } catch (err) {
      setError(err.message || 'No se pudo guardar el registro.')
    }
  }

  return (
    <Modal titulo={obligacion.nombre} subtitulo={obligacion.base_legal} onCerrar={onCerrar} ancho="lg">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="fecha-mantencion" className="mb-1 block text-sm font-medium text-tinta">
            ¿Cuándo se ejecutó?
          </label>
          <input
            id="fecha-mantencion"
            type="date"
            value={fecha}
            max={maximo}
            onChange={(e) => setFecha(e.target.value)}
            className={`w-full rounded-2xl border p-3 text-base focus:outline-none focus:ring-2 ${
              fechaFutura ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:border-primary focus:ring-primary/30'
            }`}
          />
          <p className={`mt-1 text-xs ${fechaFutura ? 'text-red-600' : 'text-tinta-tenue'}`}>
            {fechaFutura
              ? 'No se puede registrar algo que todavía no ha ocurrido.'
              : 'La fecha del certificado o del informe del proveedor, no la de hoy.'}
          </p>
        </div>

        <div>
          <label htmlFor="proveedor-mantencion" className="mb-1 block text-sm font-medium text-tinta">
            ¿Quién la hizo?
          </label>
          <input
            id="proveedor-mantencion"
            type="text"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Ej: Ascensores Andes Ltda."
            className="w-full rounded-2xl border border-gray-300 p-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="periodicidad-mantencion" className="mb-1 block text-sm font-medium text-tinta">
            ¿Cada cuántos meses corresponde?
          </label>
          <input
            id="periodicidad-mantencion"
            type="number"
            min="1"
            max="120"
            value={periodicidad}
            onChange={(e) => setPeriodicidad(e.target.value)}
            className={`w-full rounded-2xl border p-3 text-base focus:outline-none focus:ring-2 ${
              periodicidadValida ? 'border-gray-300 focus:border-primary focus:ring-primary/30' : 'border-red-400 focus:ring-red-200'
            }`}
          />
          <p className={`mt-1 text-xs ${periodicidadValida ? 'text-tinta-tenue' : 'text-red-600'}`}>
            {periodicidadValida
              ? `Por defecto: ${textoPeriodicidad(obligacion.periodicidad_meses).toLowerCase()}. Ajústalo si tu contrato o el manual del equipo dicen otra cosa.`
              : 'Tiene que ser un número entre 1 y 120 meses.'}
          </p>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-tinta">Respaldo</span>
          <p className="mb-2 text-xs text-tinta-tenue">{obligacion.evidencia}</p>

          {documentoUrl ? (
            <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-3 text-sm text-green-800">
              <Paperclip size={16} className="shrink-0" />
              <a href={documentoUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate underline">
                Documento cargado
              </a>
              <button
                type="button"
                onClick={() => setDocumentoUrl('')}
                className="shrink-0 rounded-full p-1 hover:bg-green-100"
                aria-label="Quitar documento"
              >
                <X size={16} />
              </button>
            </div>
         ) : (
            <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 p-3 text-sm text-tinta-suave transition-colors hover:border-primary hover:text-primary">
              {subiendo ? 'Subiendo…' : <><Upload size={16} /> Adjuntar PDF o foto</>}
              <input
                ref={campoArchivo}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={manejarArchivo}
                disabled={subiendo}
                className="sr-only"
              />
            </label>
         )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
       )}

        <div className="flex gap-3 pt-1">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton className="flex-1" disabled={!puedeGuardar} onClick={guardar} textoCargando="Guardando…">
            Guardar registro
          </Boton>
        </div>
      </div>
    </Modal>
 )
}
