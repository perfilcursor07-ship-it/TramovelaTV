import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../../db/knex';
import { env } from '../../config/env';
import { effectivePrice, HttpError } from '../../utils/http';
import { createPixOrder, extractQrCode, getOrder, isOrderPaid, PagBankError } from './pagbank.client';

export function serializeOrder(o: any) {
  return {
    id: o.id,
    reference_id: o.reference_id,
    novel_id: o.novel_id,
    novel_title: o.novel_title,
    novel_slug: o.novel_slug,
    novel_cover: o.novel_cover,
    kind: o.kind || 'full',
    episodes_unlocked: o.episodes_unlocked ?? null,
    user_name: o.user_name,
    user_email: o.user_email,
    amount_cents: o.amount_cents,
    status: o.status,
    provider_order_id: o.provider_order_id,
    qr_text: o.status === 'pending' ? o.qr_text : null,
    qr_image: o.status === 'pending' ? o.qr_image : null,
    expires_at: o.expires_at ? new Date(o.expires_at).toISOString() : null,
    paid_at: o.paid_at ? new Date(o.paid_at).toISOString() : null,
    created_at: o.created_at ? new Date(o.created_at).toISOString() : null,
  };
}

export function ordersQuery() {
  return db('orders as o')
    .join('novels as n', 'n.id', 'o.novel_id')
    .join('users as u', 'u.id', 'o.user_id')
    .select('o.*', 'n.title as novel_title', 'n.slug as novel_slug', 'n.cover_url as novel_cover', 'u.name as user_name', 'u.email as user_email');
}

export async function findOrder(id: number) {
  return ordersQuery().where('o.id', id).first();
}

/** Marca como pago e libera a novela. Idempotente: aviso repetido é ignorado. */
export async function markOrderPaid(orderId: number, payload?: unknown) {
  await db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).forUpdate().first();
    if (!order || order.status === 'paid') return;
    await trx('orders')
      .where({ id: orderId })
      .update({
        status: 'paid',
        paid_at: new Date(),
        updated_at: new Date(),
        ...(payload ? { provider_payload: JSON.stringify(payload) } : {}),
      });
    if (order.kind === 'pack') {
      // pacote: libera os próximos N episódios a partir do que o usuário já tem
      const novel = await trx('novels').where({ id: order.novel_id }).first('free_episodes');
      const cur = await trx('novel_unlocks').where({ user_id: order.user_id, novel_id: order.novel_id }).forUpdate().first();
      const base = Math.max(Number(novel?.free_episodes || 0), Number(cur?.unlocked_until || 0));
      const until = base + Number(order.episodes_unlocked || 0);
      if (cur) await trx('novel_unlocks').where({ id: cur.id }).update({ unlocked_until: until, updated_at: new Date() });
      else await trx('novel_unlocks').insert({ user_id: order.user_id, novel_id: order.novel_id, unlocked_until: until });
      return;
    }
    await trx('purchases')
      .insert({ user_id: order.user_id, novel_id: order.novel_id, order_id: order.id, source: 'order' })
      .onConflict(['user_id', 'novel_id'])
      .ignore();
  });
}

function notificationUrl() {
  const base = env.publicApiUrl.replace(/\/$/, '');
  return base.startsWith('https://') ? `${base}/api/webhooks/pagbank` : undefined;
}

function mockPixText(ref: string, amountCents: number) {
  return `00020126580014BR.GOV.BCB.PIX0136MOCK-${ref}5204000053039865406${(amountCents / 100).toFixed(2)}5802BR5913TRAMANOVELA6006PALMAS62070503***6304MOCK`;
}

export type OrderKind = 'full' | 'pack';

