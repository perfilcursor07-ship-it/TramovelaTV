import { db } from './knex';

async function main() {
  const [cmd, name] = process.argv.slice(2);
  switch (cmd) {
    case 'latest': {
      const [batch, files] = await db.migrate.latest();
      console.log(files.length ? `Batch ${batch}:\n - ${files.join('\n - ')}` : 'Nada a migrar.');
      break;
    }
    case 'rollback': {
      const [batch, files] = await db.migrate.rollback();
      console.log(files.length ? `Rollback batch ${batch}:\n - ${files.join('\n - ')}` : 'Nada a desfazer.');
      break;
    }
    case 'status': {
      const [done, pending] = await db.migrate.list();
      console.log('Executadas:', done.map((d: any) => d.name ?? d.file ?? d));
      console.log('Pendentes:', pending.map((p: any) => p.file ?? p));
      break;
    }
    case 'make': {
      if (!name) throw new Error('Uso: npm run migrate:make -- nome_da_migration');
      const file = await db.migrate.make(name);
      console.log('Criada:', file);
      break;
    }
    case 'seed': {
      const [files] = await db.seed.run();
      console.log('Seeds:', files);
      break;
    }
    default:
      console.log('Comandos: latest | rollback | status | make <nome> | seed');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
