import { Body, Controller, Get, Ip, Param, Post, Query, UseGuards } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireRoles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthContext } from "../common/types/auth-context";
import { RevisionesService } from "./revisiones.service";
import { ResolverRevisionDto } from "./dto/resolver-revision.dto";

@Controller("revisiones")
@UseGuards(RolesGuard)
export class RevisionesController {
  constructor(private readonly revisiones: RevisionesService) {}

  @Get()
  @RequireRoles(Rol.encargado_transparencia, Rol.auditor, Rol.admin_municipal)
  listar(@CurrentUser() auth: AuthContext, @Query("estado") estado?: string) {
    return this.revisiones.listar(auth, estado);
  }

  @Post(":id/resolver")
  @RequireRoles(Rol.encargado_transparencia, Rol.admin_municipal)
  resolver(
    @CurrentUser() auth: AuthContext,
    @Param("id") id: string,
    @Body() dto: ResolverRevisionDto,
    @Ip() ip: string,
  ) {
    return this.revisiones.resolver(auth, id, dto.evidenciaUrl, dto.comentario, ip);
  }
}
