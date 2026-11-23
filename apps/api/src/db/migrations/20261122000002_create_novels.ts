import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('novels', (t) => {
    t.increments('id').primary();
    t.string('title', 160).notNullable();
    t.string('slug', 180).notNullable().unique();
    t.text('synopsis').nullable();
    t.string('cover_url', 255).nullable();
    t.string('banner_url', 255).nullable();
    t.string('genre', 60).nullable().index();
    t.string('tags', 255).nullable();
    t.integer('price_cents').unsigned().notNullable().defaultTo(1990);
    t.integer('promo_price_cents').unsigned().nullable();
    t.dateTime('promo_ends_at').nullable();
    t.integer('free_episodes').unsigned().notNullable().defaultTo(3);
    t.enu('status', ['draft', 'published']).notNullable().defaultTo('draft').index();
    t.boolean('featured').notNullable().defaultTo(false);
    t.integer('views').unsigned().notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('novels');
}
