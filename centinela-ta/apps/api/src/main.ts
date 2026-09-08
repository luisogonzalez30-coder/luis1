import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { iniciarWorker } from "@centinela-ta/worker";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  // Render (y la mayoría de los PaaS) asignan el puerto vía $PORT en
  // runtime — API_PORT sigue existiendo como valor por defecto para
  // desarrollo local, donde no hay una plataforma imponiendo el puerto.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Centinela TA API escuchando en http://localhost:${port}/api/v1`);

  // Plataformas sin un tipo de servicio "background worker" en el plan
  // gratis (ej. Render) no dejan correr apps/worker como proceso aparte.
  // EMBED_WORKER=true lo arranca en este mismo proceso en su lugar — mismo
  // código, misma cola de Redis, la única diferencia es quién lo hostea.
  // En desarrollo local y en cualquier hosting que sí soporte un worker
  // real, esta variable queda en false y apps/worker corre solo.
  if (process.env.EMBED_WORKER === "true") {
    await iniciarWorker();
    // eslint-disable-next-line no-console
    console.log("Worker embebido en el proceso de la API (EMBED_WORKER=true).");
  }
}

bootstrap();
