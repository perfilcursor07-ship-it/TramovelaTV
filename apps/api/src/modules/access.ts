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

/**
 * Até qual episódio o usuário pode assistir inteiro.
 * full = comprou a novela completa (ou é admin). until = grátis + pacotes pagos.
 */
export async function getNovelAccess(user: AuthUser | undefined, novel: { id: number; free_episodes: number }) {
  const free = Number(novel.free_episodes || 0);
  if (!user) return { full: false, until: free };
  if (await hasNovelAccess(user, novel.id)) return { full: true, until: Number.MAX_SAFE_INTEGER };
  const u = await db('novel_unlocks').where({ user_id: user.id, novel_id: novel.id }).first('unlocked_until');
  return { full: false, until: Math.max(free, Number(u?.unlocked_until || 0)) };
}

/**
 * Só o primeiro episódio bloqueado (logo depois do que já está liberado) toca alguns segundos grátis.
 * O episódio pode ter um valor próprio; senão usa o padrão da novela.
 */
export const previewSecondsFor = (
  novel: { preview_seconds?: number | null },
  ep: { number: number; preview_seconds?: number | null },
  until: number,
) => (ep.number === until + 1 ? Number(ep.preview_seconds ?? novel.preview_seconds ?? 0) : 0);

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
    pack_episodes: Number(n.pack_episodes ?? 0),
    pack_price_cents: Number(n.pack_price_cents ?? 0),
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
