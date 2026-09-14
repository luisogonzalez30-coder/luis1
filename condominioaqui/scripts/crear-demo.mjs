// Crea el condominio de demostración: uno ficticio con
// torres, espacios comunes, reportes sembrados y el calendario de mantenciones
// de la Ley 21.442 a medio cumplir.
//
// Para qué sirve: es lo que se le muestra a un administrador o a un comité en
// la reunión de venta. El panel vacío no vende nada — el argumento del producto
// es "mira lo que tu comunidad va a ver el primer mes", y eso necesita volumen.
//
// NO se inventan datos sobre ningún condominio real: el nombre en pantalla dice
// "(demostración)" y las unidades son numeración genérica. Si mañana se firma un
// condominio real, se crea EL SUYO; este nunca se reutiliza.
//
// Uso:
//   node scripts/crear-condominio-demo.mjs              (solo informa, NO escribe)
//   node scripts/crear-condominio-demo.mjs --aplicar    (escribe de verdad)
//
// Requiere serviceAccountKey.json en la raíz del proyecto.

import { readFileSync } from 'fs'
import admin from 'firebase-admin'

const APLICAR = process.argv.includes('--aplicar')

// La credencial se carga SOLO al escribir de verdad. Así la simulación corre en
// cualquier máquina (y en CI) sin tener serviceAccountKey.json, que es
// justamente lo que uno quiere revisar antes de tocar la base.
let db = null
function conectar() {
  const credencial = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf-8'))
  admin.initializeApp({ credential: admin.credential.cert(credencial) })
  db = admin.firestore()
}

const ID = 'demo'

// Parque Los Almendros: 3 torres de 12 pisos × 4 areas = 144 unidades.
// Es el tamaño que mejor representa al cliente objetivo (ver el estudio de
// mercado): grande como para necesitar software, chico como para que hoy lo
// lleven en WhatsApp y Excel.
const CONFIGURACION = {
  nombre: 'Condominio Parque Los Almendros (demostración)',
  color_primario: '#0f766e',
  color_primario_oscuro: '#115e59',
  torres: [
    { nombre: 'Torre A', pisos: 12, unidades_por_piso: 4 },
    { nombre: 'Torre B', pisos: 12, unidades_por_piso: 4 },
    { nombre: 'Torre C', pisos: 12, unidades_por_piso: 4 },
  ],
  espacios_comunes: [
    'Hall de acceso',
    'Ascensor Torre A',
    'Ascensor Torre B',
    'Ascensor Torre C',
    'Estacionamientos subterráneo',
    'Sala de basura',
    'Piscina',
    'Quincho',
    'Sala multiuso',
    'Gimnasio',
    'Juegos infantiles',
    'Jardines',
    'Sala de bombas',
    'Conserjería',
  ],
  // Qué instalaciones tiene: decide qué obligaciones de la Ley 21.442 aplican
  // (ver src/utils/mantenciones.js).
  instalaciones: {
    tiene_ascensores: true,
    tiene_gas_comun: true,
    tiene_piscina: true,
    tiene_grupo_electrogeno: false,
  },
  // Los equipos que atienden: turnos de conserjería y el maestro de mantención.
  equipos: ['Conserjería turno día', 'Conserjería turno noche', 'Maestro de mantención'],
}

// Registros de mantención: a propósito con tres vencidas y varias sin cargar.
// Un demo donde todo está al día no muestra para qué sirve el módulo — el
// panel tiene que abrir en rojo, porque así abre la realidad de casi cualquier
// condominio el día que instala el sistema.
function mesesAtras(meses) {
  const f = new Date()
  f.setMonth(f.getMonth() - meses)
  return f.toISOString().slice(0, 10)
}

