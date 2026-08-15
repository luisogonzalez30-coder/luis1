import { Controller, Get } from "@nestjs/common";
import { prisma } from "@centinela-ta/database";

@Controller("health")
export class HealthController {
  @Get()
  async check() {
    // Un ping real a la base, no solo "el proceso responde" — así el
    // health check de la plataforma (Render) detecta una base caída como
    // fallo, no como servicio sano.
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
