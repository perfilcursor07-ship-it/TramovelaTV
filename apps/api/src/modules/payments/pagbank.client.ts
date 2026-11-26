import { env } from '../../config/env';

/**
 * Cliente mínimo da Orders API do PagBank para Pix.
 * Docs: https://developer.pagbank.com.br/reference/criar-pedido
 *
 * Fluxo: createPixOrder cria, extractQrCode lê o QR, getOrder + isOrderPaid confirmam.
 */

export interface PixCustomer {
  name: string;
  email: string;
  taxId: string; // CPF só números
  phone?: string; // DDD + número, só números
}

export interface CreatePixOrderInput {
  referenceId: string;
  description: string;
  amountCents: number;
  expiresAt: Date;
  customer: PixCustomer;
  notificationUrl?: string;
}

export class PagBankError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

async function call<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  if (!env.pagbank.token) throw new PagBankError('Token do PagBank não configurado no .env', 500, null);
  const res = await fetch(`${env.pagbank.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.pagbank.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const msg =
      json?.error_messages?.map((e: any) => `${e.parameter_name ?? ''} ${e.description ?? e.error ?? ''}`.trim()).join('; ') ||
      `PagBank respondeu ${res.status}`;
    throw new PagBankError(msg, res.status, json);
  }
  return json as T;
}

export async function createPixOrder(input: CreatePixOrderInput) {
  const phone = (input.customer.phone || '').replace(/\D/g, '');
  const payload: Record<string, unknown> = {
    reference_id: input.referenceId,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      tax_id: input.customer.taxId,
      ...(phone.length >= 10
        ? { phones: [{ country: '55', area: phone.slice(0, 2), number: phone.slice(2), type: 'MOBILE' }] }
        : {}),
    },
    items: [{ reference_id: input.referenceId, name: input.description, quantity: 1, unit_amount: input.amountCents }],
    // Pix na Orders API: o QR vem em qr_codes; quando é pago, o pedido ganha uma charge com status PAID
    qr_codes: [
      {
        amount: { value: input.amountCents },
        expiration_date: input.expiresAt.toISOString(),
      },
    ],
  };
  if (input.notificationUrl) payload.notification_urls = [input.notificationUrl];
  return call('POST', '/orders', payload);
}

export function extractQrCode(order: any): { text: string | null; imageUrl: string | null } {
  const sources = [order?.charges?.[0]?.qr_code, order?.charges?.[0], order?.qr_codes?.[0]].filter(Boolean);
  let text: string | null = null;
  let imageUrl: string | null = null;
  for (const s of sources) {
    text = text || s.text || null;
    const img = (s.links || []).find((l: any) => l.media === 'image/png');
    imageUrl = imageUrl || img?.href || null;
  }
  return { text, imageUrl };
}

export const getOrder = (id: string) => call('GET', `/orders/${encodeURIComponent(id)}`);

export const isOrderPaid = (order: any) =>
  Array.isArray(order?.charges) && order.charges.some((c: any) => c.status === 'PAID');
