import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../db/knex';
import { adminOnly, authOptional, authRequired } from '../../middleware/auth';
import { asyncHandler, HttpError, toInt } from '../../utils/http';

export const reportsRoutes = Router();

export const REPORT_TYPES = ['video', 'audio', 'payment', 'account', 'other'] as const;

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

const reportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  message: z.string().trim().min(5, 'Conte um pouco mais sobre o problema').max(2000),
  contact: z.string().trim().max(160).optional().default(''),
  novel_slug: z.string().trim().max(170).optional().default(''),
  episode_number: z.coerce.number().int().positive().optional(),
  page_url: z.string().trim().max(500).optional().default(''),
});

/** Usuário (logado ou não) reporta um problema */
reportsRoutes.post(
  '/reports',
  limiter,
  authOptional,
  asyncHandler(async (req, res) => {
    const d = reportSchema.parse(req.body);
    if (!req.user && !d.contact) throw new HttpError(422, 'Informe um e-mail ou WhatsApp para respondermos.');
    const [id] = await db('reports').insert({
      user_id: req.user?.id ?? null,
      type: d.type,
      message: d.message,
      contact: d.contact || null,
      novel_slug: d.novel_slug || null,
      episode_number: d.episode_number ?? null,
      page_url: d.page_url || null,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    });
    res.status(201).json({ id });
  }),
);

/* ------------------------------ admin ------------------------------ */
reportsRoutes.get(
  '/admin/reports',
  authRequired,
  adminOnly,
  asyncHandler(async (req, res) => {
    const status = String(req.query.status || 'open');
    const q = db('reports as r')
      .leftJoin('users as u', 'u.id', 'r.user_id')
      .select('r.*', 'u.name as user_name', 'u.email as user_email')
      .orderBy('r.id', 'desc')
      .limit(200);
    if (status !== 'all') q.where('r.status', status);
    const rows = await q;
    const open = Number((await db('reports').where({ status: 'open' }).count<{ c: number }[]>({ c: '*' }))[0].c);
    res.json({ data: rows, open });
  }),
);

reportsRoutes.put(
  '/admin/reports/:id',
  authRequired,
  adminOnly,
  asyncHandler(async (req, res) => {
    const status = z.enum(['open', 'resolved']).parse(req.body?.status);
    await db('reports').where({ id: toInt(req.params.id) }).update({ status, updated_at: new Date() });
    res.json({ ok: true });
  }),
);
