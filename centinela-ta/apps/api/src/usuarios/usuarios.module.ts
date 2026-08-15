import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";

@Module({
  imports: [AuditModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
