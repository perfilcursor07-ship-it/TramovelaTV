import { Knex } from 'knex';

/**
 * Novelas de demonstração (sem vídeo) só para visualizar o layout.
 * Só roda se ainda não existir nenhuma novela. Apague pelo painel quando quiser.
 */
const demo = [
  { title: 'O Bilionário Disfarçado', genre: 'Romance', featured: true },
  { title: 'Vingança da Herdeira', genre: 'Drama', featured: true },
  { title: 'Casamento por Contrato', genre: 'Romance', featured: false },
  { title: 'A Rainha Renascida', genre: 'Fantasia', featured: true },
  { title: 'Segredos do CEO', genre: 'Romance', featured: false },
  { title: 'Destino Trocado', genre: 'Drama', featured: false },
  { title: 'Meu Ex é o Chefe', genre: 'Comédia', featured: false },
  { title: 'A Noiva do Lobo', genre: 'Fantasia', featured: false },
];

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function seed(knex: Knex): Promise<void> {
  const count = await knex('novels').count<{ c: number }[]>({ c: '*' });
  if (Number(count[0].c) > 0) return;

  for (const [i, n] of demo.entries()) {
    const slug = slugify(n.title);
    const [id] = await knex('novels').insert({
      title: n.title,
      slug,
      synopsis:
        'Uma história cheia de reviravoltas, segredos de família e um amor que ninguém esperava. Cada episódio termina num gancho que vai te deixar sem fôlego.',
      cover_url: `https://picsum.photos/seed/${slug}/600/900`,
      banner_url: `https://picsum.photos/seed/${slug}-b/1600/700`,
      genre: n.genre,
      tags: 'demo',
      price_cents: 2990,
      promo_price_cents: i % 2 === 0 ? 1490 : null,
      free_episodes: 0,
      status: 'published',
      featured: n.featured,
      views: 0,
    });
    const eps = Array.from({ length: 12 }, (_, k) => ({
      novel_id: id,
      number: k + 1,
      title: `Episódio ${k + 1}`,
    }));
    await knex('episodes').insert(eps);
  }
  console.log(`${demo.length} novelas de demonstração criadas.`);
}
