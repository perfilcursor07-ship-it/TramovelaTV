import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settings', (t) => {
    t.string('key', 80).primary();
    t.text('value').nullable();
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex('settings').insert([
    { key: 'site_name', value: 'TramaNovela TV' },
    { key: 'site_tagline', value: 'Micro novelas viciantes, episódios curtinhos.' },
    { key: 'paywall_badge', value: 'OFERTA ESPECIAL' },
    { key: 'paywall_title', value: 'Assista a novela completa' },
    { key: 'paywall_subtitle', value: 'Desbloqueie todos os episódios com um único pagamento.' },
    { key: 'paywall_cta', value: 'Desbloquear agora' },
    {
      key: 'paywall_benefits',
      value: 'Todos os episódios liberados\nAcesso vitalício\nPix aprovado na hora',
    },
    { key: 'support_whatsapp', value: '' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('settings');
}
