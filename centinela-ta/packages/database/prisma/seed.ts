import { hash } from "argon2";
import { prisma, withTenantContext, Rol } from "../src/index";

// Subconjunto representativo del art. 7 de la Ley N° 20.285 — en producción
// este catálogo se completa con las ~30 secciones obligatorias reales y su
// periodicidad exacta, confirmada con la Unidad de Control Interno de cada
// municipio piloto (ver "Próximos Pasos" del documento de arquitectura).
const CATALOGO_SECCIONES = [
  { codigoLey: "Art.7 letra c)", nombre: "Personal de planta, contrata y honorarios", periodicidadDias: 30 },
  { codigoLey: "Art.7 letra g)", nombre: "Remuneraciones por estamento", periodicidadDias: 30 },
  { codigoLey: "Art.7 letra i)", nombre: "Contrataciones de bienes y servicios", periodicidadDias: 30 },
  { codigoLey: "Art.7 letra j)", nombre: "Transferencias de fondos públicos", periodicidadDias: 30 },
  { codigoLey: "Art.7 letra k)", nombre: "Actos y resoluciones con efecto sobre terceros", periodicidadDias: 15 },
  { codigoLey: "Art.7 letra m)", nombre: "Mecanismos de participación ciudadana", periodicidadDias: 90 },
  { codigoLey: "Art.7 letra ñ)", nombre: "Subsidios y beneficios entregados", periodicidadDias: 30 },
  { codigoLey: "Art.7 letra p)", nombre: "Presupuesto y ejecución presupuestaria", periodicidadDias: 30 },
];

async function main() {
  console.log("Sembrando catálogo de secciones de Transparencia Activa...");
  const secciones = [];
  for (const seccion of CATALOGO_SECCIONES) {
    const creada = await prisma.seccionTransparencia.upsert({
      where: { codigoLey: seccion.codigoLey },
      update: {},
      create: seccion,
    });
    secciones.push(creada);
  }

  console.log("Creando municipio piloto (Retiro)...");
  const municipio = await prisma.municipio.upsert({
    where: { nombre: "Ilustre Municipalidad de Retiro" },
    update: {},
    create: {
      nombre: "Ilustre Municipalidad de Retiro",
      comuna: "Retiro",
      region: "Región del Maule",
      plan: "piloto",
    },
  });

  console.log("Creando usuarios de ejemplo...");
  const passwordDemo = await hash("Cambiar123!");
  const usuariosDemo: Array<{ email: string; nombre: string; rol: Rol }> = [
    { email: "control.interno@retiro.cl", nombre: "Auditor de Control Interno", rol: Rol.auditor },
    { email: "transparencia@retiro.cl", nombre: "Encargado de Transparencia", rol: Rol.encargado_transparencia },
    { email: "admin@retiro.cl", nombre: "Administrador Municipal", rol: Rol.admin_municipal },
  ];

  // usuario/enlace tienen RLS forzado incluso para el dueño de la tabla, así
  // que el seed pasa por el mismo withTenantContext que usará la API en
  // producción — valida el mecanismo de aislamiento, no lo rodea.
  await withTenantContext(municipio.id, async (tx) => {
    for (const u of usuariosDemo) {
      await tx.usuario.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, municipioId: municipio.id, hashPassword: passwordDemo },
      });
    }

    console.log("Creando enlaces de ejemplo...");
    for (const seccion of secciones.slice(0, 4)) {
      await tx.enlace.upsert({
        where: { municipioId_seccionId: { municipioId: municipio.id, seccionId: seccion.id } },
        update: {},
        create: {
          municipioId: municipio.id,
          seccionId: seccion.id,
          url: `https://transparencia.retiro.cl/${seccion.codigoLey.replace(/\W+/g, "-").toLowerCase()}`,
        },
      });
    }
  });

  console.log("Listo. Usuarios demo (password: Cambiar123!):");
  for (const u of usuariosDemo) console.log(`  - ${u.email} (${u.rol})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
