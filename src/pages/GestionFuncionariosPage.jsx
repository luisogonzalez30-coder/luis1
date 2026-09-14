import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle2, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { crearFuncionario, eliminarFuncionario, suscribirFuncionarios } from '../services/funcionariosService'
import { useAccionUnica } from '../hooks/useAccionUnica'
import { DEPARTAMENTOS } from '../utils/departamento'
import Boton from '../components/common/Boton'
import Spinner from '../components/common/Spinner'

const MENSAJES_ERROR = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/invalid-email': 'El formato del correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
}

const ETIQUETA_ROL = {
  ALCALDE_ADMIN: 'Alcalde',
  JEFE_DEPARTAMENTO: 'Jefe de Departamento',
  TERRENO: 'Terreno',
}

const FORMULARIO_VACIO = { nombre: '', correo: '', contrasena: '', telefono: '', rol: 'JEFE_DEPARTAMENTO', departamento: DEPARTAMENTOS[0] }

// Solo ALCALDE_ADMIN — ver ruta en App.jsx. Reemplaza la creación manual de
// funcionarios vía consola de Firebase (documentado como pendiente en
// ESTADO_PROYECTO.md §20). No permite crear otro ALCALDE_ADMIN desde acá
// (firestore.rules lo rechaza también del lado servidor) ni borrar la propia
// cuenta.
export default function GestionFuncionariosPage() {
  const { perfil } = useAuth()
  const [funcionarios, setFuncionarios] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const [eliminandoUid, setEliminandoUid] = useState(null)

  useEffect(() => {
    if (!perfil?.municipio_id) return
    const unsubscribe = suscribirFuncionarios((lista) => {
      setFuncionarios(lista)
      setCargandoLista(false)
    }, perfil.municipio_id)
    return unsubscribe
  }, [perfil?.municipio_id])

  // useAccionUnica y no un booleano: el submit del <form> se dispara antes de
  // que React repinte el botón deshabilitado. Acá eso importaba más que en
  // otros formularios — un doble Enter creaba DOS cuentas de Firebase Auth, y
  // borrar una cuenta de Auth no se puede desde la app (requiere la consola).
  const [manejarSubmit, creando] = useAccionUnica(async (e) => {
    e.preventDefault()
    setError(null)
    setExito(null)
    try {
      await crearFuncionario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        rol: form.rol,
        departamento: form.departamento,
        telefono: form.telefono,
        municipioId: perfil.municipio_id,
      })
      setExito(`Cuenta creada para ${form.nombre}. Comparte el correo y la contraseña con la persona por un canal seguro.`)
      setForm(FORMULARIO_VACIO)
    } catch (err) {
      console.error('[GestionFuncionariosPage] Error al crear funcionario:', err)
      setError(MENSAJES_ERROR[err.code] || 'No se pudo crear la cuenta. Intenta nuevamente.')
    }
  })

  async function manejarEliminar(funcionario) {
    if (!window.confirm(`¿Quitar el acceso de ${funcionario.nombre || funcionario.correo}? Podrá seguir existiendo como cuenta de correo, pero ya no podrá entrar al Dashboard.`)) {
      return
    }
    setEliminandoUid(funcionario.uid)
    try {
      await eliminarFuncionario(funcionario.uid)
    } catch (err) {
      console.error('[GestionFuncionariosPage] Error al eliminar funcionario:', err)
      window.alert('No se pudo quitar el acceso. Intenta nuevamente.')
    } finally {
      setEliminandoUid(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/dashboard/general" className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Gestión de funcionarios</h1>
      <p className="mt-1 text-sm text-gray-500">
        Crea cuentas para Jefes de Departamento y Terreno de tu municipalidad. Para crear otro Alcalde, contacta soporte.
      </p>

      <form onSubmit={manejarSubmit} className="mt-6 rounded-2xl border border-gray-200 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
          <UserPlus size={18} /> Nueva cuenta
        </h2>

        <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
        <input
          type="text"
          required
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
        <input
          type="email"
          required
          value={form.correo}
          onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Teléfono <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={form.telefono}
          onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
          placeholder="9 1234 5678"
          className="w-full rounded-lg border border-gray-300 p-2.5"
        />
        <p className="mb-4 mt-1 text-xs text-gray-400">
          Habilita el botón de WhatsApp en la tarjeta de su departamento, para contactarlo directo
          desde el panel del Alcalde.
        </p>

        <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña temporal</label>
        <input
          type="text"
          required
          minLength={6}
          value={form.contrasena}
          onChange={(e) => setForm((f) => ({ ...f, contrasena: e.target.value }))}
          placeholder="Mínimo 6 caracteres"
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Rol</label>
        <select
          value={form.rol}
          onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
          className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
        >
          <option value="JEFE_DEPARTAMENTO">Jefe de Departamento</option>
          <option value="TERRENO">Terreno</option>
        </select>

        {form.rol === 'JEFE_DEPARTAMENTO' && (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">Departamento</label>
            <select
              value={form.departamento}
              onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
              className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
            >
              {DEPARTAMENTOS.map((dep) => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {exito && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{exito}</span>
          </div>
        )}

        <Boton type="submit" className="w-full" cargando={creando}>
          Crear cuenta
        </Boton>
      </form>

      <h2 className="mb-3 mt-8 font-semibold text-gray-800">Funcionarios de tu municipalidad</h2>

      {cargandoLista ? (
        <Spinner />
      ) : funcionarios.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay otros funcionarios registrados.</p>
      ) : (
        <ul className="space-y-2">
          {funcionarios.map((f) => (
            <li key={f.uid} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <div>
                <p className="font-medium text-gray-900">{f.nombre || '(sin nombre)'}</p>
                <p className="text-sm text-gray-500">
                  {f.correo} · {ETIQUETA_ROL[f.rol] || f.rol}
                  {f.rol === 'JEFE_DEPARTAMENTO' && f.departamento ? ` · ${f.departamento}` : ''}
                </p>
              </div>
              {f.uid !== perfil.uid && (
                <button
                  onClick={() => manejarEliminar(f)}
                  disabled={eliminandoUid === f.uid}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Quitar acceso"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
