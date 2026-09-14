import { useState } from 'react'
import { Camera, AlertTriangle, Plus, Trash2, Receipt } from 'lucide-react'
import Boton from './Boton'
import { useAuth } from '../../context/AuthContext'
import { calcularCostoManoObra, evaluarDesviacion } from '../../utils/costeo'

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

// Cierre de gasto real al resolver una solicitud — usado tanto por Terreno
// (DetalleTarea.jsx) como por el Jefe de Area cuando resuelve directo
// (PanelGestionArea.jsx). Antes cada uno tenía su propio "costo final"
// como un solo número escrito a mano, sin respaldo ni comparación contra el
// presupuesto. Acá:
// - el costo de mano de obra SIEMPRE se calcula solo (tarifa_hora de cada
//   trabajador asignado × horas reales), nunca se escribe a mano;
// - los materiales van ítem por ítem (descripción + costo), no un solo
//   número — así se sabe en qué se gastó, no solo cuánto;
// - si lo reportado se desvía mucho de presupuesto_estimado (ver
//   utils/costeo.js), no se bloquea el cierre, pero se exige una
//   justificación de texto y el ticket queda marcado "a revisar" para quien
//   mira el gasto después (ModalDetalleGasto.jsx). firestore.rules aplica la
//   misma regla del lado del servidor, así que esto no se puede saltar
//   llamando a Firestore directo.
export default function FormularioCierreGasto({ solicitud, guardando, error, onResolver }) {
  const { perfil } = useAuth()
  const [fotoDespues, setFotoDespues] = useState(null)
  const [comprobante, setComprobante] = useState(null)
  const [horasReales, setHorasReales] = useState('')
  const [materiales, setMateriales] = useState([{ descripcion: '', costo: '' }])
  const [justificacion, setJustificacion] = useState('')

  const previewUrl = fotoDespues ? URL.createObjectURL(fotoDespues) : null
  const presupuesto = solicitud.presupuesto_estimado
  const trabajadoresAsignados = presupuesto?.trabajadores_asignados || []

  const materialesValidos = materiales.filter((m) => m.descripcion.trim().length > 0 && Number(m.costo) >= 0)
  const costoMateriales = materialesValidos.reduce((total, m) => total + Number(m.costo), 0)
  const costoManoObra = calcularCostoManoObra(trabajadoresAsignados, Number(horasReales) || 0)
  const costoTotal = costoManoObra + costoMateriales

  const { requiereRevision, horasDesviadas, costoDesviado } = evaluarDesviacion({
    horasEstimadas: presupuesto?.horas_estimadas || 0,
    costoAprox: presupuesto?.costo_aprox || 0,
    horasReales: Number(horasReales) || 0,
    costoTotal,
  })

  // Filas a medio llenar (solo descripción o solo costo) bloquean el envío en
  // vez de descartarse en silencio — evita que un material real se pierda
  // porque quedó con el costo vacío por error.
  const materialesIncompletos = materiales.some(
    (m) => (m.descripcion.trim().length > 0) !== (m.costo !== '' && Number(m.costo) >= 0)
 )

  const gastoValido =
    Number(horasReales) > 0 &&
    !materialesIncompletos &&
    (!requiereRevision || justificacion.trim().length > 0)

  function actualizarMaterial(indice, campo, valor) {
    setMateriales((prev) => prev.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m)))
  }

  function agregarMaterial() {
    setMateriales((prev) => [...prev, { descripcion: '', costo: '' }])
  }

  function quitarMaterial(indice) {
    setMateriales((prev) => prev.filter((_, i) => i !== indice))
  }

  function manejarSubmit() {
    if (!gastoValido) return
    return onResolver(fotoDespues, comprobante, {
      horas_reales: Number(horasReales),
      materiales_usados: materialesValidos.map((m) => ({ descripcion: m.descripcion.trim(), costo: Number(m.costo) })),
      costo_materiales: costoMateriales,
      costo_mano_obra: costoManoObra,
      costo_final: costoTotal,
      justificacion: justificacion.trim() || null,
      requiere_revision: requiereRevision,
      cerrado_por: perfil?.nombre || null,
    })
  }

  return (
    <div>
      {presupuesto && (
        <div className="mb-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
          <p className="mb-0.5 font-medium uppercase text-gray-400">Presupuestado</p>
          {/* Un presupuesto marcado "no aplica" llega con costo_aprox en null
              (ver ModalPresupuesto.jsx). Con `|| 0` se mostraba "$0", que la
              equipo lee como "no me autorizaron gastar nada" en vez de "no
              se alcanzó a estimar" — dos cosas muy distintas para quien está
              parado en la calle decidiendo si compra un saco de cemento. */}
          {presupuesto.presupuesto_no_aplica || presupuesto.costo_aprox == null ? (
            <p>
              {presupuesto.horas_estimadas > 0 && <>Horas: {presupuesto.horas_estimadas}h · </>}
              Costo: <strong>N/A</strong> — no se pudo estimar al asignar
              {presupuesto.motivo_sin_presupuesto && <> ("{presupuesto.motivo_sin_presupuesto}")</>}
            </p>
         ) : (
            <p>
              Horas: {presupuesto.horas_estimadas}h · Costo aprox: {formatoCLP.format(presupuesto.costo_aprox)}
            </p>
         )}
          {presupuesto.materiales_estimados?.length > 0 && (
            <p>
              Materiales previstos: {presupuesto.materiales_estimados.map((m) => m.descripcion).join(', ')}
            </p>
         )}
        </div>
     )}

      <p className="mb-1 text-xs font-medium uppercase text-gray-400">Foto del trabajo terminado (opcional)</p>
      {previewUrl ? (
        <img src={previewUrl} alt="Después" className="mb-3 max-h-56 w-full rounded-xl object-cover" />
     ) : (
        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-gray-500">
          <Camera size={24} />
          <span className="text-sm font-medium">Subir foto de término</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFotoDespues(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
     )}

      <label className="mb-1 block text-sm font-medium text-gray-700">Horas reales trabajadas</label>
      <input
        type="number"
        min="1"
        value={horasReales}
        onChange={(e) => setHorasReales(e.target.value)}
        className="mb-1 w-full rounded-lg border border-gray-300 p-2.5"
      />
      {trabajadoresAsignados.length > 0 && Number(horasReales) > 0 && (
        <p className="mb-3 text-xs text-gray-500">Costo de mano de obra (calculado): {formatoCLP.format(costoManoObra)}</p>
     )}

      <label className="mb-1 mt-2 block text-sm font-medium text-gray-700">Materiales / insumos usados</label>
      <p className="mb-2 text-xs text-gray-400">Uno por línea, con su costo. Si no se usó ninguno, deja la lista vacía.</p>
      <div className="mb-2 space-y-2">
        {materiales.map((m, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: 2 sacos de asfalto frío"
              value={m.descripcion}
              onChange={(e) => actualizarMaterial(i, 'descripcion', e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
            />
            <input
              type="number"
              min="0"
              placeholder="$"
              value={m.costo}
              onChange={(e) => actualizarMaterial(i, 'costo', e.target.value)}
              className="w-24 rounded-lg border border-gray-300 p-2 text-sm"
            />
            {materiales.length > 1 && (
              <button
                type="button"
                onClick={() => quitarMaterial(i)}
                className="shrink-0 text-gray-400 hover:text-estado-critico"
                aria-label="Quitar material"
              >
                <Trash2 size={18} />
              </button>
           )}
          </div>
       ))}
      </div>
      <button type="button" onClick={agregarMaterial} className="mb-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Plus size={14} /> Agregar material
      </button>

      {costoMateriales > 0 && (
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-primary hover:underline">
          <Receipt size={14} />
          {comprobante ? comprobante.name : 'Adjuntar boleta o comprobante (opcional)'}
          <input type="file" accept="image/*" onChange={(e) => setComprobante(e.target.files?.[0] || null)} className="hidden" />
        </label>
     )}

      <div className="mb-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
        Costo total: <strong>{formatoCLP.format(costoTotal)}</strong> (mano de obra + materiales)
      </div>

      {requiereRevision && (
        <div className="mb-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-800">
          <p className="mb-1 flex items-center gap-1 font-medium">
            <AlertTriangle size={14} /> Esto se sale del presupuesto
          </p>
          {horasDesviadas && <p>Las horas reales superan bastante lo estimado.</p>}
          {costoDesviado && <p>El costo total supera bastante lo presupuestado.</p>}
          <label className="mb-1 mt-2 block font-medium text-orange-900">Explica en qué se gastó de más</label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-orange-200 p-2 text-xs"
            placeholder="Ej: se encontró una fuga adicional al abrir la vereda"
          />
        </div>
     )}

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
     )}

      <Boton className="w-full" cargando={guardando} disabled={!gastoValido} onClick={manejarSubmit}>
        Marcar como Resuelto
      </Boton>
    </div>
 )
}
