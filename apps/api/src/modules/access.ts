import { db } from '../db/knex';
import { AuthUser } from '../middleware/auth';
import { effectivePrice } from '../utils/http';

export async function hasNovelAccess(user: AuthUser | undefined, novelId: number) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const p = await db('purchases').where({ user_id: user.id, novel_id: novelId }).first('id');
  return !!p;
}

export const isFreeEpisode = (novel: { free_episodes: number }, ep: { number: number }) =>
  ep.number <= novel.free_episodes;

/** O episódio 1 bloqueado pode tocar uma prévia de alguns segundos. */
export const previewSecondsFor = (novel: { preview_seconds?: number | null }, ep: { number: number }) =>
  ep.number === 1 ? Number(novel.preview_seconds || 0) : 0;

/** Formato público de uma novela (sem dados internos) */
export function serializeNovel(n: any, extra: Record<string, unknown> = {}) {
  const promoActive =
    n.promo_price_cents != null && (!n.promo_ends_at || new Date(n.promo_ends_at).getTime() > Date.now());
  return {
    id: n.id,
    title: n.title,
    slug: n.slug,
    synopsis: n.synopsis,
    cover_url: n.cover_url,
    banner_url: n.banner_url,
    genre: n.genre,
    tags: n.tags ? String(n.tags).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    price_cents: n.price_cents,
    promo_price_cents: promoActive ? n.promo_price_cents : null,
    promo_ends_at: promoActive && n.promo_ends_at ? new Date(n.promo_ends_at).toISOString() : null,
    effective_price_cents: effectivePrice(n),
    free_episodes: n.free_episodes,
    preview_seconds: Number(n.preview_seconds ?? 0),
    featured: !!n.featured,
    views: n.views,
    episodes_count: n.episodes_count != null ? Number(n.episodes_count) : undefined,
    ...extra,
  };
}

/** Query base de novelas publicadas com contagem de episódios */
export function publishedNovelsQuery() {
  return db('novels as n')
    .where('n.status', 'published')
    .select('n.*')
    .select(db.raw('(select count(*) from episodes e where e.novel_id = n.id) as episodes_count'));
}
