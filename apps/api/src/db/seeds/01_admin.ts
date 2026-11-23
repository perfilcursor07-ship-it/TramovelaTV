import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

export async function seed(knex: Knex): Promise<void> {
  const { name, email, password } = env.seedAdmin;
  if (!password) {
    console.warn('SEED_ADMIN_PASSWORD vazio no .env — admin não criado.');
    return;
  }
  const exists = await knex('users').where({ email }).first();
  if (exists) {
    await knex('users').where({ id: exists.id }).update({ role: 'admin' });
    console.log(`Admin já existe (${email}).`);
    return;
  }
  await knex('users').insert({
    name,
    email,
    password_hash: await bcrypt.hash(password, 10),
    role: 'admin',
  });
  console.log(`Admin criado: ${email} (senha definida em SEED_ADMIN_PASSWORD no .env)`);
}
