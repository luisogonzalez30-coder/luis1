-- CreateEnum
CREATE TYPE "rol" AS ENUM ('super_admin', 'admin_municipal', 'encargado_transparencia', 'auditor');

-- CreateEnum
CREATE TYPE "estado_revision" AS ENUM ('cumple', 'no_cumple', 'desactualizada', 'resuelta_pendiente_verificacion');

-- CreateEnum
CREATE TYPE "estado_solicitud" AS ENUM ('en_plazo', 'por_vencer', 'vencida', 'respondida');

-- CreateTable
CREATE TABLE "municipio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'piloto',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "rol" NOT NULL,
    "hash_password" TEXT NOT NULL,
    "mfa_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_login" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seccion_transparencia" (
    "id" TEXT NOT NULL,
    "codigo_ley" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "periodicidad_dias" INTEGER NOT NULL,
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "seccion_transparencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revision" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "estado" "estado_revision" NOT NULL,
    "detalle" TEXT,
    "evidencia_url" TEXT,
    "revisado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_por" TEXT,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enlace" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "seccion_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ultimo_status_http" INTEGER,
    "ultima_verificacion" TIMESTAMP(3),
    "caido_desde" TIMESTAMP(3),

    CONSTRAINT "enlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_acceso" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "solicitante_nombre_cifrado" TEXT NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_limite" DATE NOT NULL,
    "estado" "estado_solicitud" NOT NULL DEFAULT 'en_plazo',
    "respuesta_url" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitud_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informe_cumplimiento" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "periodo" DATE NOT NULL,
    "porcentaje_cumplimiento" DECIMAL(5,2) NOT NULL,
    "generado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informe_cumplimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "municipio_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "ip" TEXT,
    "ocurrido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipio_nombre_key" ON "municipio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_municipio_id_idx" ON "usuario"("municipio_id");

-- CreateIndex
CREATE UNIQUE INDEX "seccion_transparencia_codigo_ley_key" ON "seccion_transparencia"("codigo_ley");

-- CreateIndex
CREATE INDEX "revision_municipio_id_idx" ON "revision"("municipio_id");

-- CreateIndex
CREATE INDEX "revision_municipio_id_estado_idx" ON "revision"("municipio_id", "estado");

-- CreateIndex
CREATE INDEX "enlace_municipio_id_idx" ON "enlace"("municipio_id");

-- CreateIndex
CREATE UNIQUE INDEX "enlace_municipio_id_seccion_id_key" ON "enlace"("municipio_id", "seccion_id");

-- CreateIndex
CREATE INDEX "solicitud_acceso_municipio_id_idx" ON "solicitud_acceso"("municipio_id");

-- CreateIndex
CREATE INDEX "solicitud_acceso_municipio_id_estado_idx" ON "solicitud_acceso"("municipio_id", "estado");

-- CreateIndex
CREATE INDEX "informe_cumplimiento_municipio_id_idx" ON "informe_cumplimiento"("municipio_id");

-- CreateIndex
CREATE INDEX "audit_log_municipio_id_idx" ON "audit_log"("municipio_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "seccion_transparencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_resuelto_por_fkey" FOREIGN KEY ("resuelto_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlace" ADD CONSTRAINT "enlace_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlace" ADD CONSTRAINT "enlace_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "seccion_transparencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_acceso" ADD CONSTRAINT "solicitud_acceso_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informe_cumplimiento" ADD CONSTRAINT "informe_cumplimiento_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
