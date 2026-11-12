import { execSync } from 'node:child_process';

// Aplica las migraciones a la base de pruebas antes de la primera prueba.
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
