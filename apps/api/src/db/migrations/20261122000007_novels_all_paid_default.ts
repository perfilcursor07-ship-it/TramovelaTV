import { Knex } from 'knex';

/** Modelo "tudo pago": nenhuma novela tem episódio grátis por padrão. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('free_episodes').unsigned().notNullable().defaultTo(0).alter();
  });
  await knex('novels').update({ free_episodes: 0 });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('free_episodes').unsigned().notNullable().defaultTo(3).alter();
  });
}
