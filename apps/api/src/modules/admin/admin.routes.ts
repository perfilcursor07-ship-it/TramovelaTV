import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex';
import { env } from '../../config/env';
import { adminOnly } from '../../middleware/auth';
import { publicImageUrl, removeLocalImage, removeVideo, upload } from '../../middleware/upload';
import { asyncHandler, HttpError, slugify, toInt } from '../../utils/http';
import { serializeNovel } from '../access';
import { publicUser } from '../auth/auth.routes';
import { ordersQuery, refreshOrder, serializeOrder, findOrder } from '../payments/orders.service';
import { saveSettings, SETTING_KEYS, getSettings } from '../settings.service';

export const adminRoutes = Router();
adminRoutes.use(adminOnly);

/* ------------------------------- Dashboard ------------------------------- */
adminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const one = async (q: any) => Number(Object.values((await q)[0] ?? {})[0] ?? 0);
    const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);

    const [revenue, paidOrders, pendingOrders, users, novels, episodes, comments] = await Promise.all([
      one(db('orders').where('status', 'paid').sum({ v: 'amount_cents' })),
      one(db('orders').where('status', 'paid').count({ v: '*' })),
      one(db('orders').where('status', 'pending').count({ v: '*' })),
      one(db('users').count({ v: '*' })),
      one(db('novels').count({ v: '*' })),
      one(db('episodes').count({ v: '*' })),
      one(db('comments').count({ v: '*' })),
    ]);

    const daily = await db('orders')
      .where('status', 'paid')
      .where('paid_at', '>=', since)
      .select(db.raw('DATE(paid_at) as day'))
      .sum({ total: 'amount_cents' })
      .count({ orders: '*' })
      .groupByRaw('DATE(paid_at)');
    const map = new Map(daily.map((d: any) => [new Date(d.day).toISOString().slice(0, 10), d]));
    const series = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(since.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const r: any = map.get(d);
      return { day: d, total_cents: Number(r?.total ?? 0), orders: Number(r?.orders ?? 0) };
    });

    const topNovels = await db('novels as n')
      .leftJoin('orders as o', function () {
        this.on('o.novel_id', 'n.id').andOn('o.status', db.raw('?', ['paid']));
      })
      .groupBy('n.id')
      .select('n.id', 'n.title', 'n.slug', 'n.cover_url', 'n.views')
      .count({ sales: 'o.id' })
      .sum({ revenue: 'o.amount_cents' })
      .orderBy('sales', 'desc')
      .orderBy('n.views', 'desc')
      .limit(5);

    const recent = await ordersQuery().orderBy('o.id', 'desc').limit(8);

    res.json({
      totals: { revenue_cents: revenue, paid_orders: paidOrders, pending_orders: pendingOrders, users, novels, episodes, comments },
      series,
      top_novels: topNovels.map((n: any) => ({ ...n, sales: Number(n.sales), revenue_cents: Number(n.revenue ?? 0) })),
      recent_orders: recent.map(serializeOrder),
    });
  }),
);

/* -------------------------------- Novelas -------------------------------- */
const novelSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título').max(160),
  slug: z.string().trim().max(170).optional(),
  synopsis: z.string().max(5000).optional().default(''),
  genre: z.string().trim().max(60).optional().default(''),
  tags: z.string().trim().max(255).optional().default(''),
  price_cents: z.coerce.number().int().min(100, 'Preço mínimo R$ 1,00'),
  promo_price_cents: z.union([z.literal(''), z.coerce.number().int().min(100)]).optional(),
  promo_ends_at: z.string().optional(),
  free_episodes: z.coerce.number().int().min(0).max(500),
  preview_seconds: z.coerce.number().int().min(0).max(600).optional().default(30),
  status: z.enum(['draft', 'published']),
  featured: z.union([z.boolean(), z.enum(['true', 'false', '1', '0'])]).optional(),
});

const novelFiles = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

