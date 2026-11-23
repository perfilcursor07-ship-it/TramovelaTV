import path from 'path';
import knex, { Knex } from 'knex';
import { env } from '../config/env';

const isTs = __filename.endsWith('.ts');

export const knexConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: false,
  },
  pool: { min: 0, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'knex_migrations',
    extension: isTs ? 'ts' : 'js',
    loadExtensions: [isTs ? '.ts' : '.js'],
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    loadExtensions: [isTs ? '.ts' : '.js'],
  },
};

export const db = knex(knexConfig);
