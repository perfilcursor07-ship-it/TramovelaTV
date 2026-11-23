import { db } from '../db/knex';
import { env } from '../config/env';

export const SETTING_KEYS = [
  'site_name',
  'site_tagline',
  'paywall_badge',
  'paywall_title',
  'paywall_subtitle',
  'paywall_cta',
  'paywall_benefits',
  'support_whatsapp',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

let cache: Record<string, string> | null = null;

export async function getSettings(): Promise<Record<string, string>> {
  if (cache) return cache;
  const rows = await db('settings').select('key', 'value');
  cache = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  return cache!;
}

export async function saveSettings(values: Partial<Record<SettingKey, string>>) {
  for (const key of SETTING_KEYS) {
    if (values[key] === undefined) continue;
    await db('settings')
      .insert({ key, value: values[key], updated_at: new Date() })
      .onConflict('key')
      .merge();
  }
  cache = null;
  return getSettings();
}

export async function publicSettings() {
  const s = await getSettings();
  return {
    ...s,
    paywall_benefits: (s.paywall_benefits || '').split('\n').map((x) => x.trim()).filter(Boolean),
    payment_mode: env.pagbank.env,
  };
}
