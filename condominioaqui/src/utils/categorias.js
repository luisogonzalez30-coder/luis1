// Catálogo de categorías de CondominioAquí: qué puede reportar un residente.
//
// 84 categorías en 9 grupos, salidas del estudio de mercado (docs/ESTUDIO-MERCADO.md):
// los problemas que de verdad ocurren en un condominio chileno, más las
// obligaciones que la Ley 21.442 le pone encima al administrador.
//
// Diseño: cada categoría se declara UNA sola vez, con su etiqueta, su grupo, su
// gravedad de triage y el área responsable. Los tres mapas que el resto de la
// app consume se derivan de acá. La alternativa —catálogo, triage y derivación
// en tres archivos separados— obliga a acordarse de tocar los tres al agregar
// una categoría, y eso se olvida.

// Áreas responsables de resolver. Es el valor que se guarda en
// `solicitudes/{id}.area` y por el que se acota lo que ve el Comité.
//
// "Proveedor Externo" es un área de verdad y no un cajón de sastre: ascensores,
// gas, extintores y bombas los toca por ley una empresa certificada, no el
// maestro del condominio. Separarlas hace que el panel muestre de una mirada
// cuánto de lo pendiente depende de un tercero al que hay que llamar y cotizar.
export const AREAS = [
  'Administración',
  'Conserjería',
  'Mantención y Obras',
  'Aseo y Áreas Verdes',
  'Seguridad',
  'Convivencia y Reglamento',
  'Proveedor Externo',
]

export const AREA_POR_DEFECTO = 'Administración'

