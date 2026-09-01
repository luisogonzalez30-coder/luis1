"""Cliente de la API REST de ClickBank v1.3.

Sin dependencias externas (solo stdlib). Resuelve de fábrica lo que la API
rompe si no se trata: throttling, paginación por header `Page`, `403` ambiguo,
errores en texto plano, campos *nillable* y arrays que llegan como objeto.

Uso:
    export CLICKBANK_API_KEY="..."          # o "DEV_KEY:CLERK_KEY" (legado)
    from clickbank import ClickBank
    cb = ClickBank()
    print(cb.debug.context())
    for row in cb.quickstats.list(start="2026-08-01", end="2026-08-31"):
        ...

CLI:
    python clickbank.py debug
    python clickbank.py quickstats --start 2026-08-01 --end 2026-08-31
    python clickbank.py orders --start 2026-08-01 --end 2026-08-31 --account minicuenta
    python clickbank.py analytics --role VENDOR --dimension AFFILIATE --start ... --end ...
"""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "ClickBank",
    "ClickBankConfig",
    "ClickBankError",
    "ClickBankAuthError",
    "ClickBankRateLimitError",
    "as_list",
    "as_decimal",
    "denil",
]

BASE_URL = "https://api.clickbank.com"
API_VERSION = "1.3"


# --------------------------------------------------------------------------- #
# Errores
# --------------------------------------------------------------------------- #
class ClickBankError(RuntimeError):
    """Error de la API. El cuerpo de ClickBank es texto plano, no JSON."""

    def __init__(self, status: int, body: str, url: str) -> None:
        super().__init__(f"HTTP {status} en {url}: {body[:300]}")
        self.status = status
        self.body = body
        self.url = url


class ClickBankAuthError(ClickBankError):
    """403 atribuible a permisos o recurso ajeno."""


class ClickBankRateLimitError(ClickBankError):
    """403 atribuible a cuota agotada (ClickBank no usa 429)."""


# --------------------------------------------------------------------------- #
# Normalización de respuestas
# --------------------------------------------------------------------------- #
def denil(value: Any) -> Any:
    """Convierte los *nillable* de ClickBank (herencia XML) en ``None``."""
    if isinstance(value, dict):
        if not value or set(value) <= {"nil", "@nil", "xsi:nil"}:
            return None
        return {k: denil(v) for k, v in value.items()}
    if isinstance(value, list):
        return [denil(v) for v in value]
    return value