async function uniqueSlug(base: string, ignoreId?: number) {
  let slug = slugify(base) || 'novela';
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const q = db('novels').where({ slug });
    if (ignoreId) q.whereNot({ id: ignoreId });
    if (!(await q.first('id'))) return slug;
    slug = `${slugify(base)}-${++i}`;
  }
}

function novelPayload(data: z.infer<typeof novelSchema>) {
  const promo = data.promo_price_cents === '' || data.promo_price_cents == null ? null : data.promo_price_cents;
  if (promo != null && promo >= data.price_cents) throw new HttpError(422, 'O preço promocional deve ser menor que o preço normal.');
  return {
    title: data.title,
    synopsis: data.synopsis || null,
    genre: data.genre || null,
    tags: data.tags || null,
    price_cents: data.price_cents,
    promo_price_cents: promo,
    promo_ends_at: promo != null && data.promo_ends_at ? new Date(data.promo_ends_at) : null,
    free_episodes: data.free_episodes,
    preview_seconds: data.preview_seconds,
    status: data.status,
    featured: data.featured === true || data.featured === 'true' || data.featured === '1',
  };
}

function adminNovel(n: any) {
  return {
    ...serializeNovel(n),
    status: n.status,
    raw_promo_price_cents: n.promo_price_cents,
    raw_promo_ends_at: n.promo_ends_at ? new Date(n.promo_ends_at).toISOString() : null,
    tags_text: n.tags || '',
    sales: n.sales != null ? Number(n.sales) : undefined,
    created_at: n.created_at,
  };
}

adminRoutes.get(
  '/novels',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const q = db('novels as n')
      .select('n.*')
      .select(db.raw('(select count(*) from episodes e where e.novel_id = n.id) as episodes_count'))
      .select(db.raw("(select count(*) from orders o where o.novel_id = n.id and o.status = 'paid') as sales"))
      .orderBy('n.id', 'desc');
    if (search) q.where('n.title', 'like', `%${search}%`);
    res.json({ data: (await q).map(adminNovel) });
  }),
);

adminRoutes.get(
  '/novels/:id',
  asyncHandler(async (req, res) => {
    const n = await db('novels').where({ id: toInt(req.params.id) }).first();
    if (!n) throw new HttpError(404, 'Novela não encontrada.');
    const episodes = await db('episodes').where({ novel_id: n.id }).orderBy('number');
    res.json({
      novel: adminNovel(n),
      episodes: episodes.map((e) => ({
        id: e.id,
        number: e.number,
        title: e.title,
        thumbnail_url: e.thumbnail_url,
        duration_seconds: e.duration_seconds,
        has_video: !!e.video_path,
        video_size: e.video_size ? Number(e.video_size) : null,
      })),
    });
  }),
);

adminRoutes.post(
  '/novels',
  novelFiles,
  asyncHandler(async (req, res) => {
    const data = novelSchema.parse(req.body);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const [id] = await db('novels').insert({
      ...novelPayload(data),
      slug: await uniqueSlug(data.slug || data.title),
      cover_url: publicImageUrl(files?.cover?.[0]) ?? null,
      banner_url: publicImageUrl(files?.banner?.[0]) ?? null,
    });
    res.status(201).json(adminNovel(await db('novels').where({ id }).first()));
  }),
);

adminRoutes.put(
  '/novels/:id',
  novelFiles,
  asyncHandler(async (req, res) => {
    const n = await db('novels').where({ id: toInt(req.params.id) }).first();
    if (!n) throw new HttpError(404, 'Novela não encontrada.');
    const data = novelSchema.parse(req.body);
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const upd: Record<string, unknown> = { ...novelPayload(data), updated_at: new Date() };
    if (data.slug && slugify(data.slug) !== n.slug) upd.slug = await uniqueSlug(data.slug, n.id);
    if (files?.cover?.[0]) {
      removeLocalImage(n.cover_url);
      upd.cover_url = publicImageUrl(files.cover[0]);
    }
    if (files?.banner?.[0]) {
      removeLocalImage(n.banner_url);
      upd.banner_url = publicImageUrl(files.banner[0]);
    }
    await db('novels').where({ id: n.id }).update(upd);
    res.json(adminNovel(await db('novels').where({ id: n.id }).first()));
  }),
);

