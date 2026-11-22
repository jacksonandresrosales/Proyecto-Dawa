-- CreateTable
CREATE TABLE "estados" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "es_final" BOOLEAN NOT NULL,

    CONSTRAINT "estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "prioridad_id" INTEGER NOT NULL,
    "estado_id" INTEGER NOT NULL,
    "tecnico_actual_id" INTEGER,
    "creado_por" INTEGER NOT NULL,
    "equipo" VARCHAR(160) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "resolucion" TEXT,
    "fecha_limite" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "tecnico_id" INTEGER NOT NULL,
    "asignado_por" INTEGER NOT NULL,
    "justificacion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "estado_anterior_id" INTEGER,
    "estado_nuevo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjuntos" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "nombre_original" VARCHAR(200) NOT NULL,
    "ruta" VARCHAR(300) NOT NULL,
    "mime" VARCHAR(80) NOT NULL,
    "tamano" INTEGER NOT NULL,
    "subido_por" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "solicitud_id" INTEGER,
    "tipo" VARCHAR(30) NOT NULL,
    "mensaje" VARCHAR(300) NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estados_codigo_key" ON "estados"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_codigo_key" ON "solicitudes"("codigo");

-- CreateIndex
CREATE INDEX "solicitudes_estado_id_idx" ON "solicitudes"("estado_id");

-- CreateIndex
CREATE INDEX "solicitudes_cliente_id_idx" ON "solicitudes"("cliente_id");

-- CreateIndex
CREATE INDEX "solicitudes_tecnico_actual_id_idx" ON "solicitudes"("tecnico_actual_id");

-- CreateIndex
CREATE INDEX "solicitudes_fecha_limite_idx" ON "solicitudes"("fecha_limite");

-- CreateIndex
CREATE INDEX "solicitudes_created_at_idx" ON "solicitudes"("created_at");

-- CreateIndex
CREATE INDEX "asignaciones_solicitud_id_idx" ON "asignaciones"("solicitud_id");

-- CreateIndex
CREATE INDEX "asignaciones_tecnico_id_activa_idx" ON "asignaciones"("tecnico_id", "activa");

-- CreateIndex
CREATE INDEX "historial_estados_solicitud_id_created_at_idx" ON "historial_estados"("solicitud_id", "created_at");

-- CreateIndex
CREATE INDEX "adjuntos_solicitud_id_idx" ON "adjuntos"("solicitud_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leida_created_at_idx" ON "notificaciones"("usuario_id", "leida", "created_at");

-- CreateIndex
CREATE INDEX "notificaciones_solicitud_id_idx" ON "notificaciones"("solicitud_id");

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_prioridad_id_fkey" FOREIGN KEY ("prioridad_id") REFERENCES "prioridades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_estado_id_fkey" FOREIGN KEY ("estado_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_tecnico_actual_id_fkey" FOREIGN KEY ("tecnico_actual_id") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_asignado_por_fkey" FOREIGN KEY ("asignado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_estado_anterior_id_fkey" FOREIGN KEY ("estado_anterior_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_estado_nuevo_id_fkey" FOREIGN KEY ("estado_nuevo_id") REFERENCES "estados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_subido_por_fkey" FOREIGN KEY ("subido_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Lo siguiente no se puede expresar en schema.prisma y se escribe a mano.
-- ---------------------------------------------------------------------------

-- Restricciones de dominio (defensa en profundidad: el backend valida primero).
ALTER TABLE "solicitudes"
    ADD CONSTRAINT "solicitudes_codigo_formato" CHECK ("codigo" ~ '^SOL-[0-9]{4}-[0-9]{6}$'),
    ADD CONSTRAINT "solicitudes_version_positiva" CHECK ("version" > 0),
    ADD CONSTRAINT "solicitudes_fecha_limite_posterior" CHECK ("fecha_limite" > "created_at"),
    ADD CONSTRAINT "solicitudes_resolved_at_posterior" CHECK ("resolved_at" IS NULL OR "resolved_at" >= "created_at"),
    -- Regla 1: no se cierra una solicitud sin resolución documentada.
    ADD CONSTRAINT "solicitudes_cierre_con_resolucion"
        CHECK ("closed_at" IS NULL OR ("resolucion" IS NOT NULL AND btrim("resolucion") <> ''));

ALTER TABLE "adjuntos"
    ADD CONSTRAINT "adjuntos_tamano_positivo" CHECK ("tamano" > 0);

ALTER TABLE "notificaciones"
    ADD CONSTRAINT "notificaciones_tipo_valido"
        CHECK ("tipo" IN ('registro', 'asignacion', 'cambio_estado', 'solicitud_info', 'cierre'));

ALTER TABLE "historial_estados"
    ADD CONSTRAINT "historial_estados_cambio_real"
        CHECK ("estado_anterior_id" IS DISTINCT FROM "estado_nuevo_id");

-- Una sola asignación activa por solicitud (regla 5 / reasignación).
CREATE UNIQUE INDEX "asignaciones_una_activa_por_solicitud"
    ON "asignaciones"("solicitud_id") WHERE "activa";

-- Historial inalterable (regla 7): solo se permiten inserciones.
CREATE FUNCTION "historial_estados_inalterable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'historial_estados es inalterable: no se permite %', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "historial_estados_sin_cambios"
    BEFORE UPDATE OR DELETE ON "historial_estados"
    FOR EACH ROW EXECUTE FUNCTION "historial_estados_inalterable"();

-- Catálogo fijo de estados: la máquina de estados del backend depende de estos códigos.
INSERT INTO "estados" ("codigo", "nombre", "es_final") VALUES
    ('registrada', 'Registrada', false),
    ('aprobada', 'Aprobada', false),
    ('asignada', 'Asignada', false),
    ('en_proceso', 'En proceso', false),
    ('pendiente_info', 'Pendiente de información', false),
    ('resuelta', 'Resuelta', false),
    ('cerrada', 'Cerrada', true),
    ('cancelada', 'Cancelada', true)
ON CONFLICT ("codigo") DO NOTHING;
