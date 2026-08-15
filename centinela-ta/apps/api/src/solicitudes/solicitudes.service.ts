import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@centinela-ta/database";
import { FieldEncryptionService } from "../common/crypto/field-encryption.service";
import { AuditService } from "../audit/audit.service";
import { AuthContext } from "../common/types/auth-context";
import {
  diasHabilesRestantes,
  PLAZO_LEGAL_DIAS_HABILES,
  sumarDiasHabiles,
  UMBRAL_POR_VENCER_DIAS_HABILES,
} from "./dias-habiles.util";

export interface SolicitudDTO {
  id: string;
  folio: string;
  solicitanteNombre: string;
  fechaIngreso: Date;
  fechaLimite: Date;
  diasHabilesRestantes: number;
  estado: "en_plazo" | "por_vencer" | "vencida" | "respondida";
  respuestaUrl: string | null;
}

@Injectable()
export class SolicitudesService {
  constructor(
    private readonly encryption: FieldEncryptionService,
    private readonly audit: AuditService,
  ) {}

  async crear(auth: AuthContext, folio: string, solicitanteNombre: string, fechaIngresoIso: string, ip?: string) {
    const fechaIngreso = new Date(fechaIngresoIso);
    const fechaLimite = sumarDiasHabiles(fechaIngreso, PLAZO_LEGAL_DIAS_HABILES);

    return withTenantContext(auth.municipioId, async (tx) => {
      const creada = await tx.solicitudAcceso.create({
        data: {
          municipioId: auth.municipioId,
          folio,
          solicitanteNombreCifrado: this.encryption.encrypt(solicitanteNombre),
          fechaIngreso,
          fechaLimite,
          estado: "en_plazo",
        },
      });

      await this.audit.registrar(tx, {
        municipioId: auth.municipioId,
        usuarioId: auth.usuarioId,
        accion: "solicitud.crear",
        entidad: "solicitud_acceso",
        entidadId: creada.id,
        ip,
      });

      return this.aDto(creada);
    });
  }

  async listar(auth: AuthContext, estado?: string): Promise<SolicitudDTO[]> {
    const solicitudes = await withTenantContext(auth.municipioId, (tx) =>
      tx.solicitudAcceso.findMany({ orderBy: { fechaLimite: "asc" } }),
    );

    const hoy = new Date();
    const conEstadoRecalculado = solicitudes.map((s) => {
      const restantes = diasHabilesRestantes(hoy, s.fechaLimite);
      let estadoCalculado = s.estado;
      if (s.estado !== "respondida") {
        if (restantes < 0) estadoCalculado = "vencida";
        else if (restantes <= UMBRAL_POR_VENCER_DIAS_HABILES) estadoCalculado = "por_vencer";
        else estadoCalculado = "en_plazo";
      }
      return this.aDto({ ...s, estado: estadoCalculado }, restantes);
    });

    return estado ? conEstadoRecalculado.filter((s) => s.estado === estado) : conEstadoRecalculado;
  }

  async marcarRespondida(auth: AuthContext, id: string, respuestaUrl: string, ip?: string) {
    return withTenantContext(auth.municipioId, async (tx) => {
      const solicitud = await tx.solicitudAcceso.findUnique({ where: { id } });
      if (!solicitud) throw new NotFoundException("Solicitud no encontrada");
      if (solicitud.municipioId !== auth.municipioId) throw new ForbiddenException();

      const actualizada = await tx.solicitudAcceso.update({
        where: { id },
        data: { estado: "respondida", respuestaUrl },
      });

      await this.audit.registrar(tx, {
        municipioId: auth.municipioId,
        usuarioId: auth.usuarioId,
        accion: "solicitud.responder",
        entidad: "solicitud_acceso",
        entidadId: id,
        ip,
      });

      return this.aDto(actualizada);
    });
  }

  private aDto(
    s: {
      id: string;
      folio: string;
      solicitanteNombreCifrado: string;
      fechaIngreso: Date;
      fechaLimite: Date;
      estado: string;
      respuestaUrl: string | null;
    },
    restantesPrecalculados?: number,
  ): SolicitudDTO {
    return {
      id: s.id,
      folio: s.folio,
      solicitanteNombre: this.encryption.decrypt(s.solicitanteNombreCifrado),
      fechaIngreso: s.fechaIngreso,
      fechaLimite: s.fechaLimite,
      diasHabilesRestantes: restantesPrecalculados ?? diasHabilesRestantes(new Date(), s.fechaLimite),
      estado: s.estado as SolicitudDTO["estado"],
      respuestaUrl: s.respuestaUrl,
    };
  }
}
