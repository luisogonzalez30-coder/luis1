import { Controller, Get, UseGuards } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireRoles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthContext } from "../common/types/auth-context";
import { CumplimientoService } from "./cumplimiento.service";

@Controller("cumplimiento")
@UseGuards(RolesGuard)
@RequireRoles(Rol.encargado_transparencia, Rol.auditor, Rol.admin_municipal)
export class CumplimientoController {
  constructor(private readonly cumplimiento: CumplimientoService) {}

  @Get("resumen")
  resumen(@CurrentUser() auth: AuthContext) {
    return this.cumplimiento.resumen(auth);
  }
}
