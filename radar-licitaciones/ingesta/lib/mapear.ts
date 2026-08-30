/**
 * Traducción de la respuesta de ChileCompra a las filas de nuestras tablas.
 *
 * Regla que ordena todo el archivo: **lo que no se entiende se guarda igual**.
 * Cada fila se lleva su `data_cruda` con la respuesta íntegra, así que un
 * campo que hoy no sabemos leer no se pierde — queda en el JSONB y se puede
 * promover a columna después, sin volver a pedirlo a la API.
 *
 * El corolario práctico: acá nunca se inventa un valor por omisión. Un monto
 * que no vino es `null`, no `0`; una fecha que no se pudo leer es `null`, no
 * la de hoy. Un cero inventado se ve idéntico a un dato real y arruina
 * cualquier filtro por monto.
 */

import { desdeHoraChilena } from './fechas.ts';

export interface FilaLicitacion {
  codigo_externo: string;
  nombre: string;
  codigo_estado: number | null;
  estado: string | null;
  tipo: string | null;
  fecha_cierre: string | null;
  descripcion?: string | null;
  codigo_organismo?: string | null;
  nombre_organismo?: string | null;
  region?: string | null;
  comuna?: string | null;
  monto_estimado?: number | null;
  moneda?: string;
  fecha_publicacion?: string | null;
  fecha_adjudicacion?: string | null;
  unspsc?: string[];
  items?: unknown;
  data_cruda: unknown;
  detalle_cargado: boolean;
}

export interface FilaComprador {
  codigo_organismo: string;
  nombre_organismo: string;
  region?: string | null;
  comuna?: string | null;
  data_cruda?: unknown;
}

/**
 * Monedas que devuelve la API. El mapeo importa más de lo que parece:
 * una licitación de 4.126 UF son ~155 millones de pesos, no 4.126 pesos.
 * Guardar el número sin la moneda hace que cualquier filtro por monto
 * mienta por un factor de ~39.000.
 */
const MONEDAS: Record<string, string> = {
  CLP: 'CLP', PESO: 'CLP', PESOCHILENO: 'CLP',
  CLF: 'CLF', UF: 'CLF', UNIDADDEFOMENTO: 'CLF',
  USD: 'USD', DOLAR: 'USD', DOLARESTADOUNIDENSE: 'USD',
  EUR: 'EUR', EURO: 'EUR',
  UTM: 'UTM', UTMANUAL: 'UTM', UTA: 'UTTAL', UTTAL: 'UTTAL',
};

function normalizarMoneda(valor: unknown): string {
  if (typeof valor !== 'string') return 'CLP';
  const clave = valor.toUpperCase().replace(/[^A-Z]/g, '');
  return MONEDAS[clave] ?? 'OTRA';
}

function aNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function aTexto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  return t === '' ? null : t;
}

/**
 * El sufijo del código dice el tipo de llamado: `1509-12-LE26` -> `LE`.
 * Es la señal más barata que existe de cuánta competencia grande atrae un
 * llamado, y no cuesta ni una petición extra.
 */
export function tipoDesdeCodigo(codigo: string): string | null {
  const m = codigo.match(/-([A-Z]\d|[A-Z]{2})\d{2}$/i);
  return m ? m[1].toUpperCase() : null;
}

/** Fase 1: la fila que sale del listado diario. Campos mínimos. */
export function desdeListado(item: any): FilaLicitacion | null {
  const codigo = aTexto(item?.CodigoExterno);
  const nombre = aTexto(item?.Nombre);
  if (!codigo || !nombre) return null;   // sin código no hay clave; se descarta

  return {
    codigo_externo: codigo,
    nombre,
    codigo_estado: aNumero(item?.CodigoEstado),
    estado: aTexto(item?.Estado),
    tipo: tipoDesdeCodigo(codigo),
    fecha_cierre: desdeHoraChilena(item?.FechaCierre),
    data_cruda: item,
    detalle_cargado: false,
  };
}

/** Fase 2: la ficha completa. Trae organismo, monto, ítems y códigos ONU. */
export function desdeFicha(ficha: any): { licitacion: FilaLicitacion; comprador: FilaComprador | null } | null {
  const l = Array.isArray(ficha?.Listado) ? ficha.Listado[0] : ficha;
  const codigo = aTexto(l?.CodigoExterno);
  const nombre = aTexto(l?.Nombre);
  if (!codigo || !nombre) return null;

  const comprador = l?.Comprador ?? {};
  const codigoOrganismo = aTexto(comprador?.CodigoOrganismo);
  const items: any[] = l?.Items?.Listado ?? [];

  // Los códigos ONU vienen dentro de cada ítem. Se suben a una columna
  // `text[]` propia para poder indexarlos con GIN: filtrar por rubro es la
  // consulta más frecuente del producto y no puede depender de recorrer JSON.
  const unspsc = [...new Set(
    items.map((it) => aTexto(it?.CodigoProducto ?? it?.CodigoCategoria)).filter((x): x is string => !!x),
  )];

  const fechas = l?.Fechas ?? {};

  return {
    licitacion: {
      codigo_externo: codigo,
      nombre,
      descripcion: aTexto(l?.Descripcion),
      codigo_estado: aNumero(l?.CodigoEstado),
      estado: aTexto(l?.Estado),
      tipo: aTexto(l?.Tipo) ?? tipoDesdeCodigo(codigo),
      codigo_organismo: codigoOrganismo,
      nombre_organismo: aTexto(comprador?.NombreOrganismo),
      region: aTexto(comprador?.RegionUnidad),
      comuna: aTexto(comprador?.ComunaUnidad),
      monto_estimado: aNumero(l?.MontoEstimado),
      moneda: normalizarMoneda(l?.Moneda),
      fecha_publicacion: desdeHoraChilena(fechas?.FechaPublicacion),
      fecha_cierre: desdeHoraChilena(fechas?.FechaCierre ?? l?.FechaCierre),
      fecha_adjudicacion: desdeHoraChilena(fechas?.FechaAdjudicacion),
      unspsc,
      items,
      data_cruda: l,
      detalle_cargado: true,
    },
    comprador: codigoOrganismo
      ? {
          codigo_organismo: codigoOrganismo,
          nombre_organismo: aTexto(comprador?.NombreOrganismo) ?? codigoOrganismo,
          region: aTexto(comprador?.RegionUnidad),
          comuna: aTexto(comprador?.ComunaUnidad),
          data_cruda: comprador,
        }
      : null,
  };
}
