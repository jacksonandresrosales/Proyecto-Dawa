CREATE UNIQUE INDEX "especialidades_nombre_ci_key" ON "especialidades"(LOWER("nombre"));
CREATE UNIQUE INDEX "categorias_nombre_ci_key" ON "categorias"(LOWER("nombre"));
CREATE UNIQUE INDEX "prioridades_nombre_ci_key" ON "prioridades"(LOWER("nombre"));