const MANTENCIONES = {
  certificacion_ascensores: { ultima_fecha: mesesAtras(14), proveedor: 'Ascensores Andes Ltda.' },
  mantencion_ascensores: { ultima_fecha: mesesAtras(1), proveedor: 'Ascensores Andes Ltda.' },
  extintores: { ultima_fecha: mesesAtras(13), proveedor: 'Extintores del Sur' },
  red_humeda: { ultima_fecha: mesesAtras(4), proveedor: 'Extintores del Sur' },
  instalacion_gas: { ultima_fecha: mesesAtras(26), proveedor: 'Gasfitería Certificada SpA' },
  estanques_agua: { ultima_fecha: mesesAtras(5), proveedor: 'Sanitiza Chile' },
  rendicion_cuentas: { ultima_fecha: mesesAtras(1), proveedor: 'Administración' },
}

// Reportes sembrados. Cada uno declara su categoría, dónde ocurre y hace
// cuántos días entró — así el panel abre con casos en los tres estados y con
// SLA vencidos de verdad, no simulados.
const REPORTES = [
  ['Ascensor_detenido', 'comun', 'Ascensor Torre B', 0, 'Pendiente', 12],
  ['Filtracion_desde_residente', 'unidad', ['Torre A', '802'], 1, 'En Proceso', 1],
  ['Luminaria_comun', 'comun', 'Estacionamientos subterráneo', 2, 'Pendiente', 3],
  ['Sala_basura', 'comun', 'Sala de basura', 2, 'En Proceso', 5],
  ['Ruidos_molestos', 'unidad', ['Torre C', '1104'], 3, 'Pendiente', 1],
  ['Porton_vehicular', 'comun', 'Estacionamientos subterráneo', 4, 'Resuelto', 8],
  ['Plaga', 'comun', 'Jardines', 5, 'Pendiente', 6],
  ['Extintor', 'comun', 'Hall de acceso', 6, 'Pendiente', 1],
  ['Piscina', 'comun', 'Piscina', 7, 'En Proceso', 9],
  ['Estacionamiento_ocupado', 'unidad', ['Torre B', '305'], 8, 'Resuelto', 1],
  ['Citofono', 'unidad', ['Torre A', '1201'], 9, 'Resuelto', 1],
  ['Juegos_infantiles', 'comun', 'Juegos infantiles', 11, 'En Proceso', 4],
  ['Mascota_suelta', 'comun', 'Jardines', 12, 'Resuelto', 2],
  ['Grieta_estructural', 'comun', 'Estacionamientos subterráneo', 14, 'En Proceso', 3],
  ['Consulta_gasto_comun', 'unidad', ['Torre C', '204'], 15, 'Resuelto', 1],
  ['Corte_luz_comun', 'comun', 'Hall de acceso', 18, 'Resuelto', 22],
  ['Bomba_agua', 'comun', 'Sala de bombas', 21, 'Resuelto', 15],
  ['Vandalismo', 'comun', 'Quincho', 24, 'Resuelto', 2],
]

// El triage y la derivación se replican acá en vez de importarse desde
// src/utils/categorias.js: ese módulo es del frontend (Vite) y este script corre
// con Node crudo contra el Admin SDK. Si cambias el catálogo allá, vuelve a
// correr este script — si una categoría ya no existe, avisa y se cae en vez de
// sembrar datos que la app no sabe mostrar.
const { CATEGORIAS, AREA_POR_CATEGORIA, GRAVEDAD_POR_CATEGORIA } =
  await import('../src/utils/categorias.js')

const COLOR_POR_GRAVEDAD = { Alta: '#d03b3b', Media: '#fab219', Baja: '#0ca30c' }

function numeroTicket(fecha, indice) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `INC-${y}${m}${d}-D${String(indice).padStart(3, '0')}`
}

