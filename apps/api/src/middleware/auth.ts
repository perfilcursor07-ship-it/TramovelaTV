import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

export interface AuthUser {
  id: number;
  role: 'admin' | 'user';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, { expiresIn: '30d' });
}

function readUser(req: Request): AuthUser | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return undefined;
  try {
    const p = jwt.verify(h.slice(7), env.jwtSecret) as { sub: string; role: AuthUser['role'] };
    return { id: Number(p.sub), role: p.role };
  } catch {
    return undefined;
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  req.user = readUser(req);
  next();
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  req.user = readUser(req);
  if (!req.user) return next(new HttpError(401, 'Faça login para continuar.', 'UNAUTHENTICATED'));
  next();
}

export function adminOnly(req: Request, _res: Response, next: NextFunction) {
  req.user = req.user ?? readUser(req);
  if (!req.user) return next(new HttpError(401, 'Faça login para continuar.', 'UNAUTHENTICATED'));
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Acesso restrito ao administrador.'));
  next();
}