adminRoutes.delete(
  '/novels/:id',
  asyncHandler(async (req, res) => {
    const n = await db('novels').where({ id: toInt(req.params.id) }).first();
    if (!n) throw new HttpError(404, 'Novela não encontrada.');
    const eps = await db('episodes').where({ novel_id: n.id });
    await db('novels').where({ id: n.id }).delete();
    eps.forEach((e) => {
      removeVideo(e.video_path);
      removeLocalImage(e.thumbnail_url);
    });
    removeLocalImage(n.cover_url);
    removeLocalImage(n.banner_url);
    res.status(204).end();
  }),
);

/* ------------------------------- Episódios ------------------------------- */
const episodeFiles = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

adminRoutes.post(
  '/novels/:id/episodes',
  episodeFiles,
  asyncHandler(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const video = files?.video?.[0];
    const thumb = files?.thumbnail?.[0];
    try {
      const n = await db('novels').where({ id: toInt(req.params.id) }).first();
      if (!n) throw new HttpError(404, 'Novela não encontrada.');
      let number = toInt(req.body.number, 0);
      if (!number) {
        const max = await db('episodes').where({ novel_id: n.id }).max({ m: 'number' });
        number = Number(max[0].m ?? 0) + 1;
      }
      if (await db('episodes').where({ novel_id: n.id, number }).first('id')) {
        throw new HttpError(409, `Já existe o episódio ${number}.`);
      }
      const [id] = await db('episodes').insert({
        novel_id: n.id,
        number,
        title: String(req.body.title || `Episódio ${number}`).slice(0, 160),
        duration_seconds: toInt(req.body.duration_seconds, 0) || null,
        video_path: video?.filename ?? null,
        video_mime: video?.mimetype ?? null,
        video_size: video?.size ?? null,
        thumbnail_url: publicImageUrl(thumb) ?? null,
      });
      await db('novels').where({ id: n.id }).update({ updated_at: new Date() });
      res.status(201).json(await db('episodes').where({ id }).first('id', 'number', 'title'));
    } catch (e) {
      removeVideo(video?.filename);
      if (thumb) removeLocalImage(publicImageUrl(thumb));
      throw e;
    }
  }),
);

adminRoutes.put(
  '/episodes/:id',
  episodeFiles,
  asyncHandler(async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const video = files?.video?.[0];
    const thumb = files?.thumbnail?.[0];
    const ep = await db('episodes').where({ id: toInt(req.params.id) }).first();
    if (!ep) {
      removeVideo(video?.filename);
      throw new HttpError(404, 'Episódio não encontrado.');
    }
    const upd: Record<string, unknown> = { updated_at: new Date() };
    if (req.body.title !== undefined) upd.title = String(req.body.title).slice(0, 160);
    if (req.body.number !== undefined) {
      const number = toInt(req.body.number);
      if (number !== ep.number && (await db('episodes').where({ novel_id: ep.novel_id, number }).first('id'))) {
        removeVideo(video?.filename);
        throw new HttpError(409, `Já existe o episódio ${number}.`);
      }
      upd.number = number;
    }
    if (req.body.duration_seconds) upd.duration_seconds = toInt(req.body.duration_seconds) || null;
    if (video) {
      removeVideo(ep.video_path);
      Object.assign(upd, { video_path: video.filename, video_mime: video.mimetype, video_size: video.size });
    }
    if (thumb) {
      removeLocalImage(ep.thumbnail_url);
      upd.thumbnail_url = publicImageUrl(thumb);
    }
    await db('episodes').where({ id: ep.id }).update(upd);
    res.json(await db('episodes').where({ id: ep.id }).first('id', 'number', 'title'));
  }),
);

adminRoutes.delete(
  '/episodes/:id',
  asyncHandler(async (req, res) => {
    const ep = await db('episodes').where({ id: toInt(req.params.id) }).first();
    if (!ep) throw new HttpError(404, 'Episódio não encontrado.');
    await db('episodes').where({ id: ep.id }).delete();
    removeVideo(ep.video_path);
    removeLocalImage(ep.thumbnail_url);
    res.status(204).end();
  }),
);

