// Derivación automática por departamento: al crear una incidencia, se asigna
// automáticamente qué unidad municipal le corresponde según la categoría (no
// hay input manual del ciudadano) — mismo mecanismo que el triage de gravedad
// en gravedad.js. Departamentos = direcciones habituales de una municipalidad
// chilena (Ley 18.695): Obras, Tránsito, Operaciones (alumbrado/servicios
// básicos), Aseo y Ornato, Medio Ambiente, Seguridad Ciudadana, y una bandeja
// de entrada genérica para lo que no calza en ninguna ("Otro").
export const DEPARTAMENTOS = [
  'Dirección de Obras (DOM)',
  'Tránsito',
  'Operaciones',
  'Aseo y Ornato',
  'Medio Ambiente',
  'Seguridad Ciudadana',
  'Oficina de Partes',
]

const DEPARTAMENTO_POR_CATEGORIA = {
  // Dirección de Obras (DOM) — vialidad, infraestructura, permisos de edificación
  Bache: 'Dirección de Obras (DOM)',
  Pavimento_deteriorado: 'Dirección de Obras (DOM)',
  Socavon: 'Dirección de Obras (DOM)',
  Vereda_danada: 'Dirección de Obras (DOM)',
  Rampa_accesibilidad: 'Dirección de Obras (DOM)',
  Ciclovia_danada: 'Dirección de Obras (DOM)',
  Baranda_danada: 'Dirección de Obras (DOM)',
  Sitio_eriazo: 'Dirección de Obras (DOM)',
  Construccion_irregular: 'Dirección de Obras (DOM)',
  Muro_riesgo: 'Dirección de Obras (DOM)',
  Estructura_danada: 'Dirección de Obras (DOM)',
  Mobiliario_danado: 'Dirección de Obras (DOM)',

  // Tránsito — señalización, semáforos, estacionamientos, paraderos
  Semaforo: 'Tránsito',
  Semaforo_peatonal: 'Tránsito',
  Senaletica_vial: 'Tránsito',
  Estacionamiento_irregular: 'Tránsito',
  Vehiculo_abandonado: 'Tránsito',
  Paradero_danado: 'Tránsito',

  // Operaciones — alumbrado público y servicios básicos (agua, gas, alcantarillado)
  Luminaria: 'Operaciones',
  Luminaria_parpadea: 'Operaciones',
  Poste_danado: 'Operaciones',
  Cableado_expuesto: 'Operaciones',
  Anegamiento: 'Operaciones',
  Filtracion_agua: 'Operaciones',
  Alcantarillado: 'Operaciones',
  Fuga_gas: 'Operaciones',
  Corte_agua: 'Operaciones',
  Grifo_danado: 'Operaciones',

  // Aseo y Ornato — limpieza, recolección de basura
  Basural: 'Aseo y Ornato',
  Escombros: 'Aseo y Ornato',
  Contenedor_danado: 'Aseo y Ornato',
  Falta_recoleccion: 'Aseo y Ornato',
  Punto_limpio: 'Aseo y Ornato',
  Grafiti: 'Aseo y Ornato',
  Mal_olor: 'Aseo y Ornato',
  Falta_basureros: 'Aseo y Ornato',
  Excremento_mascotas: 'Aseo y Ornato',
  Bano_publico: 'Aseo y Ornato',

  // Medio Ambiente — áreas verdes, fauna, ruido ambiental
  Arbol_caido: 'Medio Ambiente',
  Poda_necesaria: 'Medio Ambiente',
  Plaza_mal_estado: 'Medio Ambiente',
  Juegos_infantiles: 'Medio Ambiente',
  Riego_deficiente: 'Medio Ambiente',
  Ruido_ambiental: 'Medio Ambiente',
  Quema_ilegal: 'Medio Ambiente',
  Pasto_alto: 'Medio Ambiente',
  Animal_abandonado: 'Medio Ambiente',
  Plaga: 'Medio Ambiente',

  // Seguridad Ciudadana — convivencia, fiscalización de comercio, delitos
  Patente_irregular: 'Seguridad Ciudadana',
  Falta_vigilancia: 'Seguridad Ciudadana',
  Foco_delincuencia: 'Seguridad Ciudadana',
  Robo_hurto_frecuente: 'Seguridad Ciudadana',
  Consumo_via_publica: 'Seguridad Ciudadana',
  Comercio_ambulante: 'Seguridad Ciudadana',
  Feria_desorden: 'Seguridad Ciudadana',
  Ruido_local_comercial: 'Seguridad Ciudadana',
  Publicidad_ilegal: 'Seguridad Ciudadana',

  // Oficina de Partes — bandeja genérica para lo que no tiene un destino obvio
  Otro: 'Oficina de Partes',
}

const DEPARTAMENTO_POR_DEFECTO = 'Oficina de Partes'

// Devuelve el departamento municipal que le corresponde a una categoría. Si la
// categoría no está en el mapa (no debería pasar, pero por si se agrega una
// nueva y se olvida clasificarla), cae a "Oficina de Partes" en vez de fallar.
export function calcularDepartamento(categoriaValor) {
  return DEPARTAMENTO_POR_CATEGORIA[categoriaValor] || DEPARTAMENTO_POR_DEFECTO
}
