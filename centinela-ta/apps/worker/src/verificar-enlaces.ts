import { request } from "undici";
import { withTenantContext } from "@centinela-ta/database";
import { NotificacionService } from "./notificaciones.service";

const TIMEOUT_MS = 8_000;
const HORAS_CAIDO_PARA_RE_ALERTAR = 24;

const notificaciones = new NotificacionService();

/**
 * Verifica todos los enlaces de un municipio. HEAD primero (barato); si el
 * portal no lo soporta (frecuente en CMS municipales viejos, que devuelven
 * 405 a HEAD), reintenta con GET antes de marcarlo caído.
 */
export async function verificarEnlacesDeMunicipio(municipioId: string): Promise<void> {
  const enlaces = await withTenantContext(municipioId, (tx) =>
    tx.enlace.findMany({ include: { seccion: true } }),
  );

  if (enlaces.length === 0) return;

  for (const enlace of enlaces) {
    const estado = await verificarUnaUrl(enlace.url);
    const yaEstabaCaido = enlace.caidoDesde !== null;

    await withTenantContext(municipioId, (tx) => {
      if (estado.ok) {
        return tx.enlace.update({
          where: { id: enlace.id },
          data: { ultimoStatusHttp: estado.statusHttp, ultimaVerificacion: new Date(), caidoDesde: null },
        });
      }
      return tx.enlace.update({
        where: { id: enlace.id },
        data: {
          ultimoStatusHttp: estado.statusHttp,
          ultimaVerificacion: new Date(),
          caidoDesde: enlace.caidoDesde ?? new Date(),
        },
      });
    });

    if (estado.ok) continue;

    const caidoDesdeHoras = enlace.caidoDesde ? (Date.now() - enlace.caidoDesde.getTime()) / 3_600_000 : 0;
    const debeAlertar = !yaEstabaCaido || caidoDesdeHoras >= HORAS_CAIDO_PARA_RE_ALERTAR;
    if (!debeAlertar) continue;

    const destinatarios = await withTenantContext(municipioId, (tx) =>
      tx.usuario.findMany({
        where: { rol: { in: ["encargado_transparencia", "admin_municipal"] } },
        select: { email: true },
      }),
    );

    await notificaciones.alertarEnlaceCaido(
      { municipioId, enlaceId: enlace.id, url: enlace.url, seccionNombre: enlace.seccion.nombre },
      destinatarios.map((d) => d.email),
    );
  }
}

async function verificarUnaUrl(url: string): Promise<{ ok: boolean; statusHttp: number }> {
  try {
    const resHead = await request(url, { method: "HEAD", headersTimeout: TIMEOUT_MS, bodyTimeout: TIMEOUT_MS });
    if (resHead.statusCode < 400) return { ok: true, statusHttp: resHead.statusCode };

    const resGet = await request(url, { method: "GET", headersTimeout: TIMEOUT_MS, bodyTimeout: TIMEOUT_MS });
    return { ok: resGet.statusCode < 400, statusHttp: resGet.statusCode };
  } catch {
    return { ok: false, statusHttp: 0 };
  }
}