/* -------------------------------- Pedidos -------------------------------- */
adminRoutes.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const q = ordersQuery().orderBy('o.id', 'desc').limit(200);
    const status = String(req.query.status || '');
    if (status) q.where('o.status', status);
    const search = String(req.query.search || '').trim();
    if (search) q.where((w) => w.where('u.email', 'like', `%${search}%`).orWhere('u.name', 'like', `%${search}%`).orWhere('n.title', 'like', `%${search}%`));
    res.json({ data: (await q).map(serializeOrder) });
  }),
);

adminRoutes.post(
  '/orders/:id/refresh',
  asyncHandler(async (req, res) => {
    await refreshOrder(toInt(req.params.id));
    const o = await findOrder(toInt(req.params.id));
    if (!o) throw new HttpError(404, 'Pedido não encontrado.');
    res.json(serializeOrder(o));
  }),
);

/* -------------------------------- Usuários ------------------------------- */
adminRoutes.get(
  '/users',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const q = db('users as u')
      .select('u.*')
      .select(db.raw('(select count(*) from purchases p where p.user_id = u.id) as purchases'))
      .orderBy('u.id', 'desc')
      .limit(300);
    if (search) q.where((w) => w.where('u.name', 'like', `%${search}%`).orWhere('u.email', 'like', `%${search}%`));
    res.json({ data: (await q).map((u) => ({ ...publicUser(u), purchases: Number(u.purchases) })) });
  }),
);

adminRoutes.put(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    const { role } = z.object({ role: z.enum(['admin', 'user']) }).parse(req.body);
    if (id === req.user!.id && role !== 'admin') throw new HttpError(422, 'Você não pode remover seu próprio acesso de admin.');
    await db('users').where({ id }).update({ role, updated_at: new Date() });
    res.json({ ok: true });
  }),
);

/** Libera uma novela manualmente para um usuário (cortesia) */
adminRoutes.post(
  '/users/:id/grant',
  asyncHandler(async (req, res) => {
    const { novel_id } = z.object({ novel_id: z.coerce.number().int().positive() }).parse(req.body);
    await db('purchases')
      .insert({ user_id: toInt(req.params.id), novel_id, source: 'admin' })
      .onConflict(['user_id', 'novel_id'])
      .ignore();
    res.json({ ok: true });
  }),
);

/* ------------------------------ Comentários ------------------------------ */
adminRoutes.get(
  '/comments',
  asyncHandler(async (_req, res) => {
    const rows = await db('comments as c')
      .join('users as u', 'u.id', 'c.user_id')
      .join('episodes as e', 'e.id', 'c.episode_id')
      .join('novels as n', 'n.id', 'e.novel_id')
      .orderBy('c.id', 'desc')
      .limit(200)
      .select('c.id', 'c.body', 'c.created_at', 'u.name as user_name', 'u.email as user_email', 'e.number as episode_number', 'n.title as novel_title', 'n.slug as novel_slug');
    res.json({ data: rows });
  }),
);

/* ----------------------------- Configurações ----------------------------- */
adminRoutes.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    res.json({
      settings: await getSettings(),
      payment: {
        mode: env.pagbank.env,
        base_url: env.pagbank.env === 'mock' ? null : env.pagbank.baseUrl,
        token_configured: !!env.pagbank.token,
        webhook_url: env.publicApiUrl.startsWith('https://') ? `${env.publicApiUrl.replace(/\/$/, '')}/api/webhooks/pagbank` : null,
        pix_expiration_minutes: env.pagbank.pixExpirationMinutes,
      },
    });
  }),
);

adminRoutes.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const shape = Object.fromEntries(SETTING_KEYS.map((k) => [k, z.string().max(5000).optional()]));
    const data = z.object(shape).parse(req.body);
    res.json({ settings: await saveSettings(data as any) });
  }),
);
