import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.string('reference_id', 64).notNullable().unique();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.integer('amount_cents').unsigned().notNullable();
    t.enu('status', ['pending', 'paid', 'expired', 'canceled', 'failed']).notNullable().defaultTo('pending').index();
    t.string('provider', 20).notNullable().defaultTo('pagbank');
    t.string('provider_order_id', 64).nullable().index(); // ORDE_...
    t.text('qr_text').nullable();
    t.specificType('qr_image', 'MEDIUMTEXT').nullable(); // URL da imagem ou data URL
    t.dateTime('expires_at').nullable();
    t.dateTime('paid_at').nullable();
    t.json('provider_payload').nullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable('purchases', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.integer('order_id').unsigned().nullable().references('id').inTable('orders').onDelete('SET NULL');
    t.string('source', 20).notNullable().defaultTo('order'); // order | admin
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['user_id', 'novel_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('purchases');
  await knex.schema.dropTableIfExists('orders');
}
