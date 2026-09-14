/**
 * Cliente de la API REST de ClickBank v1.3 para Node 18+ (fetch nativo, cero dependencias).
 *
 * Resuelve throttling, paginación por header `Page`, el 403 ambiguo, los errores
 * en texto plano, los campos *nillable* y los arrays que llegan como objeto.
 *
 *   import { ClickBank } from './clickbank.mjs';
 *   const cb = new ClickBank({ apiKey: process.env.CLICKBANK_API_KEY });
 *   console.log(await cb.debug.context());
 *   for await (const row of cb.quickstats.list({ start: '2026-08-01', end: '2026-08-31' })) { ... }
 */

const BASE_URL = 'https://api.clickbank.com';
const API_VERSION = '1.3';

// --------------------------------------------------------------------------- //
// Errores
// --------------------------------------------------------------------------- //
export class ClickBankError extends Error {
  constructor(status, body, url) {
    super(`HTTP ${status} en ${url}: ${String(body).slice(0, 300)}`);
    this.name = 'ClickBankError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}
export class ClickBankAuthError extends ClickBankError { name = 'ClickBankAuthError'; }
export class ClickBankRateLimitError extends ClickBankError { name = 'ClickBankRateLimitError'; }

// --------------------------------------------------------------------------- //
// Normalización
// --------------------------------------------------------------------------- //
/** Los *nillable* de ClickBank (herencia XML) se vuelven `null`. */
export function denil(value) {
  if (Array.isArray(value)) return value.map(denil);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return null;
    if (keys.every((k) => k === 'nil' || k === '@nil' || k === 'xsi:nil')) return null;
    return Object.fromEntries(keys.map((k) => [k, denil(value[k])]));
  }
  return value;
}

/** Un array de ClickBank puede llegar como objeto único o ausente. */
export function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Importes: llegan como string a veces. Devuelve céntimos enteros para evitar float. */
export function toCents(value) {
  if (value == null || typeof value === 'object') return 0;
  return Math.round(Number(value) * 100);
}

const WRAPPERS = ['orderData', 'quickStatsData', 'productData', 'ticketData',
  'orderShipData', 'shippingNoticeData', 'imageData', 'row', 'rows'];

function extractRows(payload) {
  if (payload == null || payload === '') return [];
  let node = payload;
  if (!Array.isArray(node) && typeof node === 'object') {
    for (const key of WRAPPERS) {
      if (key in node) return extractRows(node[key]);
    }
  }
  return asArray(node).filter((r) => r && typeof r === 'object');
}

// --------------------------------------------------------------------------- //
// Throttling
// --------------------------------------------------------------------------- //
class RateLimiter {
  #minInterval;
  #chain = Promise.resolve();
  #nextAt = 0;

  constructor(ratePerSecond) { this.#minInterval = 1000 / ratePerSecond; }

  acquire() {
    this.#chain = this.#chain.then(async () => {
      const wait = this.#nextAt - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.#nextAt = Date.now() + this.#minInterval;
    });
    return this.#chain;
  }
}

