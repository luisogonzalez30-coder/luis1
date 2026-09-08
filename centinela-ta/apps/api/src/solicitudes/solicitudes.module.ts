import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SolicitudesController } from "./solicitudes.controller";
import { SolicitudesService } from "./solicitudes.service";

@Module({
  imports: [AuditModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
})
export class SolicitudesModule {}
