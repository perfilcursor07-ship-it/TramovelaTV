import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../db/knex';
import { authRequired } from '../../middleware/auth';
import { asyncHandler, HttpError, isValidCpf, onlyDigits } from '../../utils/http';
import { publishedNovelsQuery, serializeNovel } from '../access';
import { ordersQuery, serializeOrder } from '../payments/orders.service';
import { publicUser } from '../auth/auth.routes';

export const meRoutes = Router();
meRoutes.use(authRequired);

meRoutes.get(
  '/me/summary',
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const count = async (table: string) =>
      Number((await db(table).where({ user_id: uid }).count<{ c: number }[]>({ c: '*' }))[0].c);
    // novelas completas + novelas liberadas só por pacote (sem contar duas vezes)
    const libraryCount = async (id: number) => {
      const full = await count('purchases');
      const packs = await db('novel_unlocks')
        .where('user_id', id)
        .whereNotIn('novel_id', db('purchases').where('user_id', id).select('novel_id'))
        .count<{ c: number }[]>({ c: '*' });
      return full + Number(packs[0].c);
    };
    const [library, favorites, orders, comments] = await Promise.all([
      libraryCount(uid),
      count('favorites'),
      count('orders'),
      count('comments'),
    ]);
    res.json({ library, favorites, orders, comments });
  }),
);

meRoutes.get(
  '/me/library',
  asyncHandler(async (req, res) => {
    const uid = req.user!.id;
    const lastEp = db.raw(
      `(select e.number from watch_progress w join episodes e on e.id = w.episode_id
        where w.user_id = ? and w.novel_id = n.id order by w.updated_at desc limit 1) as last_episode`,
      [uid],
    );
    // novela completa (compra) + novelas liberadas por pacote
    const full = await publishedNovelsQuery()
      .join('purchases as p', 'p.novel_id', 'n.id')
      .where('p.user_id', uid)
      .select('p.created_at as unlocked_at', lastEp);
    const packs = await publishedNovelsQuery()
      .join('novel_unlocks as u', 'u.novel_id', 'n.id')
      .where('u.user_id', uid)
      .select('u.updated_at as unlocked_at', 'u.unlocked_until', lastEp);

    const byId = new Map<number, any>();
    for (const n of full) byId.set(n.id, { ...n, full_access: true, unlocked_until: null });
    for (const n of packs) if (!byId.has(n.id)) byId.set(n.id, { ...n, full_access: false });
    const rows = [...byId.values()].sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

    res.json({
      data: rows.map((n) =>
        serializeNovel(n, {
          purchased_at: n.unlocked_at,
          full_access: n.full_access,
          unlocked_until: n.full_access ? null : Math.max(Number(n.free_episodes || 0), Number(n.unlocked_until || 0)),
          last_episode: n.last_episode ?? undefined,
        }),
      ),
    });
  }),
);

meRoutes.get(
  '/me/favorites',
  asyncHandler(async (req, res) => {
    const rows = await publishedNovelsQuery()
      .join('favorites as f', 'f.novel_id', 'n.id')
      .where('f.user_id', req.user!.id)
      .orderBy('f.created_at', 'desc');
    res.json({ data: rows.map((n) => serializeNovel(n)) });
  }),
);

meRoutes.get(
  '/me/orders',
  asyncHandler(async (req, res) => {
    const rows = await ordersQuery().where('o.user_id', req.user!.id).orderBy('o.id', 'desc').limit(100);
    res.json({ data: rows.map(serializeOrder) });
  }),
);

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  cpf: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'A nova senha precisa de 6+ caracteres').max(100).optional(),
});

meRoutes.put(
  '/me/profile',
  asyncHandler(async (req, res) => {
    const data = profileSchema.parse(req.body);
    const user = await db('users').where({ id: req.user!.id }).first();
    const upd: Record<string, unknown> = { updated_at: new Date() };
    if (data.name) upd.name = data.name;
    if (data.cpf !== undefined) {
      if (data.cpf && !isValidCpf(data.cpf)) throw new HttpError(422, 'CPF inválido.');
      upd.cpf = data.cpf ? onlyDigits(data.cpf) : null;
    }
    if (data.phone !== undefined) upd.phone = data.phone ? onlyDigits(data.phone) : null;
    if (data.new_password) {
      if (!data.current_password || !(await bcrypt.compare(data.current_password, user.password_hash))) {
        throw new HttpError(422, 'Senha atual incorreta.');
      }
      upd.password_hash = await bcrypt.hash(data.new_password, 10);
    }
    await db('users').where({ id: user.id }).update(upd);
    res.json({ user: publicUser(await db('users').where({ id: user.id }).first()) });
  }),
);
