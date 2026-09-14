import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, CheckCircle2, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { crearUsuario, eliminarUsuario, suscribirUsuarios } from '../services/usuariosService'
import { useAccionUnica } from '../hooks/useAccionUnica'
import { AREAS } from '../utils/areas'
import Boton from '../components/common/Boton'
import Spinner from '../components/common/Spinner'

const MENSAJES_ERROR = {
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/invalid-email': 'El formato del correo no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
}

const ETIQUETA_ROL = {
  ADMINISTRADOR: 'Administrador',
  COMITE: 'Jefe de Area',
  CONSERJERIA: 'Terreno',
}

const FORMULARIO_VACIO = { nombre: '', correo: '', contrasena: '', telefono: '', rol: 'COMITE', area: AREAS[0] }

// Solo ADMINISTRADOR — ver ruta en App.jsx. Reemplaza la creación manual de
// usuarios vía consola de Firebase (documentado como pendiente en
// la documentación del proyecto). No permite crear otro ADMINISTRADOR desde acá
// (firestore.rules lo rechaza también del lado servidor) ni borrar la propia
// cuenta.
export default function GestionUsuariosPage() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [form, setForm] = useState(FORMULARIO_VACIO)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)
  const [eliminandoUid, setEliminandoUid] = useState(null)

  useEffect(() => {
    if (!perfil?.condominio_id) return
    const unsubscribe = suscribirUsuarios((lista) => {
      setUsuarios(lista)
      setCargandoLista(false)
    }, perfil.condominio_id)
    return unsubscribe
  }, [perfil?.condominio_id])

  // useAccionUnica y no un booleano: el submit del <form> se dispara antes de
  // que React repinte el botón deshabilitado. Acá eso importaba más que en
  // otros formularios — un doble Enter creaba DOS cuentas de Firebase Auth, y
  // borrar una cuenta de Auth no se puede desde la app (requiere la consola).
  const [manejarSubmit, creando] = useAccionUnica(async (e) => {
    e.preventDefault()
    setError(null)
    setExito(null)
    try {
      await crearUsuario({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        contrasena: form.contrasena,
        rol: form.rol,
        area: form.area,
        telefono: form.telefono,
        condominioId: perfil.condominio_id,
      })
      setExito(`Cuenta creada para ${form.nombre}. Comparte el correo y la contraseña con la persona por un canal seguro.`)
      setForm(FORMULARIO_VACIO)
    } catch (err) {
      console.error('[GestionUsuariosPage] Error al crear usuario:', err)
      setError(MENSAJES_ERROR[err.code] || 'No se pudo crear la cuenta. Intenta nuevamente.')
    }
  })

  async function manejarEliminar(usuario) {
    if (!window.confirm(`¿Quitar el acceso de ${usuario.nombre || usuario.correo}? Podrá seguir existiendo como cuenta de correo, pero ya no podrá entrar al Dashboard.`)) {
      return
    }
    setEliminandoUid(usuario.uid)
    try {
      await eliminarUsuario(usuario.uid)
    } catch (err) {
      console.error('[GestionUsuariosPage] Error al eliminar usuario:', err)
      window.alert('No se pudo quitar el acceso. Intenta nuevamente.')
    } finally {
      setEliminandoUid(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/panel/administracion" className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft size={16} /> Volver al Dashboard
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Gestión de usuarios</h1>
      <p className="mt-1 text-sm text-gray-500">
        Crea cuentas para Jefes de Area y Terreno de tu condominio. Para crear otro Administrador, contacta soporte.
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
          Habilita el botón de WhatsApp en la tarjeta de su área, para contactarlo directo
          desde el panel del Administrador.
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
          <option value="COMITE">Jefe de Area</option>
          <option value="CONSERJERIA">Terreno</option>
        </select>

        {form.rol === 'COMITE' && (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">Area</label>
            <select
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              className="mb-4 w-full rounded-lg border border-gray-300 p-2.5"
            >
              {AREAS.map((dep) => (
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

      <h2 className="mb-3 mt-8 font-semibold text-gray-800">Usuarios de tu condominio</h2>

      {cargandoLista ? (
        <Spinner />
     ) : usuarios.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay otros usuarios registrados.</p>
     ) : (
        <ul className="space-y-2">
          {usuarios.map((f) => (
            <li key={f.uid} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <div>
                <p className="font-medium text-gray-900">{f.nombre || '(sin nombre)'}</p>
                <p className="text-sm text-gray-500">
                  {f.correo} · {ETIQUETA_ROL[f.rol] || f.rol}
                  {f.rol === 'COMITE' && f.area ? ` · ${f.area}` : ''}
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
