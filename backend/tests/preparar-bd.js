// Reinicia la base de pruebas (migraciones + seed) antes de correr `npm test`.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const url = readFileSync(new URL('../.env.test', import.meta.url), 'utf8').match(/DATABASE_URL="?([^"\n]+)/)[1];

// Protección: nunca reiniciar una base que no sea de pruebas
if (!/_test(\?|$)/.test(url)) {
  console.error(`DATABASE_URL de .env.test no termina en _test (${url}). Abortando.`);
  process.exit(1);
}

execSync('npx prisma migrate reset --force', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
