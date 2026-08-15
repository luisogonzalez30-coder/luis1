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

/**
 * Arranca el consumidor de la cola. Exportada (en vez de auto-ejecutarse
 * siempre) para poder embeberse en el proceso de la API cuando la
 * plataforma de hosting no ofrece un tipo de servicio "background worker"
 * separado (ej. el plan free de Render — ver apps/api/src/main.ts). Corrida
 * como proceso independiente (local, Docker, o un worker real en
 * producción), el comportamiento es idéntico.
 */
export async function iniciarWorker(): Promise<void> {
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

// Solo se auto-ejecuta si este archivo es el punto de entrada del proceso
// (`node dist/main.js`) — si otro proceso lo importa (ver embedded-worker
// de la API), es ese proceso quien decide cuándo llamar a iniciarWorker().
if (require.main === module) {
  iniciarWorker().catch((err) => {
    console.error("Error fatal en el worker:", err);
    process.exit(1);
  });
}
