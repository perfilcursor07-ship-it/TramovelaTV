import { createApp } from './app';
import { env } from './config/env';
import { db } from './db/knex';

async function main() {
  await db.raw('select 1');
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API rodando em http://localhost:${env.port}  (pagamento: ${env.pagbank.env})`);
  });
}

main().catch((e) => {
  console.error('Falha ao iniciar a API:', e.message);
  process.exit(1);
});
