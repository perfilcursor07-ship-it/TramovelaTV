import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex';
import { env } from '../../config/env';
import { authRequired } from '../../middleware/auth';
import { asyncHandler, HttpError, isValidCpf, onlyDigits, toInt } from '../../utils/http';
import { createNovelOrder, findOrder, markOrderPaid, refreshOrder, serializeOrder } from './orders.service';

export const ordersRoutes = Router();

const createSchema = z.object({
  novel_id: z.coerce.number().int().positive(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
});

ordersRoutes.post(
  '/orders',
  authRequired,
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const updates: Record<string, string> = {};
    if (data.cpf) {
      if (!isValidCpf(data.cpf)) throw new HttpError(422, 'CPF inválido.', 'CPF_INVALID');
      updates.cpf = onlyDigits(data.cpf);
    }
    if (data.phone) {
      const p = onlyDigits(data.phone);
      if (p.length < 10 || p.length > 11) throw new HttpError(422, 'Celular inválido. Use DDD + número.');
      updates.phone = p;
    }
    if (Object.keys(updates).length) await db('users').where({ id: req.user!.id }).update(updates);

    const order = await createNovelOrder(req.user!.id, data.novel_id);
    res.status(201).json(serializeOrder(order));
  }),
);

async function ownOrder(req: any) {
  const order = await findOrder(toInt(req.params.id));
  if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) {
    throw new HttpError(404, 'Pedido não encontrado.');
  }
  return order;
}

/** O front consulta aqui a cada poucos segundos; se pendente, confirmamos no PagBank. */
ordersRoutes.get(
  '/orders/:id',
  authRequired,
  asyncHandler(async (req, res) => {
    const order = await ownOrder(req);
    if (order.status === 'pending') await refreshOrder(order.id);
    res.setHeader('Cache-Control', 'no-store');
    res.json(serializeOrder(await findOrder(order.id)));
  }),
);

/** Apenas no modo mock: simula o pagamento para testar o fluxo localmente. */
ordersRoutes.post(
  '/orders/:id/simulate-pay',
  authRequired,
  asyncHandler(async (req, res) => {
    if (env.pagbank.env !== 'mock') throw new HttpError(404, 'Indisponível.');
    const order = await ownOrder(req);
    if (order.status !== 'pending') throw new HttpError(400, 'Pedido não está pendente.');
    await markOrderPaid(order.id, { simulated: true });
    res.json(serializeOrder(await findOrder(order.id)));
  }),
);

/**
 * Webhook do PagBank. Responde 200 na hora e depois confirma consultando o PagBank.
 * (Só é chamado se PUBLIC_API_URL for HTTPS público.)
 */
ordersRoutes.post('/webhooks/pagbank', (req, res) => {
  res.status(200).json({ received: true });
  const providerId: string | undefined = req.body?.id;
  const reference: string | undefined = req.body?.reference_id;
  setImmediate(async () => {
    try {
      const q = db('orders');
      if (providerId) q.where({ provider_order_id: providerId });
      else if (reference) q.where({ reference_id: reference });
      else return;
      const order = await q.first('id');
      if (order) await refreshOrder(order.id);
    } catch (e) {
      console.error('[webhook pagbank]', e);
    }
  });
});