def as_list(value: Any) -> list:
    """Un array de ClickBank puede llegar como objeto único o ausente."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def as_decimal(value: Any, default: str = "0") -> Decimal:
    """Importes: pueden venir como string. Nunca usar float con dinero."""
    if value is None or isinstance(value, dict):
        return Decimal(default)
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


# --------------------------------------------------------------------------- #
# Throttling
# --------------------------------------------------------------------------- #
class _RateLimiter:
    """Token bucket. ClickBank permite 10 req/s por IP; se deja margen."""

    def __init__(self, rate_per_second: float) -> None:
        self._min_interval = 1.0 / rate_per_second
        self._lock = threading.Lock()
        self._next_at = 0.0

    def acquire(self) -> None:
        with self._lock:
            now = time.monotonic()
            wait = self._next_at - now
            if wait > 0:
                time.sleep(wait)
                now = time.monotonic()
            self._next_at = now + self._min_interval


# --------------------------------------------------------------------------- #
# Configuración y transporte
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class ClickBankConfig:
    api_key: str = field(default_factory=lambda: os.environ.get("CLICKBANK_API_KEY", ""))
    base_url: str = BASE_URL
    timeout: float = 30.0
    rate_per_second: float = 8.0        # margen bajo el límite de 10/s por IP
    max_retries: int = 4                # backoff 2s, 4s, 8s, 16s
    user_agent: str = "clickbank-skill/1.0"

    def __post_init__(self) -> None:
        if not self.api_key:
            raise ValueError(
                "Falta la API key. Define CLICKBANK_API_KEY "
                "(o pasa ClickBankConfig(api_key=...)). "
                'Formato legado admitido: "DEV_KEY:CLERK_KEY".'
            )


class _Transport:
    """Petición HTTP + reintentos + clasificación de errores."""

    def __init__(self, config: ClickBankConfig) -> None:
        self._config = config
        self._limiter = _RateLimiter(config.rate_per_second)

    def request(
        self,
        method: str,
        path: str,
        params: Mapping[str, Any] | None = None,
        page: int | None = None,
    ) -> tuple[int, Any]:
        """Devuelve ``(status, payload)``. ``payload`` es dict/list o str vacío."""
        query = _encode_params(params or {})
        url = f"{self._config.base_url}{path}" + (f"?{query}" if query else "")

        headers: MutableMapping[str, str] = {
            "Authorization": self._config.api_key,
            "Accept": "application/json",
            "User-Agent": self._config.user_agent,
        }
        if page and page > 1:
            headers["Page"] = str(page)

        last_error: Exception | None = None
        for attempt in range(self._config.max_retries + 1):
            self._limiter.acquire()
            req = urllib.request.Request(url, method=method.upper(), headers=dict(headers))
            try:
                with urllib.request.urlopen(req, timeout=self._config.timeout) as resp:
                    raw = resp.read().decode("utf-8", errors="replace")
                    return resp.status, _parse_body(raw)
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                if exc.code == 403:
                    raise _classify_403(exc.code, body, url) from None
                if exc.code in (429, 500, 502, 503, 504) and attempt < self._config.max_retries:
                    time.sleep(2 ** (attempt + 1))
                    last_error = exc
                    continue
                raise ClickBankError(exc.code, body, url) from None
            except urllib.error.URLError as exc:
                if attempt < self._config.max_retries:
                    time.sleep(2 ** (attempt + 1))
                    last_error = exc
                    continue
                raise ClickBankError(0, f"Error de red: {exc}", url) from None

        raise ClickBankError(0, f"Agotados los reintentos: {last_error}", url)

    def paginate(
        self,
        path: str,
        params: Mapping[str, Any] | None = None,
        extract: str | Sequence[str] | None = None,
        max_pages: int = 500,
    ) -> Iterator[dict]:
        """Itera todas las páginas. Corta cuando el status deja de ser 206.

        No corta por "llegaron menos de 100 filas": la API puede devolver menos
        y aun así tener más datos. El único indicador fiable es el 206.
        """
        page = 1
        while page <= max_pages:
            status, payload = self.request("GET", path, params, page=page)
            for row in _extract_rows(payload, extract):
                yield row
            if status != 206:
                return
            page += 1


def _encode_params(params: Mapping[str, Any]) -> str:
    clean = {k: v for k, v in params.items() if v is not None}
    return urllib.parse.urlencode(clean, doseq=True)


def _parse_body(raw: str) -> Any:
    raw = raw.strip()
    if not raw:
        return ""
    try:
        return denil(json.loads(raw))
    except json.JSONDecodeError:
        return raw          # ClickBank devuelve errores y algunos cuerpos en texto plano


def _classify_403(status: int, body: str, url: str) -> ClickBankError:
    lowered = body.lower()
    if any(w in lowered for w in ("limit", "exceed", "throttl", "quota")):
        return ClickBankRateLimitError(status, body, url)
    return ClickBankAuthError(status, body, url)


def _extract_rows(payload: Any, extract: str | Sequence[str] | None) -> list[dict]:
    """Desenvuelve la respuesta hasta la lista de filas."""
    if payload in ("", None):
        return []
    node: Any = payload
    if extract:
        keys = [extract] if isinstance(extract, str) else list(extract)
        for key in keys:
            if isinstance(node, dict) and key in node:
                node = node[key]
    if isinstance(node, dict):
        # Envoltorios habituales: {"orderData": [...]}, {"rows": {"row": [...]}}
        for key in ("orderData", "quickStatsData", "productData", "ticketData",
                    "orderShipData", "shippingNoticeData", "imageData", "row", "rows"):
            if key in node:
                return _extract_rows(node[key], None)
    return [r for r in as_list(node) if isinstance(r, dict)]


# --------------------------------------------------------------------------- #
# Recursos
# --------------------------------------------------------------------------- #
class _Resource:
    def __init__(self, transport: _Transport) -> None:
        self._t = transport


class DebugAPI(_Resource):
    def context(self) -> Any:
        """GET /rest/1.3/debug — primer diagnóstico ante cualquier 403."""
        return self._t.request("GET", f"/rest/{API_VERSION}/debug")[1]


class QuickstatsAPI(_Resource):
    """Ventas, reembolsos y chargebacks. Sin filtros: últimos 45 días."""

    def accounts(self) -> list[dict]:
        return _extract_rows(
            self._t.request("GET", f"/rest/{API_VERSION}/quickstats/accounts")[1], None
        )

    def list(self, *, start: str | None = None, end: str | None = None,
             account: str | None = None, **extra: Any) -> Iterator[dict]:
        """Un registro por día."""
        return self._t.paginate(
            f"/rest/{API_VERSION}/quickstats/list",
            {"startDate": start, "endDate": end, "account": account, **extra},
        )

    def count(self, *, start: str | None = None, end: str | None = None,
              account: str | None = None, **extra: Any) -> Any:
        """Totales sumados del rango (``quickStatDate`` vuelve nulo)."""
        return self._t.request(
            "GET", f"/rest/{API_VERSION}/quickstats/count",
            {"startDate": start, "endDate": end, "account": account, **extra},
        )[1]


class OrdersAPI(_Resource):
    """Orders2 — versión vigente. Escribir usa `api_order_write`."""

    _BASE = f"/rest/{API_VERSION}/orders2"

    def list(self, *, start: str | None = None, end: str | None = None,
             account: str | None = None, **extra: Any) -> Iterator[dict]:
        return self._t.paginate(
            f"{self._BASE}/list",
            {"startDate": start, "endDate": end, "account": account, **extra},
        )

    def count(self, *, start: str | None = None, end: str | None = None, **extra: Any) -> Any:
        return self._t.request(
            "GET", f"{self._BASE}/count", {"startDate": start, "endDate": end, **extra}
        )[1]

    def get(self, receipt: str) -> Any:
        return self._t.request("GET", f"{self._BASE}/{urllib.parse.quote(receipt)}")[1]

    def is_active(self, receipt: str) -> bool:
        """HEAD: 204 = activa; 403 = reembolsada, cancelada, inexistente o sin acceso."""
        try:
            status, _ = self._t.request("HEAD", f"{self._BASE}/{urllib.parse.quote(receipt)}")
            return status == 204
        except ClickBankAuthError:
            return False

    def upsells(self, receipt: str) -> Any:
        return self._t.request("GET", f"{self._BASE}/{urllib.parse.quote(receipt)}/upsells")[1]

    # --- escritura: irreversibles, exigen idempotencia del lado del llamador ---
    def pause(self, receipt: str, **params: Any) -> Any:
        return self._post(receipt, "pause", params)

    def reinstate(self, receipt: str, **params: Any) -> Any:
        return self._post(receipt, "reinstate", params)

    def extend(self, receipt: str, *, periods: int, **params: Any) -> Any:
        return self._post(receipt, "extend", {"periods": periods, **params})

    def change_product(self, receipt: str, *, sku: str, **params: Any) -> Any:
        return self._post(receipt, "changeProduct", {"sku": sku, **params})

    def change_date(self, receipt: str, *, date: str, **params: Any) -> Any:
        return self._post(receipt, "changeDate", {"date": date, **params})

    def change_address(self, receipt: str, **params: Any) -> Any:
        return self._post(receipt, "changeAddress", params)

    def _post(self, receipt: str, action: str, params: Mapping[str, Any]) -> Any:
        return self._t.request(
            "POST", f"{self._BASE}/{urllib.parse.quote(receipt)}/{action}", params
        )[1]


class AnalyticsAPI(_Resource):
    _BASE = f"/rest/{API_VERSION}/analytics"

    def status(self) -> Any:
        """Última consolidación. Consúltalo antes de reportar el día en curso."""
        return self._t.request("GET", f"{self._BASE}/status")[1]

    def dimension(self, *, role: str, dimension: str, start: str, end: str,
                  account: str | None = None, **extra: Any) -> Iterator[dict]:
        """role: VENDOR|AFFILIATE. dimension: AFFILIATE, PRODUCT_SKU, TRACKING_ID,
        CUSTOMER_COUNTRY, CUSTOMER_CURRENCY, CUSTOMER_PROVINCE, CUSTOMER_LANGUAGE,
        VENDOR, VENDOR_CATEGORY, VENDOR_PRODUCT_SKU."""
        return self._t.paginate(
            f"{self._BASE}/{role}/{dimension}",
            {"startDate": start, "endDate": end, "account": account, **extra},
        )

    def dimension_summary(self, *, role: str, dimension: str, start: str, end: str,
                          **extra: Any) -> Any:
        return self._t.request(
            "GET", f"{self._BASE}/{role}/{dimension}/summary",
            {"startDate": start, "endDate": end, **extra},
        )[1]

    def subscription_details(self, *, role: str = "VENDOR", bucket: str | None = None,
                             **params: Any) -> Iterator[dict]:
        """bucket: None | compthirty | compsixty | cancelthirty | cancelsixty
        | startdate | canceldate | nextpmtdate | status.
        Solo disponible para el vendor dueño del producto."""
        path = f"{self._BASE}/{role}/subscription/details" + (f"/{bucket}" if bucket else "")
        return self._t.paginate(path, params)

    def subscription_trends(self, *, role: str = "VENDOR", **params: Any) -> Any:
        return self._t.request("GET", f"{self._BASE}/{role}/subscription/trends", params)[1]


class ProductsAPI(_Resource):
    _BASE = f"/rest/{API_VERSION}/products"

    def list(self, **params: Any) -> Iterator[dict]:
        return self._t.paginate(f"{self._BASE}/list", params)

    def get(self, sku: str, **params: Any) -> Any:
        return self._t.request("GET", f"{self._BASE}/{urllib.parse.quote(sku)}", params)[1]

    def save(self, sku: str, **params: Any) -> Any:
        """PUT: crea o actualiza. Los parámetros van por query string."""
        return self._t.request("PUT", f"{self._BASE}/{urllib.parse.quote(sku)}", params)[1]

    def delete(self, sku: str, **params: Any) -> Any:
        return self._t.request("DELETE", f"{self._BASE}/{urllib.parse.quote(sku)}", params)[1]


class ShippingAPI(_Resource):
    """Shipping3 por defecto (versión vigente). `version` permite shipping2/shipping."""

    def __init__(self, transport: _Transport, version: str = "shipping3") -> None:
        super().__init__(transport)
        self._base = f"/rest/{API_VERSION}/{version}"

    def list(self, *, status: str | None = None, **params: Any) -> Iterator[dict]:
        """status: shipped | notshipped | all."""
        return self._t.paginate(f"{self._base}/list", {"shippingStatus": status, **params})

    def count(self, **params: Any) -> Any:
        return self._t.request("GET", f"{self._base}/count", params)[1]

    def ship_notices(self, receipt: str) -> Any:
        return self._t.request("GET", f"{self._base}/shipnotice/{urllib.parse.quote(receipt)}")[1]

    def create_ship_notice(self, receipt: str, *, date: str | None = None,
                           carrier: str | None = None, tracking: str | None = None,
                           comments: str | None = None, item: str | None = None,
                           fillOrder: bool | None = None, **params: Any) -> Any:
        """Registra el envío. Irreversible: verifica idempotencia por receipt antes.

        date: yyyy-mm-dd · carrier: transportista · tracking: número de seguimiento
        item: sku/itemNo, obligatorio si la orden trae varios ítems físicos
        fillOrder: genera automáticamente los avisos restantes de la misma orden
        """
        params = {"date": date, "carrier": carrier, "tracking": tracking,
                  "comments": comments, "item": item, "fillOrder": fillOrder, **params}
        return self._t.request(
            "POST", f"{self._base}/shipnotice/{urllib.parse.quote(receipt)}", params
        )[1]


class TicketsAPI(_Resource):
    _BASE = f"/rest/{API_VERSION}/tickets"

    def list(self, **params: Any) -> Iterator[dict]:
        return self._t.paginate(f"{self._BASE}/list", params)

    def count(self, **params: Any) -> Any:
        return self._t.request("GET", f"{self._BASE}/count", params)[1]

    def get(self, ticket_id: str) -> Any:
        return self._t.request("GET", f"{self._BASE}/{urllib.parse.quote(str(ticket_id))}")[1]

    def refund_amounts(self, receipt: str, **params: Any) -> Any:
        """Simula el reembolso antes de emitirlo. Úsalo siempre en parciales."""
        return self._t.request(
            "GET", f"{self._BASE}/refundAmounts/{urllib.parse.quote(receipt)}", params
        )[1]

    def create(self, receipt: str, *, type: str, reason: str,
               refund_type: str | None = None, refund_amount: float | None = None,
               comment: str | None = None, sku: str | None = None,
               retain_subscription: bool | None = None) -> Any:
        """type: rfnd | cncl | tech.  DINERO REAL: no reversible.

        rfnd sobre recurrente reembolsa Y cancela futuros cobros;
        cncl solo cancela futuros cobros sin devolver dinero.
        """
        return self._t.request("POST", f"{self._BASE}/{urllib.parse.quote(receipt)}", {
            "type": type,
            "reason": reason,
            "refundType": refund_type,
            "refundAmount": refund_amount,
            "comment": comment,
            "sku": sku,
            "retainSubscription": retain_subscription,
        })[1]

    def update(self, ticket_id: str, **params: Any) -> Any:
        """action: change | close | reopen. Cerrar un ticket de reembolso lo CANCELA."""
        return self._t.request(
            "PUT", f"{self._BASE}/{urllib.parse.quote(str(ticket_id))}", params
        )[1]

    def acknowledge_return(self, ticket_id: str) -> Any:
        """204 al confirmar la devolución física; permite completar el reembolso."""
        return self._t.request(
            "POST", f"{self._BASE}/{urllib.parse.quote(str(ticket_id))}/returned"
        )[1]


class ImagesAPI(_Resource):
    def list(self, **params: Any) -> Iterator[dict]:
        return self._t.paginate(f"/rest/{API_VERSION}/images/list", params)


# --------------------------------------------------------------------------- #
# Fachada
# --------------------------------------------------------------------------- #
class ClickBank:
    """Punto de entrada único. Composición de recursos sobre un transporte."""

    def __init__(self, config: ClickBankConfig | None = None, **kwargs: Any) -> None:
        self.config = config or ClickBankConfig(**kwargs)
        self._transport = _Transport(self.config)

        self.debug = DebugAPI(self._transport)
        self.quickstats = QuickstatsAPI(self._transport)
        self.orders = OrdersAPI(self._transport)
        self.analytics = AnalyticsAPI(self._transport)
        self.products = ProductsAPI(self._transport)
        self.shipping = ShippingAPI(self._transport)
        self.shipping2 = ShippingAPI(self._transport, "shipping2")
        self.tickets = TicketsAPI(self._transport)
        self.images = ImagesAPI(self._transport)

    def raw(self, method: str, path: str, **params: Any) -> Any:
        """Escotilla de escape para endpoints no envueltos."""
        return self._transport.request(method, path, params)[1]


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _main(argv: Sequence[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Cliente CLI de la API de ClickBank v1.3")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("debug", help="Contexto de seguridad de la clave")
    sub.add_parser("accounts", help="Nicknames accesibles")

    for name in ("quickstats", "orders", "tickets", "shipping", "products"):
        p = sub.add_parser(name)
        p.add_argument("--start")
        p.add_argument("--end")
        p.add_argument("--account")
        p.add_argument("--limit", type=int, default=0)

    p = sub.add_parser("analytics")
    p.add_argument("--role", default="VENDOR")
    p.add_argument("--dimension", default="PRODUCT_SKU")
    p.add_argument("--start", required=True)
    p.add_argument("--end", required=True)
    p.add_argument("--account")
    p.add_argument("--limit", type=int, default=0)

    args = parser.parse_args(argv)
    cb = ClickBank()

    def dump(value: Any) -> None:
        print(json.dumps(value, indent=2, ensure_ascii=False, default=str))

    def collect(it: Iterator[dict], limit: int) -> list[dict]:
        rows: list[dict] = []
        for row in it:
            rows.append(row)
            if limit and len(rows) >= limit:
                break
        return rows

    if args.cmd == "debug":
        dump(cb.debug.context())
    elif args.cmd == "accounts":
        dump(cb.quickstats.accounts())
    elif args.cmd == "quickstats":
        dump(collect(cb.quickstats.list(start=args.start, end=args.end,
                                        account=args.account), args.limit))
    elif args.cmd == "orders":
        dump(collect(cb.orders.list(start=args.start, end=args.end,
                                    account=args.account), args.limit))
    elif args.cmd == "tickets":
        dump(collect(cb.tickets.list(startDate=args.start, endDate=args.end), args.limit))
    elif args.cmd == "shipping":
        dump(collect(cb.shipping.list(status="notshipped"), args.limit))
    elif args.cmd == "products":
        dump(collect(cb.products.list(), args.limit))
    elif args.cmd == "analytics":
        dump(collect(cb.analytics.dimension(role=args.role, dimension=args.dimension,
                                            start=args.start, end=args.end,
                                            account=args.account), args.limit))
    return 0


if __name__ == "__main__":
    import sys

    try:
        raise SystemExit(_main(sys.argv[1:]))
    except ClickBankError as exc:
        print(f"[ClickBank] {exc}", flush=True)
        raise SystemExit(1)
