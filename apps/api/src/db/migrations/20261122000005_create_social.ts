import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('episode_likes', (t) => {
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('episode_id').unsigned().notNullable().references('id').inTable('episodes').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['user_id', 'episode_id']);
  });

  await knex.schema.createTable('comments', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('episode_id').unsigned().notNullable().references('id').inTable('episodes').onDelete('CASCADE');
    t.string('body', 1000).notNullable();
    t.timestamps(true, true);
    t.index(['episode_id', 'created_at']);
  });

  await knex.schema.createTable('favorites', (t) => {
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['user_id', 'novel_id']);
  });

  await knex.schema.createTable('watch_progress', (t) => {
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('episode_id').unsigned().notNullable().references('id').inTable('episodes').onDelete('CASCADE');
    t.integer('novel_id').unsigned().notNullable().references('id').inTable('novels').onDelete('CASCADE');
    t.integer('seconds').unsigned().notNullable().defaultTo(0);
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    t.primary(['user_id', 'episode_id']);
    t.index(['user_id', 'updated_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('watch_progress');
  await knex.schema.dropTableIfExists('favorites');
  await knex.schema.dropTableIfExists('comments');
  await knex.schema.dropTableIfExists('episode_likes');
}
