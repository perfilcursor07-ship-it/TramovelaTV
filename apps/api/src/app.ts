import fs from 'fs';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from './config/env';
import { HttpError } from './utils/http';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/catalog/catalog.routes';
import { streamRoutes } from './modules/stream/stream.routes';
import { socialRoutes } from './modules/social/social.routes';
import { meRoutes } from './modules/me/me.routes';
import { ordersRoutes } from './modules/payments/orders.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { reportsRoutes } from './modules/support/reports.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev', { skip: (req) => req.url.startsWith('/api/stream/') }));

  // Imagens públicas (capas, banners, thumbs). Vídeos NÃO ficam aqui.
  app.use('/uploads', express.static(env.paths.uploads, { maxAge: '7d', index: false }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, payment_mode: env.pagbank.env }));
  app.use('/api/auth', authRoutes);
  app.use('/api', catalogRoutes);
  app.use('/api', streamRoutes);
  app.use('/api', socialRoutes);
  app.use('/api', ordersRoutes);
  app.use('/api', reportsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', meRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

  // Em produção, serve o build do front (apps/web/dist) no mesmo domínio
  const webDist = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist, { index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(422).json({ message: err.issues[0]?.message || 'Dados inválidos.', issues: err.issues });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? `Arquivo muito grande (máx. ${env.maxVideoSizeMb} MB).` : err.message;
      return res.status(413).json({ message: msg });
    }
    console.error(err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  });

  return app;
}
