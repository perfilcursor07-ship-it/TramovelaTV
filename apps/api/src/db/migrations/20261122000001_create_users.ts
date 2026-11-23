import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name', 120).notNullable();
    t.string('email', 180).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['admin', 'user']).notNullable().defaultTo('user');
    t.string('cpf', 14).nullable();
    t.string('phone', 20).nullable();
    t.string('avatar_url', 255).nullable();
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
