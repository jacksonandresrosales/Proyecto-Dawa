CREATE TABLE "password_resets" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expira_at" TIMESTAMPTZ(6) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");
CREATE INDEX "password_resets_usuario_id_usado_expira_at_idx" ON "password_resets"("usuario_id", "usado", "expira_at");

ALTER TABLE "password_resets"
    ADD CONSTRAINT "password_resets_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "roles" ("nombre")
VALUES ('admin'), ('coordinador'), ('tecnico'), ('cliente')
ON CONFLICT ("nombre") DO NOTHING;
