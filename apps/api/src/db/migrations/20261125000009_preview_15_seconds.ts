import { Knex } from 'knex';

/** Prévia grátis passa a ser de 15 segundos (padrão e novelas existentes). */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('preview_seconds').unsigned().notNullable().defaultTo(15).alter();
  });
  await knex('novels').update({ preview_seconds: 15 });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('preview_seconds').unsigned().notNullable().defaultTo(30).alter();
  });
  await knex('novels').update({ preview_seconds: 30 });
}
