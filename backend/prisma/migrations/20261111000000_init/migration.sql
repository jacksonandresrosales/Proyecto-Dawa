-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(20) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");
