// Etiquetas legibles de las 58 categorías, duplicadas a propósito desde
// src/utils/categorias.js: este servicio vive en su propio paquete para Render y
// no comparte node_modules ni imports con el proyecto principal. Si agregas una
// categoría nueva allá, agrégala acá también (si falta, se muestra el slug con
// espacios en vez de la etiqueta — degrada bien, no rompe nada).

const ETIQUETA_POR_CATEGORIA = {
  Bache: 'Bache en la vía',
  Semaforo: 'Semáforo con falla',
  Semaforo_peatonal: 'Semáforo peatonal con falla',
  Senaletica_vial: 'Señalética vial dañada o faltante',
  Pavimento_deteriorado: 'Pavimento deteriorado o agrietado',
  Socavon: 'Socavón / hundimiento de calzada',
  Vereda_danada: 'Vereda en mal estado',
  Rampa_accesibilidad: 'Rampa de accesibilidad dañada o faltante',
  Ciclovia_danada: 'Ciclovía dañada u obstruida',
  Estacionamiento_irregular: 'Estacionamiento irregular',
  Anegamiento: 'Anegamiento / calle inundada',
  Baranda_danada: 'Baranda o barrera de contención dañada',
  Luminaria: 'Luminaria pública apagada',
  Luminaria_parpadea: 'Luminaria parpadeando',
  Poste_danado: 'Poste de luz dañado o caído',
  Cableado_expuesto: 'Cableado eléctrico expuesto',
  Basural: 'Basural / microbasural',
  Escombros: 'Acumulación de escombros',
  Contenedor_danado: 'Contenedor de basura dañado o desbordado',
  Falta_recoleccion: 'Falta de recolección de basura',
  Punto_limpio: 'Punto limpio saturado o dañado',
  Grafiti: 'Grafiti / rayado en espacio público',
  Mal_olor: 'Mal olor persistente',
  Falta_basureros: 'Falta de basureros públicos',
  Arbol_caido: 'Árbol caído o en riesgo',
  Poda_necesaria: 'Poda de árboles necesaria',
  Plaza_mal_estado: 'Plaza o parque en mal estado',
  Juegos_infantiles: 'Juegos infantiles dañados',
  Riego_deficiente: 'Riego de áreas verdes deficiente',
  Ruido_ambiental: 'Contaminación acústica / ruidos molestos',
  Quema_ilegal: 'Quema ilegal de basura o pastizales',
  Pasto_alto: 'Pasto sin cortar en áreas verdes',
  Filtracion_agua: 'Filtración de agua potable',
  Alcantarillado: 'Alcantarillado tapado o rebalsado',
  Fuga_gas: 'Fuga de gas',
  Corte_agua: 'Corte de agua no informado',
  Grifo_danado: 'Grifo o llave pública dañada',
  Sitio_eriazo: 'Sitio eriazo o propiedad abandonada en mal estado',
  Construccion_irregular: 'Construcción irregular o sin permiso',
  Muro_riesgo: 'Muro o cierre perimetral en riesgo de derrumbe',
  Estructura_danada: 'Techumbre o estructura dañada en espacio público',
  Patente_irregular: 'Local comercial funcionando sin patente',
  Falta_vigilancia: 'Falta de vigilancia / cámara dañada',
  Animal_abandonado: 'Perro o animal abandonado / en riesgo',
  Plaga: 'Plaga de roedores o insectos',
  Foco_delincuencia: 'Foco de delincuencia reportado',
  Robo_hurto_frecuente: 'Robos o hurtos frecuentes en el sector',
  Consumo_via_publica: 'Consumo de alcohol/drogas en vía pública',
  Comercio_ambulante: 'Comercio ambulante irregular',
  Vehiculo_abandonado: 'Vehículo abandonado en la vía pública',
  Excremento_mascotas: 'Excremento de mascotas no recogido',
  Mobiliario_danado: 'Banca o mobiliario urbano dañado',
  Paradero_danado: 'Paradero de locomoción dañado',
  Bano_publico: 'Baño público en mal estado',
  Feria_desorden: 'Desorden en feria libre / vía pública',
  Ruido_local_comercial: 'Ruido molesto de local comercial',
  Publicidad_ilegal: 'Publicidad ilegal (pasacalles, carteles)',
  Otro: 'Otro',
}

function etiquetaCategoria(slug) {
  return ETIQUETA_POR_CATEGORIA[slug] || (slug || '').replace(/_/g, ' ')
}

module.exports = { ETIQUETA_POR_CATEGORIA, etiquetaCategoria }
