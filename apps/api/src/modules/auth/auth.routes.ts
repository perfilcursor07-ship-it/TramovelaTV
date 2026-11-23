import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../db/knex';
import { authRequired, signToken } from '../../middleware/auth';
import { asyncHandler, HttpError } from '../../utils/http';

export const authRoutes = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

export function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    cpf: u.cpf,
    phone: u.phone,
    avatar_url: u.avatar_url,
    created_at: u.created_at,
  };
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(6, 'A senha precisa de pelo menos 6 caracteres').max(100),
});

authRoutes.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const exists = await db('users').where({ email: data.email }).first('id');
    if (exists) throw new HttpError(409, 'Este e-mail já está cadastrado.');
    const [id] = await db('users').insert({
      name: data.name,
      email: data.email,
      password_hash: await bcrypt.hash(data.password, 10),
      role: 'user',
    });
    const user = await db('users').where({ id }).first();
    res.status(201).json({ token: signToken({ id, role: 'user' }), user: publicUser(user) });
  }),
);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

authRoutes.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await db('users').where({ email: data.email }).first();
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      throw new HttpError(401, 'E-mail ou senha incorretos.');
    }
    res.json({ token: signToken({ id: user.id, role: user.role }), user: publicUser(user) });
  }),
);

authRoutes.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await db('users').where({ id: req.user!.id }).first();
    if (!user) throw new HttpError(401, 'Sessão inválida.', 'UNAUTHENTICATED');
    res.json({ user: publicUser(user) });
  }),
);
