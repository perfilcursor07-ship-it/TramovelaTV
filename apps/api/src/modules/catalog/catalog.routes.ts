import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/knex';
import { env } from '../../config/env';
import { authOptional } from '../../middleware/auth';
import { asyncHandler, HttpError, toInt } from '../../utils/http';
import { hasNovelAccess, isFreeEpisode, previewSecondsFor, publishedNovelsQuery, serializeNovel } from '../access';
import { publicSettings } from '../settings.service';

export const catalogRoutes = Router();

catalogRoutes.get(
  '/settings/public',
  asyncHandler(async (_req, res) => {
    res.json(await publicSettings());
  }),
);

catalogRoutes.get(
  '/home',
  authOptional,
  asyncHandler(async (req, res) => {
    const [featured, trending, latest] = await Promise.all([
      publishedNovelsQuery().where('n.featured', true).orderBy('n.updated_at', 'desc').limit(8),
      publishedNovelsQuery().orderBy('n.views', 'desc').limit(16),
      publishedNovelsQuery().orderBy('n.created_at', 'desc').limit(16),
    ]);

    const genresRows = await db('novels')
      .where('status', 'published')
      .whereNotNull('genre')
      .distinct('genre')
      .orderBy('genre');
    const byGenre = await Promise.all(
      genresRows.map(async (g) => ({
        genre: g.genre as string,
        novels: (await publishedNovelsQuery().where('n.genre', g.genre).orderBy('n.views', 'desc').limit(16)).map((n) =>
          serializeNovel(n),
        ),
      })),
    );

    let continueWatching: unknown[] = [];
    if (req.user) {
      const rows = await db('watch_progress as w')
        .join('episodes as e', 'e.id', 'w.episode_id')
        .join('novels as n', 'n.id', 'w.novel_id')
        .where('w.user_id', req.user.id)
        .where('n.status', 'published')
        .orderBy('w.updated_at', 'desc')
        .select('n.*', 'e.number as last_episode', 'w.updated_at as watched_at')
        .limit(40);
      const seen = new Set<number>();
      continueWatching = rows
        .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
        .slice(0, 12)
        .map((r) => serializeNovel(r, { last_episode: r.last_episode }));
    }

    res.json({
      featured: (featured.length ? featured : trending.slice(0, 5)).map((n) => serializeNovel(n)),
      trending: trending.map((n) => serializeNovel(n)),
      latest: latest.map((n) => serializeNovel(n)),
      genres: byGenre.filter((g) => g.novels.length),
      continue_watching: continueWatching,
    });
  }),
);

catalogRoutes.get(
  '/novels',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const genre = String(req.query.genre || '').trim();
    const page = Math.max(1, toInt(req.query.page, 1));
    const perPage = 24;
    const q = publishedNovelsQuery();
    if (search) q.where((w) => w.where('n.title', 'like', `%${search}%`).orWhere('n.tags', 'like', `%${search}%`));
    if (genre) q.where('n.genre', genre);
    const rows = await q
      .orderBy('n.views', 'desc')
      .limit(perPage + 1)
      .offset((page - 1) * perPage);
    const genres = (await db('novels').where('status', 'published').whereNotNull('genre').distinct('genre').orderBy('genre')).map(
      (g) => g.genre,
    );
    res.json({
      data: rows.slice(0, perPage).map((n) => serializeNovel(n)),
      has_more: rows.length > perPage,
      page,
      genres,
    });
  }),
);