// Catálogo único. Cada fila declara: valor interno, etiqueta visible, grupo
// (para el selector por color), gravedad de triage y área responsable.
//
//   avisoSeguridad: muestra el recuadro de "esto no reemplaza al 133".
//   legal:          la Ley 21.442 hace responsable al administrador de esto,
//                   así que el reporte además marca una obligación legal
//                   vencida o en riesgo (ver utils/mantenciones.js).
const CATALOGO = [
  // ── Agua y filtraciones ───────────────────────────────────────────────
  // El problema #1 de convivencia en edificios chilenos: empieza técnico y
  // termina en pelea entre residentes porque nadie deja registro de cuándo se
  // avisó. Por eso todas van con foto y quedan con fecha.
  ['Filtracion_desde_residente', 'Filtración desde el área de arriba/al lado', 'Agua y Filtraciones', 'Alta', 'Mantención y Obras'],
  ['Filtracion_techumbre', 'Filtración por techumbre o terraza', 'Agua y Filtraciones', 'Alta', 'Mantención y Obras'],
  ['Filtracion_subterraneo', 'Filtración en subterráneo o estacionamientos', 'Agua y Filtraciones', 'Media', 'Mantención y Obras'],
  ['Rebalse_alcantarillado', 'Alcantarillado tapado o rebalsado', 'Agua y Filtraciones', 'Alta', 'Mantención y Obras'],
  ['Bomba_agua', 'Bomba de agua con falla o sin presión', 'Agua y Filtraciones', 'Alta', 'Proveedor Externo'],
  ['Estanque_agua', 'Estanque de agua sucio o con falla', 'Agua y Filtraciones', 'Alta', 'Proveedor Externo'],
  ['Corte_agua_comun', 'Corte de agua en el condominio', 'Agua y Filtraciones', 'Alta', 'Administración'],
  ['Medidor_agua', 'Medidor de agua con lectura errónea', 'Agua y Filtraciones', 'Baja', 'Administración'],

  // ── Electricidad e iluminación ────────────────────────────────────────
  ['Corte_luz_comun', 'Corte de luz en espacios comunes', 'Electricidad e Iluminación', 'Alta', 'Mantención y Obras'],
  ['Tablero_electrico', 'Tablero eléctrico con falla o expuesto', 'Electricidad e Iluminación', 'Alta', 'Proveedor Externo'],
  ['Grupo_electrogeno', 'Grupo electrógeno no parte', 'Electricidad e Iluminación', 'Alta', 'Proveedor Externo'],
  ['Luminaria_comun', 'Luz quemada en pasillo, hall o estacionamiento', 'Electricidad e Iluminación', 'Media', 'Mantención y Obras'],
  ['Luz_emergencia', 'Luz de emergencia apagada o sin batería', 'Electricidad e Iluminación', 'Alta', 'Mantención y Obras', { legal: true }],
  ['Citofono', 'Citófono sin funcionar', 'Electricidad e Iluminación', 'Media', 'Mantención y Obras'],
  ['Camara_seguridad', 'Cámara de seguridad dañada o sin grabar', 'Electricidad e Iluminación', 'Media', 'Seguridad'],
  ['Antena_internet', 'Antena, internet o TV comunitaria sin señal', 'Electricidad e Iluminación', 'Baja', 'Proveedor Externo'],

  // ── Ascensores y accesos ──────────────────────────────────────────────
  // El ascensor detenido es la urgencia que más rápido escala a reclamo
  // formal: deja sin salida a adultos mayores y a quien vive en pisos altos.
  ['Ascensor_detenido', 'Ascensor detenido o fuera de servicio', 'Ascensores y Accesos', 'Alta', 'Proveedor Externo', { legal: true }],
  ['Ascensor_persona_atrapada', 'Persona atrapada en el ascensor', 'Ascensores y Accesos', 'Alta', 'Conserjería', { avisoSeguridad: true }],
  ['Ascensor_ruido', 'Ascensor con ruido, golpes o nivelación mala', 'Ascensores y Accesos', 'Media', 'Proveedor Externo'],
  ['Ascensor_certificacion', 'Certificación de ascensor vencida o por vencer', 'Ascensores y Accesos', 'Alta', 'Administración', { legal: true }],
  ['Porton_vehicular', 'Portón vehicular no abre o queda abierto', 'Ascensores y Accesos', 'Alta', 'Mantención y Obras'],
  ['Barrera_estacionamiento', 'Barrera de estacionamiento con falla', 'Ascensores y Accesos', 'Media', 'Mantención y Obras'],
  ['Control_acceso', 'Tarjeta, control o chapa de acceso no funciona', 'Ascensores y Accesos', 'Media', 'Conserjería'],
  ['Puerta_acceso_abierta', 'Puerta de acceso queda abierta o sin cierre', 'Ascensores y Accesos', 'Alta', 'Seguridad'],

  // ── Gas y seguridad contra incendios ──────────────────────────────────
  // Todo este grupo es responsabilidad directa del administrador bajo el
  // art. 20 de la Ley 21.442. Un extintor vencido no es un detalle: es la
  // multa y, si hay incendio, la responsabilidad civil.
  ['Olor_gas', 'Olor a gas', 'Gas e Incendios', 'Alta', 'Conserjería', { avisoSeguridad: true, legal: true }],
  ['Medidor_gas', 'Medidor o instalación de gas con falla', 'Gas e Incendios', 'Alta', 'Proveedor Externo', { legal: true }],
  ['Extintor', 'Extintor vencido, faltante o descargado', 'Gas e Incendios', 'Alta', 'Administración', { legal: true }],
  ['Red_humeda', 'Red húmeda o seca sin presión o dañada', 'Gas e Incendios', 'Alta', 'Proveedor Externo', { legal: true }],
  ['Deteccion_humo', 'Detector de humo o alarma de incendio con falla', 'Gas e Incendios', 'Alta', 'Proveedor Externo', { legal: true }],
  ['Senaletica_evacuacion', 'Señalética de evacuación faltante o ilegible', 'Gas e Incendios', 'Media', 'Administración', { legal: true }],
  ['Via_evacuacion_bloqueada', 'Vía de evacuación o escalera bloqueada', 'Gas e Incendios', 'Alta', 'Conserjería', { legal: true }],
  ['Plan_emergencia', 'Plan de emergencia desactualizado o no publicado', 'Gas e Incendios', 'Media', 'Administración', { legal: true }],

  // ── Aseo, basura y áreas verdes ───────────────────────────────────────
  ['Sala_basura', 'Sala de basura sucia, llena o con mal olor', 'Aseo y Áreas Verdes', 'Media', 'Aseo y Áreas Verdes'],
  ['Basura_fuera_horario', 'Basura dejada fuera del horario o del lugar', 'Aseo y Áreas Verdes', 'Baja', 'Convivencia y Reglamento'],
  ['Reciclaje', 'Punto de reciclaje saturado o mal usado', 'Aseo y Áreas Verdes', 'Baja', 'Aseo y Áreas Verdes'],
  ['Plaga', 'Plaga de roedores, insectos o palomas', 'Aseo y Áreas Verdes', 'Alta', 'Proveedor Externo'],
  ['Aseo_espacio_comun', 'Pasillo, hall o escalera sin aseo', 'Aseo y Áreas Verdes', 'Baja', 'Aseo y Áreas Verdes'],
  ['Jardin_descuidado', 'Jardín sin mantención o pasto alto', 'Aseo y Áreas Verdes', 'Baja', 'Aseo y Áreas Verdes'],
  ['Riego_comun', 'Riego roto, sin agua o desperdiciando', 'Aseo y Áreas Verdes', 'Media', 'Aseo y Áreas Verdes'],
  ['Piscina', 'Piscina sucia, sin cloro o sin salvavidas', 'Aseo y Áreas Verdes', 'Alta', 'Administración', { legal: true }],
  ['Mal_olor_comun', 'Mal olor persistente en espacio común', 'Aseo y Áreas Verdes', 'Media', 'Aseo y Áreas Verdes'],

  // ── Convivencia y estacionamientos (Reglamento de Copropiedad) ───────────────────────────
  // Estas NO son "mantención": son infracciones al reglamento. Terminan en
  // amonestación o multa en UTM, y para eso el comité necesita el registro
  // con fecha, hora y evidencia que hoy nadie lleva bien.
  ['Ruidos_molestos', 'Ruidos molestos (música, fiesta, gritos)', 'Convivencia y Estacionamientos', 'Media', 'Convivencia y Reglamento'],
  ['Ruido_obra_depto', 'Obras o herramientas fuera de horario', 'Convivencia y Estacionamientos', 'Media', 'Convivencia y Reglamento'],
  ['Mascota_suelta', 'Mascota suelta en espacios comunes', 'Convivencia y Estacionamientos', 'Media', 'Convivencia y Reglamento'],
  ['Mascota_ruido', 'Ladridos o maullidos reiterados', 'Convivencia y Estacionamientos', 'Baja', 'Convivencia y Reglamento'],
  ['Fecas_mascota', 'Fecas de mascota no recogidas', 'Convivencia y Estacionamientos', 'Baja', 'Convivencia y Reglamento'],
  ['Humo_molesto', 'Humo de cigarro o parrilla que entra a otra unidad', 'Convivencia y Estacionamientos', 'Baja', 'Convivencia y Reglamento'],
  ['Uso_indebido_comun', 'Uso indebido de un espacio común', 'Convivencia y Estacionamientos', 'Media', 'Convivencia y Reglamento'],
  ['Objetos_balcon', 'Objetos, ropa o antenas en balcón o fachada', 'Convivencia y Estacionamientos', 'Baja', 'Convivencia y Reglamento'],
  ['Mudanza_sin_aviso', 'Mudanza o ingreso de carga sin aviso', 'Convivencia y Estacionamientos', 'Baja', 'Conserjería'],
  ['Arriendo_corto_plazo', 'Arriendo por día sin autorización', 'Convivencia y Estacionamientos', 'Media', 'Administración'],
  ['Danio_bien_comun', 'Daño a un bien común', 'Convivencia y Estacionamientos', 'Media', 'Convivencia y Reglamento'],

  // ── Vehículos (mismo grupo que Convivencia) ──────────────────────────────────────
  ['Estacionamiento_ocupado', 'Estacionamiento ocupado por otro vehículo', 'Convivencia y Estacionamientos', 'Media', 'Conserjería'],
  ['Vehiculo_mal_estacionado', 'Vehículo obstruyendo paso o salida', 'Convivencia y Estacionamientos', 'Alta', 'Conserjería'],
  ['Vehiculo_abandonado', 'Vehículo abandonado en el condominio', 'Convivencia y Estacionamientos', 'Baja', 'Administración'],
  ['Bicicletero', 'Bicicletero dañado, lleno o inseguro', 'Convivencia y Estacionamientos', 'Baja', 'Mantención y Obras'],
  ['Carga_electrica', 'Cargador de auto eléctrico con falla o mal uso', 'Convivencia y Estacionamientos', 'Media', 'Mantención y Obras'],
  ['Demarcacion', 'Demarcación de estacionamientos borrada', 'Convivencia y Estacionamientos', 'Baja', 'Mantención y Obras'],

  // ── Amenidades (mismo grupo que Estructura) ─────────────────────────────────────
  ['Quincho', 'Quincho dañado, sucio o con problemas de reserva', 'Estructura y Espacios Comunes', 'Baja', 'Administración'],
  ['Sala_multiuso', 'Sala multiuso con daño o mal uso', 'Estructura y Espacios Comunes', 'Baja', 'Administración'],
  ['Gimnasio', 'Máquina de gimnasio dañada', 'Estructura y Espacios Comunes', 'Media', 'Mantención y Obras'],
  ['Juegos_infantiles', 'Juegos infantiles dañados o inseguros', 'Estructura y Espacios Comunes', 'Alta', 'Mantención y Obras'],
  ['Lavanderia', 'Lavadora o secadora comunitaria con falla', 'Estructura y Espacios Comunes', 'Baja', 'Proveedor Externo'],
  ['Sala_encomiendas', 'Encomienda extraviada o sala desordenada', 'Estructura y Espacios Comunes', 'Baja', 'Conserjería'],
  ['Mobiliario_comun', 'Mobiliario común dañado', 'Estructura y Espacios Comunes', 'Baja', 'Mantención y Obras'],
  ['Reserva_espacio', 'Problema con una reserva de espacio común', 'Estructura y Espacios Comunes', 'Baja', 'Administración'],

  // ── Seguridad ─────────────────────────────────────────────────────────
  ['Intento_robo', 'Robo o intento de robo en el condominio', 'Seguridad', 'Alta', 'Seguridad', { avisoSeguridad: true }],
  ['Persona_no_autorizada', 'Persona no autorizada dentro del condominio', 'Seguridad', 'Alta', 'Conserjería', { avisoSeguridad: true }],
  ['Vandalismo', 'Rayado o vandalismo en bien común', 'Seguridad', 'Media', 'Seguridad'],
  ['Reja_perimetral', 'Reja o cierre perimetral vulnerado', 'Seguridad', 'Alta', 'Seguridad'],
  ['Turno_conserjeria', 'Conserjería sin cubrir o turno abandonado', 'Seguridad', 'Alta', 'Administración'],
  ['Emergencia_medica', 'Emergencia médica en espacio común', 'Seguridad', 'Alta', 'Conserjería', { avisoSeguridad: true }],

  // ── Estructura y obras ────────────────────────────────────────────────
  ['Grieta_estructural', 'Grieta en muro, losa o pilar', 'Estructura y Espacios Comunes', 'Alta', 'Mantención y Obras'],
  ['Impermeabilizacion', 'Impermeabilización vencida o dañada', 'Estructura y Espacios Comunes', 'Media', 'Mantención y Obras'],
  ['Pintura_fachada', 'Pintura o revestimiento de fachada deteriorado', 'Estructura y Espacios Comunes', 'Baja', 'Mantención y Obras'],
  ['Pavimento_interior', 'Pavimento o vereda interior en mal estado', 'Estructura y Espacios Comunes', 'Media', 'Mantención y Obras'],
  ['Baranda_danada', 'Baranda o pasamanos suelto', 'Estructura y Espacios Comunes', 'Alta', 'Mantención y Obras'],
  ['Ventana_comun', 'Ventana o vidrio común quebrado', 'Estructura y Espacios Comunes', 'Media', 'Mantención y Obras'],

  // ── Administración y gastos comunes ───────────────────────────────────
  // El motivo de contacto más frecuente con la administración, y el que hoy
  // llega por WhatsApp personal a las 23:00 sin quedar registrado en ningún
  // lado. Entra por acá para que tenga folio, plazo y respuesta trazable.
  ['Consulta_gasto_comun', 'Consulta o error en el gasto común', 'Administración y Cuentas', 'Media', 'Administración'],
  ['Certificado_deuda', 'Certificado de deuda o de no deuda', 'Administración y Cuentas', 'Baja', 'Administración'],
  ['Solicitud_documento', 'Solicitud de acta, reglamento o rendición', 'Administración y Cuentas', 'Baja', 'Administración'],
  ['Reclamo_administracion', 'Reclamo formal a la administración', 'Administración y Cuentas', 'Media', 'Administración'],
  ['Sugerencia', 'Sugerencia o propuesta a la comunidad', 'Administración y Cuentas', 'Baja', 'Administración'],
  ['Otro', 'Otro', 'Administración y Cuentas', 'Media', 'Administración'],
]

