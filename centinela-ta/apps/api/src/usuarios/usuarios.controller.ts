import { Body, Controller, Get, Ip, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Rol } from "@centinela-ta/database";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireRoles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthContext } from "../common/types/auth-context";
import { UsuariosService } from "./usuarios.service";
import { CrearUsuarioDto } from "./dto/crear-usuario.dto";

@Controller("usuarios")
@UseGuards(RolesGuard)
@RequireRoles(Rol.admin_municipal)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar(@CurrentUser() auth: AuthContext) {
    return this.usuarios.listar(auth);
  }

  @Post()
  crear(@CurrentUser() auth: AuthContext, @Body() dto: CrearUsuarioDto, @Ip() ip: string) {
    return this.usuarios.crear(auth, dto.email, dto.nombre, dto.rol, dto.password, ip);
  }

  @Patch(":id/desactivar")
  desactivar(@CurrentUser() auth: AuthContext, @Param("id") id: string, @Ip() ip: string) {
    return this.usuarios.cambiarActivo(auth, id, false, ip);
  }

  @Patch(":id/reactivar")
  reactivar(@CurrentUser() auth: AuthContext, @Param("id") id: string, @Ip() ip: string) {
    return this.usuarios.cambiarActivo(auth, id, true, ip);
  }
}