catalogRoutes.get(
  '/novels/:slug',
  authOptional,
  asyncHandler(async (req, res) => {
    const novel = await db('novels').where({ slug: req.params.slug }).first();
    if (!novel || (novel.status !== 'published' && req.user?.role !== 'admin')) {
      throw new HttpError(404, 'Novela não encontrada.');
    }
    const access = await hasNovelAccess(req.user, novel.id);

    const episodes = await db('episodes as e')
      .where('e.novel_id', novel.id)
      .orderBy('e.number')
      .select('e.id', 'e.number', 'e.title', 'e.thumbnail_url', 'e.duration_seconds', db.raw('e.video_path is not null as has_video'))
      .select(db.raw('(select count(*) from episode_likes l where l.episode_id = e.id) as likes_count'))
      .select(db.raw('(select count(*) from comments c where c.episode_id = e.id) as comments_count'));

    let liked = new Set<number>();
    let favorite = false;
    let lastEpisode: number | null = null;
    if (req.user) {
      const ids = episodes.map((e) => e.id);
      if (ids.length) {
        liked = new Set(
          (await db('episode_likes').where('user_id', req.user.id).whereIn('episode_id', ids).select('episode_id')).map(
            (r) => r.episode_id,
          ),
        );
      }
      favorite = !!(await db('favorites').where({ user_id: req.user.id, novel_id: novel.id }).first());
      const last = await db('watch_progress as w')
        .join('episodes as e', 'e.id', 'w.episode_id')
        .where({ 'w.user_id': req.user.id, 'w.novel_id': novel.id })
        .orderBy('w.updated_at', 'desc')
        .first('e.number');
      lastEpisode = last?.number ?? null;
    }

    const purchases = await db('purchases').where({ novel_id: novel.id }).count<{ c: number }[]>({ c: '*' });
    const totalLikes = episodes.reduce((s, e) => s + Number(e.likes_count), 0);

    await db('novels').where({ id: novel.id }).increment('views', 1);

    res.json({
      novel: serializeNovel(novel, {
        episodes_count: episodes.length,
        purchases_count: Number(purchases[0].c),
        likes_count: totalLikes,
        status: novel.status,
      }),
      has_access: access,
      favorite,
      last_episode: lastEpisode,
      episodes: episodes.map((e) => ({
        id: e.id,
        number: e.number,
        title: e.title,
        thumbnail_url: e.thumbnail_url,
        duration_seconds: e.duration_seconds,
        has_video: !!Number(e.has_video),
        free: isFreeEpisode(novel, e),
        locked: !access && !isFreeEpisode(novel, e),
        preview_seconds:
          !access && !isFreeEpisode(novel, e) && Number(e.has_video) ? previewSecondsFor(novel, e) : 0,
        likes_count: Number(e.likes_count),
        comments_count: Number(e.comments_count),
        liked: liked.has(e.id),
      })),
    });
  }),
);

/** Gera um link temporário e assinado para o vídeo (não expõe o arquivo) */
catalogRoutes.get(
  '/episodes/:id/stream',
  authOptional,
  asyncHandler(async (req, res) => {
    const ep = await db('episodes as e')
      .join('novels as n', 'n.id', 'e.novel_id')
      .where('e.id', toInt(req.params.id))
      .first('e.*', 'n.status as novel_status', 'n.free_episodes', 'n.preview_seconds');
    if (!ep || (ep.novel_status !== 'published' && req.user?.role !== 'admin')) {
      throw new HttpError(404, 'Episódio não encontrado.');
    }
    const free = isFreeEpisode({ free_episodes: ep.free_episodes }, ep);
    let preview = 0;
    if (!free && !(await hasNovelAccess(req.user, ep.novel_id))) {
      preview = previewSecondsFor(ep, ep);
      if (!preview) throw new HttpError(402, 'Episódio bloqueado. Desbloqueie a novela para continuar.', 'PAYWALL');
    }
    if (!ep.video_path) throw new HttpError(404, 'O vídeo deste episódio ainda não foi enviado.', 'NO_VIDEO');

    // pv = prévia: o servidor só entrega o trecho inicial do arquivo
    const token = jwt.sign({ eid: ep.id, uid: req.user?.id ?? 0, ...(preview ? { pv: preview } : {}) }, env.streamSecret, {
      expiresIn: `${preview ? 30 : env.streamTokenMinutes}m`,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ url: `/api/stream/${token}`, expires_in: env.streamTokenMinutes * 60, preview_seconds: preview || null });
  }),
);
