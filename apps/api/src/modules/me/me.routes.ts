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
    const [library, favorites, orders, comments] = await Promise.all([
      count('purchases'),
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
    const rows = await publishedNovelsQuery()
      .join('purchases as p', 'p.novel_id', 'n.id')
      .where('p.user_id', req.user!.id)
      .orderBy('p.created_at', 'desc')
      .select('p.created_at as purchased_at');
    res.json({ data: rows.map((n) => serializeNovel(n, { purchased_at: n.purchased_at })) });
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
