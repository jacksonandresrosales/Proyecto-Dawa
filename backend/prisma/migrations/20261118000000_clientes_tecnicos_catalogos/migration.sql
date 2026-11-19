-- Usuarios y perfiles operativos del módulo de administración.
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT true,
    "telefono" VARCHAR(20),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "razon_social" VARCHAR(160) NOT NULL,
    "ruc" CHAR(13) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clientes_ruc_solo_digitos" CHECK ("ruc" ~ '^[0-9]{13}$')
);

CREATE TABLE "sedes" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "direccion" VARCHAR(200) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tecnicos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "carga_max" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "tecnicos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tecnicos_carga_max_positiva" CHECK ("carga_max" > 0)
);

CREATE TABLE "especialidades" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tecnico_especialidad" (
    "tecnico_id" INTEGER NOT NULL,
    "especialidad_id" INTEGER NOT NULL,
    CONSTRAINT "tecnico_especialidad_pkey" PRIMARY KEY ("tecnico_id", "especialidad_id")
);

CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "especialidad_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prioridades" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(20) NOT NULL,
    "horas_sla" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "prioridades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "prioridades_horas_sla_positivas" CHECK ("horas_sla" > 0)
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "clientes_usuario_id_key" ON "clientes"("usuario_id");
CREATE UNIQUE INDEX "clientes_ruc_key" ON "clientes"("ruc");
CREATE UNIQUE INDEX "sedes_cliente_id_nombre_key" ON "sedes"("cliente_id", "nombre");
CREATE INDEX "sedes_cliente_id_idx" ON "sedes"("cliente_id");
CREATE UNIQUE INDEX "tecnicos_usuario_id_key" ON "tecnicos"("usuario_id");
CREATE UNIQUE INDEX "especialidades_nombre_key" ON "especialidades"("nombre");
CREATE INDEX "tecnico_especialidad_especialidad_id_idx" ON "tecnico_especialidad"("especialidad_id");
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");
CREATE INDEX "categorias_especialidad_id_idx" ON "categorias"("especialidad_id");
CREATE UNIQUE INDEX "prioridades_nombre_key" ON "prioridades"("nombre");

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tecnicos" ADD CONSTRAINT "tecnicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tecnico_especialidad" ADD CONSTRAINT "tecnico_especialidad_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "tecnicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tecnico_especialidad" ADD CONSTRAINT "tecnico_especialidad_especialidad_id_fkey" FOREIGN KEY ("especialidad_id") REFERENCES "especialidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_especialidad_id_fkey" FOREIGN KEY ("especialidad_id") REFERENCES "especialidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
