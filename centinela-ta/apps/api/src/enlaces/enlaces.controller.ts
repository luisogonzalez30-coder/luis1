import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireRoles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthContext } from "../common/types/auth-context";
import { EnlacesService } from "./enlaces.service";

@Controller("enlaces")
@UseGuards(RolesGuard)
@RequireRoles(Rol.encargado_transparencia, Rol.auditor, Rol.admin_municipal)
export class EnlacesController {
  constructor(private readonly enlaces: EnlacesService) {}

  @Get()
  listar(@CurrentUser() auth: AuthContext, @Query("soloCaidos") soloCaidos?: string) {
    return this.enlaces.listar(auth, soloCaidos === "true");
  }
}
