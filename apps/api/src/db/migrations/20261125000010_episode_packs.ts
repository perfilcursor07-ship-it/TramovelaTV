import { Knex } from 'knex';

/**
 * Funil por episódios:
 * - free_episodes: episódios inteiros grátis (padrão 1)
 * - preview_seconds: segundos grátis do próximo episódio bloqueado (padrão 5)
 * - pack_episodes / pack_price_cents: pacote promocional (padrão 3 episódios por R$ 5,99)
 * - episodes.preview_seconds: segundos grátis específicos de um episódio (null = usa o da novela)
 * - novel_unlocks: até qual episódio cada usuário já liberou com pacotes
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('free_episodes').unsigned().notNullable().defaultTo(1).alter();
    t.integer('preview_seconds').unsigned().notNullable().defaultTo(5).alter();
    t.integer('pack_episodes').unsigned().notNullable().defaultTo(3).after('preview_seconds');
    t.integer('pack_price_cents').unsigned().notNullable().defaultTo(599).after('pack_episodes');
  });
  await knex('novels').update({ free_episodes: 1, preview_seconds: 5 });

  await knex.schema.alterTable('episodes', (t) => {
    t.integer('preview_seconds').unsigned().nullable().after('duration_seconds');
  });

  await knex.schema.createTable('novel_unlocks', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.integer('unlocked_until').unsigned().notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.unique(['user_id', 'novel_id']);
  });

  await knex.schema.alterTable('orders', (t) => {
    t.enum('kind', ['full', 'pack']).notNullable().defaultTo('full').after('novel_id');
    t.integer('episodes_unlocked').unsigned().nullable().after('kind');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('episodes_unlocked');
    t.dropColumn('kind');
  });
  await knex.schema.dropTableIfExists('novel_unlocks');
  await knex.schema.alterTable('episodes', (t) => {
    t.dropColumn('preview_seconds');
  });
  await knex.schema.alterTable('novels', (t) => {
    t.dropColumn('pack_price_cents');
    t.dropColumn('pack_episodes');
    t.integer('free_episodes').unsigned().notNullable().defaultTo(0).alter();
    t.integer('preview_seconds').unsigned().notNullable().defaultTo(15).alter();
  });
}
