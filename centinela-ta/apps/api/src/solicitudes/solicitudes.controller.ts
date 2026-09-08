import { Body, Controller, Get, Ip, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireRoles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthContext } from "../common/types/auth-context";
import { SolicitudesService } from "./solicitudes.service";
import { CrearSolicitudDto } from "./dto/crear-solicitud.dto";
import { ActualizarSolicitudDto } from "./dto/actualizar-solicitud.dto";

@Controller("solicitudes")
@UseGuards(RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Get()
  @RequireRoles(Rol.encargado_transparencia, Rol.auditor, Rol.admin_municipal)
  listar(@CurrentUser() auth: AuthContext, @Query("estado") estado?: string) {
    return this.solicitudes.listar(auth, estado);
  }

  @Post()
  @RequireRoles(Rol.encargado_transparencia)
  crear(@CurrentUser() auth: AuthContext, @Body() dto: CrearSolicitudDto, @Ip() ip: string) {
    return this.solicitudes.crear(auth, dto.folio, dto.solicitanteNombre, dto.fechaIngreso, ip);
  }

  @Patch(":id/responder")
  @RequireRoles(Rol.encargado_transparencia)
  responder(@CurrentUser() auth: AuthContext, @Param("id") id: string, @Body() dto: ActualizarSolicitudDto, @Ip() ip: string) {
    return this.solicitudes.marcarRespondida(auth, id, dto.respuestaUrl, ip);
  }
}
