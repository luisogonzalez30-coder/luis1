import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "./common/common.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { CumplimientoModule } from "./cumplimiento/cumplimiento.module";
import { RevisionesModule } from "./revisiones/revisiones.module";
import { EnlacesModule } from "./enlaces/enlaces.module";
import { SolicitudesModule } from "./solicitudes/solicitudes.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    AuditModule,
    CumplimientoModule,
    RevisionesModule,
    EnlacesModule,
    SolicitudesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude({ path: "auth/login", method: RequestMethod.POST })
      .forRoutes("*");
  }
}
