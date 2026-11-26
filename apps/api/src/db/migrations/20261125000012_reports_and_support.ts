import { Knex } from 'knex';

/** Problemas reportados pelos usuários + e-mail de suporte nas configurações. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reports', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('type', 40).notNullable();
    t.text('message').notNullable();
    t.string('contact', 160).nullable();
    t.string('novel_slug', 170).nullable();
    t.integer('episode_number').unsigned().nullable();
    t.string('page_url', 500).nullable();
    t.string('user_agent', 300).nullable();
    t.enum('status', ['open', 'resolved']).notNullable().defaultTo('open');
    t.timestamps(true, true);
    t.index(['status', 'created_at']);
  });
  await knex('settings').insert({ key: 'support_email', value: '' }).onConflict('key').ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reports');
  await knex('settings').where({ key: 'support_email' }).delete();
}