// --------------------------------------------------------------------------- //
// Transporte
// --------------------------------------------------------------------------- //
class Transport {
  constructor({ apiKey, baseUrl = BASE_URL, timeout = 30_000,
                ratePerSecond = 8, maxRetries = 4,
                userAgent = 'clickbank-skill/1.0' } = {}) {
    if (!apiKey) {
      throw new Error('Falta la API key. Define CLICKBANK_API_KEY o pasa { apiKey }. ' +
                      'Formato legado admitido: "DEV_KEY:CLERK_KEY".');
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.userAgent = userAgent;
    this.limiter = new RateLimiter(ratePerSecond);
  }

  async request(method, path, params = {}, page = null) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;

    const headers = {
      Authorization: this.apiKey,
      Accept: 'application/json',
      'User-Agent': this.userAgent,
    };
    if (page && page > 1) headers.Page = String(page);

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this.limiter.acquire();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      try {
        const resp = await fetch(url, { method, headers, signal: controller.signal });
        const raw = await resp.text();

        if (resp.status === 403) throw classify403(raw, url);
        if (!resp.ok) {
          if ([429, 500, 502, 503, 504].includes(resp.status) && attempt < this.maxRetries) {
            await sleep(2 ** (attempt + 1) * 1000);
            continue;
          }
          throw new ClickBankError(resp.status, raw, url);
        }
        return { status: resp.status, payload: parseBody(raw) };
      } catch (err) {
        if (err instanceof ClickBankError) throw err;
        if (attempt < this.maxRetries) { await sleep(2 ** (attempt + 1) * 1000); continue; }
        throw new ClickBankError(0, `Error de red: ${err.message}`, url);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new ClickBankError(0, 'Agotados los reintentos', url);
  }

  /**
   * Itera todas las páginas. Corta cuando el status deja de ser 206 —
   * NO por "llegaron menos de 100 filas": la API puede devolver menos y tener más.
   */
  async *paginate(path, params = {}, maxPages = 500) {
    for (let page = 1; page <= maxPages; page += 1) {
      const { status, payload } = await this.request('GET', path, params, page);
      yield* extractRows(payload);
      if (status !== 206) return;
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseBody(raw) {
  const text = raw.trim();
  if (!text) return '';
  try { return denil(JSON.parse(text)); } catch { return text; }
}

function classify403(body, url) {
  const lowered = String(body).toLowerCase();
  const isQuota = ['limit', 'exceed', 'throttl', 'quota'].some((w) => lowered.includes(w));
  return isQuota
    ? new ClickBankRateLimitError(403, body, url)
    : new ClickBankAuthError(403, body, url);
}

const enc = encodeURIComponent;

// --------------------------------------------------------------------------- //
// Recursos
// --------------------------------------------------------------------------- //
class Resource { constructor(t) { this.t = t; } }

class DebugAPI extends Resource {
  /** Primer diagnóstico ante cualquier 403. */
  async context() { return (await this.t.request('GET', `/rest/${API_VERSION}/debug`)).payload; }
}

class QuickstatsAPI extends Resource {
  async accounts() {
    const { payload } = await this.t.request('GET', `/rest/${API_VERSION}/quickstats/accounts`);
    return extractRows(payload);
  }
  /** Un registro por día. Sin filtros: últimos 45 días. */
  list({ start, end, account, ...extra } = {}) {
    return this.t.paginate(`/rest/${API_VERSION}/quickstats/list`,
      { startDate: start, endDate: end, account, ...extra });
  }
  /** Totales sumados del rango. */
  async count({ start, end, account, ...extra } = {}) {
    return (await this.t.request('GET', `/rest/${API_VERSION}/quickstats/count`,
      { startDate: start, endDate: end, account, ...extra })).payload;
  }
}

class OrdersAPI extends Resource {
  base = `/rest/${API_VERSION}/orders2`;

  list({ start, end, account, ...extra } = {}) {
    return this.t.paginate(`${this.base}/list`,
      { startDate: start, endDate: end, account, ...extra });
  }
  async count({ start, end, ...extra } = {}) {
    return (await this.t.request('GET', `${this.base}/count`,
      { startDate: start, endDate: end, ...extra })).payload;
  }
  async get(receipt) {
    return (await this.t.request('GET', `${this.base}/${enc(receipt)}`)).payload;
  }
  /** 204 = suscripción activa; 403 = reembolsada, cancelada, inexistente o sin acceso. */
  async isActive(receipt) {
    try {
      const { status } = await this.t.request('HEAD', `${this.base}/${enc(receipt)}`);
      return status === 204;
    } catch (err) {
      if (err instanceof ClickBankAuthError) return false;
      throw err;
    }
  }
  async upsells(receipt) {
    return (await this.t.request('GET', `${this.base}/${enc(receipt)}/upsells`)).payload;
  }

  // --- escritura: irreversible, exige idempotencia del lado del llamador ---
  pause(receipt, params = {}) { return this.#post(receipt, 'pause', params); }
  reinstate(receipt, params = {}) { return this.#post(receipt, 'reinstate', params); }
  extend(receipt, params = {}) { return this.#post(receipt, 'extend', params); }
  changeProduct(receipt, params = {}) { return this.#post(receipt, 'changeProduct', params); }
  changeDate(receipt, params = {}) { return this.#post(receipt, 'changeDate', params); }
  changeAddress(receipt, params = {}) { return this.#post(receipt, 'changeAddress', params); }

  async #post(receipt, action, params) {
    return (await this.t.request('POST', `${this.base}/${enc(receipt)}/${action}`, params)).payload;
  }
}

class AnalyticsAPI extends Resource {
  base = `/rest/${API_VERSION}/analytics`;

  /** Última consolidación: consúltalo antes de reportar el día en curso. */
  async status() { return (await this.t.request('GET', `${this.base}/status`)).payload; }

  /** dimension: AFFILIATE | PRODUCT_SKU | TRACKING_ID | CUSTOMER_COUNTRY | ... */
  dimension({ role = 'VENDOR', dimension, start, end, account, ...extra }) {
    return this.t.paginate(`${this.base}/${role}/${dimension}`,
      { startDate: start, endDate: end, account, ...extra });
  }
  async dimensionSummary({ role = 'VENDOR', dimension, start, end, ...extra }) {
    return (await this.t.request('GET', `${this.base}/${role}/${dimension}/summary`,
      { startDate: start, endDate: end, ...extra })).payload;
  }
  /** bucket: compthirty|compsixty|cancelthirty|cancelsixty|startdate|canceldate|nextpmtdate|status */
  subscriptionDetails({ role = 'VENDOR', bucket, ...params } = {}) {
    const path = `${this.base}/${role}/subscription/details${bucket ? `/${bucket}` : ''}`;
    return this.t.paginate(path, params);
  }
  async subscriptionTrends({ role = 'VENDOR', ...params } = {}) {
    return (await this.t.request('GET', `${this.base}/${role}/subscription/trends`, params)).payload;
  }
}

class ProductsAPI extends Resource {
  base = `/rest/${API_VERSION}/products`;
  list(params = {}) { return this.t.paginate(`${this.base}/list`, params); }
  async get(sku, params = {}) {
    return (await this.t.request('GET', `${this.base}/${enc(sku)}`, params)).payload;
  }
  /** PUT crea o actualiza. Los parámetros van por query string, no en el cuerpo. */
  async save(sku, params = {}) {
    return (await this.t.request('PUT', `${this.base}/${enc(sku)}`, params)).payload;
  }
  async remove(sku, params = {}) {
    return (await this.t.request('DELETE', `${this.base}/${enc(sku)}`, params)).payload;
  }
}

class ShippingAPI extends Resource {
  constructor(t, version = 'shipping3') { super(t); this.base = `/rest/${API_VERSION}/${version}`; }
  /** status: shipped | notshipped | all */
  list({ status, ...params } = {}) {
    return this.t.paginate(`${this.base}/list`, { shippingStatus: status, ...params });
  }
  async count(params = {}) {
    return (await this.t.request('GET', `${this.base}/count`, params)).payload;
  }
  async shipNotices(receipt) {
    return (await this.t.request('GET', `${this.base}/shipnotice/${enc(receipt)}`)).payload;
  }
  /**
   * Registra el envío. Irreversible: verifica idempotencia por receipt antes.
   * params: { date: 'yyyy-mm-dd', carrier, tracking, comments, item, fillOrder }
   * `item` (sku/itemNo) es obligatorio si la orden trae varios ítems físicos.
   */
  async createShipNotice(receipt, params = {}) {
    return (await this.t.request('POST', `${this.base}/shipnotice/${enc(receipt)}`, params)).payload;
  }
}

class TicketsAPI extends Resource {
  base = `/rest/${API_VERSION}/tickets`;
  list(params = {}) { return this.t.paginate(`${this.base}/list`, params); }
  async count(params = {}) {
    return (await this.t.request('GET', `${this.base}/count`, params)).payload;
  }
  async get(id) { return (await this.t.request('GET', `${this.base}/${enc(id)}`)).payload; }
  /** Simula el reembolso antes de emitirlo. Obligatorio en parciales. */
  async refundAmounts(receipt, params = {}) {
    return (await this.t.request('GET', `${this.base}/refundAmounts/${enc(receipt)}`, params)).payload;
  }
  /**
   * type: rfnd | cncl | tech. DINERO REAL, no reversible.
   * rfnd sobre recurrente reembolsa Y cancela futuros cobros; cncl solo cancela.
   */
  async create(receipt, { type, reason, refundType, refundAmount,
                          comment, sku, retainSubscription } = {}) {
    return (await this.t.request('POST', `${this.base}/${enc(receipt)}`, {
      type, reason, refundType, refundAmount, comment, sku, retainSubscription,
    })).payload;
  }
  /** action: change | close | reopen. Cerrar un ticket de reembolso lo CANCELA. */
  async update(id, params = {}) {
    return (await this.t.request('PUT', `${this.base}/${enc(id)}`, params)).payload;
  }
  async acknowledgeReturn(id) {
    return (await this.t.request('POST', `${this.base}/${enc(id)}/returned`)).payload;
  }
}

class ImagesAPI extends Resource {
  list(params = {}) { return this.t.paginate(`/rest/${API_VERSION}/images/list`, params); }
}

// --------------------------------------------------------------------------- //
// Fachada
// --------------------------------------------------------------------------- //
export class ClickBank {
  constructor(options = {}) {
    const apiKey = options.apiKey ?? process.env.CLICKBANK_API_KEY;
    this.transport = new Transport({ ...options, apiKey });

    this.debug = new DebugAPI(this.transport);
    this.quickstats = new QuickstatsAPI(this.transport);
    this.orders = new OrdersAPI(this.transport);
    this.analytics = new AnalyticsAPI(this.transport);
    this.products = new ProductsAPI(this.transport);
    this.shipping = new ShippingAPI(this.transport);
    this.shipping2 = new ShippingAPI(this.transport, 'shipping2');
    this.tickets = new TicketsAPI(this.transport);
    this.images = new ImagesAPI(this.transport);
  }

  /** Escotilla de escape para endpoints no envueltos. */
  async raw(method, path, params = {}) {
    return (await this.transport.request(method, path, params)).payload;
  }
}

export default ClickBank;
