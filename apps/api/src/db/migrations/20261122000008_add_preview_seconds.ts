import { Knex } from 'knex';

/** Segundos de prévia do episódio 1 antes de pedir o pagamento. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('preview_seconds').unsigned().notNullable().defaultTo(30).after('free_episodes');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.dropColumn('preview_seconds');
  });
}
