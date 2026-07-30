// Triage automático: clasifica la gravedad de una incidencia según su categoría,
// al momento en que el ciudadano envía el formulario. Criterio usado:
//   Alta  -> riesgo inminente a la seguridad (caídas, electrocución, accidentes de tránsito)
//   Media -> requiere atención pero sin peligro inmediato (fallas de servicio, acumulación)
//   Baja  -> estético o ambiental, sin riesgo de seguridad
// Paleta de "status" validada (skill de dataviz: crítico/advertencia/bueno) — fija,
// no se tematiza por municipalidad. El amarillo de "warning" tiene bajo contraste
// contra superficies claras por diseño: nunca debe ser el único portador del
// significado, siempre acompañado de ícono/etiqueta (ya se cumple: BadgeGravedad
// siempre muestra el texto "Gravedad X", nunca solo el color).
export const COLOR_POR_GRAVEDAD = {
  Alta: '#d03b3b', // critical
  Media: '#fab219', // warning
  Baja: '#0ca30c', // good
}

// Orden de prioridad para ordenar listas (menor número = más urgente).
export const ORDEN_GRAVEDAD = { Alta: 0, Media: 1, Baja: 2 }

const GRAVEDAD_POR_CATEGORIA = {
  // Alta — riesgo inminente a la seguridad
  Bache: 'Alta',
  Semaforo: 'Alta',
  Semaforo_peatonal: 'Alta',
  Socavon: 'Alta',
  Luminaria: 'Alta',
  Poste_danado: 'Alta',
  Cableado_expuesto: 'Alta',
  Arbol_caido: 'Alta',
  Muro_riesgo: 'Alta',
  Estructura_danada: 'Alta',
  Fuga_gas: 'Alta',
  Alcantarillado: 'Alta',
  Quema_ilegal: 'Alta',
  Juegos_infantiles: 'Alta',
  Foco_delincuencia: 'Alta',
  Robo_hurto_frecuente: 'Alta',
  Anegamiento: 'Alta',

  // Media — requieren atención, sin peligro inminente
  Senaletica_vial: 'Media',
  Pavimento_deteriorado: 'Media',
  Vereda_danada: 'Media',
  Rampa_accesibilidad: 'Media',
  Ciclovia_danada: 'Media',
  Luminaria_parpadea: 'Media',
  Basural: 'Media',
  Escombros: 'Media',
  Falta_recoleccion: 'Media',
  Mal_olor: 'Media',
  Filtracion_agua: 'Media',
  Corte_agua: 'Media',
  Construccion_irregular: 'Media',
  Animal_abandonado: 'Media',
  Plaga: 'Media',
  Paradero_danado: 'Media',
  Baranda_danada: 'Media',
  Patente_irregular: 'Media',
  Vehiculo_abandonado: 'Media',
  Otro: 'Media',

  // Baja — estético / ambiental
  Estacionamiento_irregular: 'Baja',
  Contenedor_danado: 'Baja',
  Punto_limpio: 'Baja',
  Grafiti: 'Baja',
  Poda_necesaria: 'Baja',
  Plaza_mal_estado: 'Baja',
  Riego_deficiente: 'Baja',
  Ruido_ambiental: 'Baja',
  Grifo_danado: 'Baja',
  Sitio_eriazo: 'Baja',
  Falta_vigilancia: 'Baja',
  Consumo_via_publica: 'Baja',
  Comercio_ambulante: 'Baja',
  Mobiliario_danado: 'Baja',
  Bano_publico: 'Baja',
  Feria_desorden: 'Baja',
  Ruido_local_comercial: 'Baja',
  Publicidad_ilegal: 'Baja',
  Falta_basureros: 'Baja',
  Pasto_alto: 'Baja',
  Excremento_mascotas: 'Baja',
}

const GRAVEDAD_POR_DEFECTO = 'Media'

// Devuelve { nivel_gravedad, color_pin } para una categoría dada. Si la categoría
// no está en el mapa (no debería pasar, pero por si se agrega una nueva y se olvida
// clasificarla), cae a "Media" en vez de asumir que no es urgente.
export function calcularGravedad(categoriaValor) {
  const nivel = GRAVEDAD_POR_CATEGORIA[categoriaValor] || GRAVEDAD_POR_DEFECTO
  return { nivel_gravedad: nivel, color_pin: COLOR_POR_GRAVEDAD[nivel] }
}