export const CATEGORIAS = CATALOGO.map(([valor, etiqueta, grupo, gravedad, area, extra = {}]) => ({
  valor,
  etiqueta,
  grupo,
  gravedad,
  area,
  ...extra,
}))

export const GRAVEDAD_POR_CATEGORIA = Object.fromEntries(
  CATEGORIAS.map((c) => [c.valor, c.gravedad]),
)

export const AREA_POR_CATEGORIA = Object.fromEntries(
  CATEGORIAS.map((c) => [c.valor, c.area]),
)

// Categorías que además marcan una obligación de la Ley 21.442: el panel del
// administrador las separa del resto porque su atraso no es un reclamo de un
// residente, es una infracción con multa.
export const CATEGORIAS_LEGALES = CATEGORIAS.filter((c) => c.legal).map((c) => c.valor)

// Mapa valor -> objeto completo. Lo usa todo panel que necesite mostrar la
// categoría legible en vez del valor interno crudo ("Ascensor_detenido").
export const CATEGORIA_POR_VALOR = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c]))

export function etiquetaCategoria(valor) {
  return CATEGORIA_POR_VALOR[valor]?.etiqueta || valor
}

// Agrupa el catálogo plano por "grupo" preservando el orden de aparición — lo
// usan el selector del residente y los filtros de los paneles.
export function agruparCategorias(categorias = CATEGORIAS) {
  const grupos = []
  const indicePorGrupo = new Map()

  for (const cat of categorias) {
    if (!indicePorGrupo.has(cat.grupo)) {
      indicePorGrupo.set(cat.grupo, grupos.length)
      grupos.push({ nombre: cat.grupo, items: [] })
    }
    grupos[indicePorGrupo.get(cat.grupo)].items.push(cat)
  }

  return grupos
}
