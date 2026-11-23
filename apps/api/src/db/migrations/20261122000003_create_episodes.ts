import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('episodes', (t) => {
    t.increments('id').primary();
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.integer('number').unsigned().notNullable();
    t.string('title', 160).nullable();
    t.string('video_path', 255).nullable(); // caminho privado dentro de storage/videos
    t.string('video_mime', 60).nullable();
    t.bigInteger('video_size').unsigned().nullable();
    t.string('thumbnail_url', 255).nullable();
    t.integer('duration_seconds').unsigned().nullable();
    t.timestamps(true, true);
    t.unique(['novel_id', 'number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('episodes');
}
