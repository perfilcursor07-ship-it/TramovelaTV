import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex';
import { authRequired } from '../../middleware/auth';
import { asyncHandler, HttpError, toInt } from '../../utils/http';

export const socialRoutes = Router();

async function episodeOr404(id: number) {
  const ep = await db('episodes').where({ id }).first('id', 'novel_id');
  if (!ep) throw new HttpError(404, 'Episódio não encontrado.');
  return ep;
}

socialRoutes.post(
  '/episodes/:id/like',
  authRequired,
  asyncHandler(async (req, res) => {
    const ep = await episodeOr404(toInt(req.params.id));
    const where = { user_id: req.user!.id, episode_id: ep.id };
    const exists = await db('episode_likes').where(where).first();
    if (exists) await db('episode_likes').where(where).delete();
    else await db('episode_likes').insert(where);
    const [{ c }] = await db('episode_likes').where({ episode_id: ep.id }).count<{ c: number }[]>({ c: '*' });
    res.json({ liked: !exists, likes_count: Number(c) });
  }),
);

socialRoutes.post(
  '/novels/:id/favorite',
  authRequired,
  asyncHandler(async (req, res) => {
    const novelId = toInt(req.params.id);
    const where = { user_id: req.user!.id, novel_id: novelId };
    const exists = await db('favorites').where(where).first();
    if (exists) await db('favorites').where(where).delete();
    else await db('favorites').insert(where);
    res.json({ favorite: !exists });
  }),
);

socialRoutes.get(
  '/episodes/:id/comments',
  asyncHandler(async (req, res) => {
    const ep = await episodeOr404(toInt(req.params.id));
    const rows = await db('comments as c')
      .join('users as u', 'u.id', 'c.user_id')
      .where('c.episode_id', ep.id)
      .orderBy('c.created_at', 'desc')
      .limit(100)
      .select('c.id', 'c.body', 'c.created_at', 'c.user_id', 'u.name as user_name', 'u.avatar_url as user_avatar');
    res.json({ data: rows });
  }),
);

const commentSchema = z.object({ body: z.string().trim().min(1, 'Escreva algo').max(1000) });

socialRoutes.post(
  '/episodes/:id/comments',
  authRequired,
  asyncHandler(async (req, res) => {
    const ep = await episodeOr404(toInt(req.params.id));
    const { body } = commentSchema.parse(req.body);
    const [id] = await db('comments').insert({ user_id: req.user!.id, episode_id: ep.id, body });
    const row = await db('comments as c')
      .join('users as u', 'u.id', 'c.user_id')
      .where('c.id', id)
      .first('c.id', 'c.body', 'c.created_at', 'c.user_id', 'u.name as user_name', 'u.avatar_url as user_avatar');
    res.status(201).json(row);
  }),
);

socialRoutes.delete(
  '/comments/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const c = await db('comments').where({ id: toInt(req.params.id) }).first();
    if (!c) throw new HttpError(404, 'Comentário não encontrado.');
    if (c.user_id !== req.user!.id && req.user!.role !== 'admin') throw new HttpError(403, 'Sem permissão.');
    await db('comments').where({ id: c.id }).delete();
    res.status(204).end();
  }),
);

socialRoutes.post(
  '/episodes/:id/progress',
  authRequired,
  asyncHandler(async (req, res) => {
    const ep = await episodeOr404(toInt(req.params.id));
    const seconds = Math.max(0, toInt(req.body?.seconds));
    await db('watch_progress')
      .insert({ user_id: req.user!.id, episode_id: ep.id, novel_id: ep.novel_id, seconds, updated_at: new Date() })
      .onConflict(['user_id', 'episode_id'])
      .merge(['seconds', 'updated_at']);
    res.json({ ok: true });
  }),
);
