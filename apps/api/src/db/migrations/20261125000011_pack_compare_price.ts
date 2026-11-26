import { Knex } from 'knex';

/** Preço "de" (riscado) do pacote, para mostrar o desconto. 0 = não mostra. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.integer('pack_compare_cents').unsigned().notNullable().defaultTo(5990).after('pack_price_cents');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('novels', (t) => {
    t.dropColumn('pack_compare_cents');
  });
}