export async function createNovelOrder(userId: number, novelId: number, kind: OrderKind = 'full') {
  const user = await db('users').where({ id: userId }).first();
  const novel = await db('novels').where({ id: novelId, status: 'published' }).first();
  if (!user) throw new HttpError(401, 'Usuário inválido.');
  if (!novel) throw new HttpError(404, 'Novela não encontrada.');
  if (!user.cpf) throw new HttpError(422, 'Informe seu CPF para gerar o Pix.', 'CPF_REQUIRED');

  const owned = await db('purchases').where({ user_id: userId, novel_id: novelId }).first();
  if (owned) throw new HttpError(409, 'Você já tem acesso a esta novela.', 'ALREADY_OWNED');

  let amount = effectivePrice(novel);
  let episodesUnlocked: number | null = null;
  if (kind === 'pack') {
    const total = Number((await db('episodes').where({ novel_id: novelId }).count<{ c: number }[]>({ c: '*' }))[0].c);
    const cur = await db('novel_unlocks').where({ user_id: userId, novel_id: novelId }).first('unlocked_until');
    const until = Math.max(Number(novel.free_episodes || 0), Number(cur?.unlocked_until || 0));
    const left = total - until;
    if (!novel.pack_episodes || !novel.pack_price_cents) throw new HttpError(422, 'Esta novela não tem pacote de episódios.');
    if (left <= 0) throw new HttpError(409, 'Você já tem todos os episódios disponíveis. Novos episódios em breve!', 'ALREADY_OWNED');
    // o pacote vale sempre a quantidade cheia: se alguns episódios ainda não foram enviados,
    // eles já ficam liberados para quando subirem (quem pagou não paga de novo)
    episodesUnlocked = Number(novel.pack_episodes);
    amount = Number(novel.pack_price_cents);
  }

  // Reaproveita um Pix pendente ainda válido (evita gerar vários QR)
  const pending = await db('orders')
    .where({ user_id: userId, novel_id: novelId, status: 'pending', amount_cents: amount, kind })
    .where('expires_at', '>', new Date(Date.now() + 2 * 60 * 1000))
    .orderBy('id', 'desc')
    .first();
  if (pending) return (await findOrder(pending.id))!;

  const referenceId = `nov${novelId}-u${userId}-${crypto.randomBytes(4).toString('hex')}`;
  const expiresAt = new Date(Date.now() + env.pagbank.pixExpirationMinutes * 60 * 1000);
  const description = (kind === 'pack' ? `+${episodesUnlocked} episódios: ${novel.title}` : `Novela: ${novel.title}`).slice(0, 64);

  let providerOrderId: string;
  let qrText: string | null;
  let qrImage: string | null;
  let raw: unknown = null;

  if (env.pagbank.env === 'mock') {
    providerOrderId = `MOCK_${referenceId}`;
    qrText = mockPixText(referenceId, amount);
    qrImage = await QRCode.toDataURL(qrText, { margin: 1, width: 320 });
  } else {
    try {
      const order = await createPixOrder({
        referenceId,
        description,
        amountCents: amount,
        expiresAt,
        customer: { name: user.name, email: user.email, taxId: user.cpf, phone: user.phone || undefined },
        notificationUrl: notificationUrl(),
      });
      raw = order;
      providerOrderId = order.id;
      const qr = extractQrCode(order);
      qrText = qr.text;
      qrImage = qr.imageUrl;
      if (!qrText) throw new HttpError(502, 'O PagBank não retornou o código Pix.');
      if (!qrImage) qrImage = await QRCode.toDataURL(qrText, { margin: 1, width: 320 });
    } catch (e) {
      if (e instanceof PagBankError) {
        console.error('[PagBank] erro ao criar pedido:', e.status, JSON.stringify(e.body));
        throw new HttpError(502, `Não foi possível gerar o Pix: ${e.message}`);
      }
      throw e;
    }
  }

  const [id] = await db('orders').insert({
    reference_id: referenceId,
    user_id: userId,
    novel_id: novelId,
    kind,
    episodes_unlocked: episodesUnlocked,
    amount_cents: amount,
    status: 'pending',
    provider: 'pagbank',
    provider_order_id: providerOrderId,
    qr_text: qrText,
    qr_image: qrImage,
    expires_at: expiresAt,
    provider_payload: raw ? JSON.stringify(raw) : null,
  });
  return (await findOrder(id))!;
}

/** Consulta o PagBank e atualiza o status local. Nunca confia só no corpo do webhook. */
export async function refreshOrder(orderId: number) {
  const order = await db('orders').where({ id: orderId }).first();
  if (!order || order.status !== 'pending') return order;

  if (env.pagbank.env !== 'mock' && order.provider_order_id && !order.provider_order_id.startsWith('MOCK_')) {
    try {
      const remote = await getOrder(order.provider_order_id);
      if (isOrderPaid(remote)) {
        await markOrderPaid(order.id, remote);
        return db('orders').where({ id: orderId }).first();
      }
    } catch (e) {
      console.error('[PagBank] erro ao consultar pedido', order.provider_order_id, (e as Error).message);
    }
  }

  if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
    await db('orders').where({ id: orderId, status: 'pending' }).update({ status: 'expired', updated_at: new Date() });
  }
  return db('orders').where({ id: orderId }).first();
}
