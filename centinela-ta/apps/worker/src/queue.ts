import { Queue, Worker, type ConnectionOptions, type Processor } from "bullmq";

export const connection: ConnectionOptions = {
  // BullMQ acepta una URL de Redis a través de un parser propio; para
  // mantenerlo explícito (y evitar sorpresas con TLS en Memorystore) se
  // separa host/puerto en vez de pasar la URL cruda.
  ...parseRedisUrl(process.env.REDIS_URL ?? "redis://localhost:6379"),
};

export const NOMBRE_COLA = "verificaciones";

export const colaVerificaciones = new Queue(NOMBRE_COLA, { connection });

export function crearWorker(procesador: Processor) {
  return new Worker(NOMBRE_COLA, procesador, { connection, concurrency: 5 });
}

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port || 6379) };
}