async function main() {
  console.log(APLICAR ? '=== APLICANDO ===' : '=== SIMULACIÓN (usa --aplicar para escribir) ===')
  console.log(`Condominio: ${ID} — ${CONFIGURACION.nombre}`)

  const totalUnidades = CONFIGURACION.torres.reduce((n, t) => n + t.pisos * t.unidades_por_piso, 0)
  console.log(`${CONFIGURACION.torres.length} torres, ${totalUnidades} unidades, ${CONFIGURACION.espacios_comunes.length} espacios comunes`)

  const desconocidas = REPORTES.filter(([cat]) => !CATEGORIAS.some((c) => c.valor === cat))
  if (desconocidas.length) {
    console.error('Categorías que ya no existen en el catálogo:', desconocidas.map((r) => r[0]))
    process.exit(1)
  }

  console.log(`${REPORTES.length} reportes a sembrar, ${Object.keys(MANTENCIONES).length} mantenciones con registro`)

  if (!APLICAR) {
    console.log('\nNada escrito. Repite con --aplicar.')
    return
  }

  conectar()

  await db.collection('condominios').doc(ID).set(CONFIGURACION, { merge: true })
  console.log('✓ condominio creado')

  const loteMantenciones = db.batch()
  for (const [id, registro] of Object.entries(MANTENCIONES)) {
    loteMantenciones.set(db.collection('condominios').doc(ID).collection('mantenciones').doc(id), registro)
  }
  await loteMantenciones.commit()
  console.log('✓ mantenciones cargadas')

  let n = 0
  for (const [categoria, tipo, lugar, diasAtras, estado, upvotes] of REPORTES) {
    n++
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - diasAtras)

    const gravedad = GRAVEDAD_POR_CATEGORIA[categoria] || 'Media'
    const ubicacion =
      tipo === 'comun'
        ? { tipo: 'espacio_comun', espacio_comun: lugar, etiqueta: lugar }
        : { tipo: 'unidad', torre: lugar[0], unidad: lugar[1], etiqueta: `${lugar[0]} · ${lugar[1]}` }

    const ticket = numeroTicket(fecha, n)
    const solicitudRef = db.collection('solicitudes').doc()

    const lote = db.batch()
    lote.set(solicitudRef, {
      categoria,
      ubicacion,
      direccion_texto: '',
      detalles_adicionales: 'Reporte de demostración.',
      numero_ticket: ticket,
      condominio_id: ID,
      nivel_gravedad: gravedad,
      color_pin: COLOR_POR_GRAVEDAD[gravedad],
      area: AREA_POR_CATEGORIA[categoria] || 'Administración',
      // Sin nombre, sin teléfono y sin RUT: el demo nunca lleva datos de
      // personas, ni inventados (se confunden con reales al mostrarlo).
      nombre_residente: '',
      contacto_residente: '',
      es_anonimo: true,
      fotos_antes_urls: [],
      foto_despues_url: '',
      estado,
      equipo_asignado: estado === 'Pendiente' ? '' : CONFIGURACION.equipos[n % CONFIGURACION.equipos.length],
      upvotes,
      usuarios_afectados: [],
      presupuesto_estimado: null,
      gasto_real: null,
      calificacion_residente: estado === 'Resuelto' ? 4 + (n % 2) : null,
      notificado_whatsapp_creacion: true,
      notificado_whatsapp_asignacion: false,
      notificado_whatsapp: estado === 'Resuelto',
      alertado_administracion: false,
      dispositivo_id: `demo-condominio-${n}`,
      fecha_creacion: admin.firestore.Timestamp.fromDate(fecha),
      fecha_asignacion: estado === 'Pendiente' ? null : admin.firestore.Timestamp.fromDate(fecha),
      fecha_cierre: estado === 'Resuelto' ? admin.firestore.Timestamp.fromDate(new Date()) : null,
    })

    lote.set(db.collection('tickets_condominio').doc(ticket), {
      solicitud_id: solicitudRef.id,
      condominio_id: ID,
      categoria,
      nivel_gravedad: gravedad,
      direccion_texto: '',
      // Solo el espacio común es público; la unidad nunca sale de la solicitud.
      ...(tipo === 'comun' ? { ubicacion_publica: lugar } : {}),
      upvotes,
      estado,
      foto_url: '',
      calificacion_residente: estado === 'Resuelto' ? 4 + (n % 2) : null,
      fecha_creacion: admin.firestore.Timestamp.fromDate(fecha),
    })

    await lote.commit()
  }

  console.log(`✓ ${REPORTES.length} reportes sembrados`)
  console.log(`\nListo. Abre: https://<tu-proyecto>.web.app/${ID}`)
  console.log('Falta crear a mano el usuario ADMINISTRADOR de este condominio (ver LEEME.md).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
