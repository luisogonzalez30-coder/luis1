import "dotenv/config";
import { Job } from "bullmq";
import { prisma } from "@centinela-ta/database";
import { colaVerificaciones, crearWorker } from "./queue";
import { verificarEnlacesDeMunicipio } from "./verificar-enlaces";
import { verificarSeccionesDeMunicipio } from "./verificar-secciones";
import { generarInformeDeMunicipio } from "./generar-informe";

const INTERVALO_MIN = Number(process.env.VERIFICACION_ENLACES_INTERVALO_MIN ?? 60);

async function procesar(job: Job): Promise<void> {
  if (job.name === "planificar") {
    await planificarVerificaciones();
    return;
  }
  if (job.name === "verificar-municipio") {
    await verificarEnlacesDeMunicipio(job.data.municipioId);
    await verificarSeccionesDeMunicipio(job.data.municipioId);
    // Refresca el snapshot del mes en curso con los datos que se acaban de
    // verificar — el informe de "tendencia" queda al día en cada ciclo, no
    // solo una vez al mes.
    await generarInformeDeMunicipio(job.data.municipioId);
    return;
  }
  throw new Error(`Job desconocido: ${job.name}`);
}

/**
 * En producción esto lo dispara Cloud Scheduler -> Pub/Sub una vez por
 * municipio (ver diagrama de arquitectura). En local/desarrollo, el propio
 * BullMQ repeatable job hace de scheduler: encola un "abanico" de un job
 * `verificar-municipio` por cada tenant activo.
 */
async function planificarVerificaciones(): Promise<void> {
  const municipios = await prisma.municipio.findMany({ select: { id: true, nombre: true } });
  for (const municipio of municipios) {
    await colaVerificaciones.add(
      "verificar-municipio",
      { municipioId: municipio.id },
      { removeOnComplete: true, removeOnFail: 50 },
    );
  }
  console.log(`[planificar] ${municipios.length} municipio(s) encolados para verificación de enlaces`);
}

async function main() {
  const worker = crearWorker(procesar);

  worker.on("completed", (job: Job) => {
    console.log(`[worker] job ${job.name} (${job.id}) completado`);
  });
  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`[worker] job ${job?.name} (${job?.id}) falló:`, err.message);
  });

  await colaVerificaciones.add(
    "planificar",
    {},
    {
      repeat: { every: INTERVALO_MIN * 60_000 },
      removeOnComplete: true,
      jobId: "planificar-verificaciones", // evita duplicar el repeatable job si el proceso reinicia
    },
  );

  console.log(`Worker de Centinela TA activo. Verificación de enlaces cada ${INTERVALO_MIN} min.`);
}

main().catch((err) => {
  console.error("Error fatal en el worker:", err);
  process.exit(1);
});
