import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TenantContextMiddleware } from "./middleware/tenant-context.middleware";
import { RolesGuard } from "./guards/roles.guard";
import { FieldEncryptionService } from "./crypto/field-encryption.service";

/**
 * Global a propósito: JwtService, el guard de roles y el cifrado de campo
 * los necesita casi todo módulo de dominio, y repetir el import en cada uno
 * solo agrega ruido sin ganar aislamiento real (todos corren en el mismo
 * proceso de API).
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "8h") },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TenantContextMiddleware, RolesGuard, FieldEncryptionService],
  exports: [JwtModule, TenantContextMiddleware, RolesGuard, FieldEncryptionService],
})
export class CommonModule {}
