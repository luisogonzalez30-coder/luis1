import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { RevisionesController } from "./revisiones.controller";
import { RevisionesService } from "./revisiones.service";

@Module({
  imports: [AuditModule],
  controllers: [RevisionesController],
  providers: [RevisionesService],
})
export class RevisionesModule {}
