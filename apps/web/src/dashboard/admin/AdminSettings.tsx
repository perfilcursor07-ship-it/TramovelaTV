import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { CheckCircle2, CreditCard, Save, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

const fields: { key: string; label: string; textarea?: boolean; hint?: string }[] = [
  { key: 'site_name', label: 'Nome do site' },
  { key: 'site_tagline', label: 'Slogan' },
  { key: 'paywall_badge', label: 'Selo do paywall', hint: 'Ex.: OFERTA ESPECIAL, SÓ HOJE' },
  { key: 'paywall_title', label: 'Título do paywall' },
  { key: 'paywall_subtitle', label: 'Texto do paywall', textarea: true },
  { key: 'paywall_cta', label: 'Texto do botão' },
  { key: 'paywall_benefits', label: 'Benefícios (um por linha)', textarea: true },
  { key: 'support_whatsapp', label: 'WhatsApp de suporte', hint: 'Somente números com DDD' },
];

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'settings'], queryFn: api.admin.settings });
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setValues(data.settings);
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? '']));
      await api.admin.saveSettings(payload);
      toast.success('Configurações salvas');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !data) return <FullScreenLoader />;
  const p = data.payment;

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Textos do site e da tela de desbloqueio. O preço fica em cada novela." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={save} className="card space-y-4 p-6">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              {f.textarea ? (
                <textarea className="input min-h-[96px]" value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              ) : (
                <input className="input" value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              )}
              {f.hint && <p className="mt-1 text-xs text-white/40">{f.hint}</p>}
            </div>
          ))}
          <button disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>

        <div className="card h-fit space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <CreditCard className="h-5 w-5 text-brand-400" /> PagBank (Pix)
          </h2>
          <Row label="Ambiente">
            <span
              className={clsx(
                'chip',
                p.mode === 'production' ? 'bg-emerald-500/15 text-emerald-300' : p.mode === 'sandbox' ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300',
              )}
            >
              {p.mode === 'mock' ? 'Teste local (mock)' : p.mode}
            </span>
          </Row>
          {p.base_url && <Row label="API">{p.base_url}</Row>}
          <Row label="Token">
            {p.mode === 'mock' ? (
              <span className="text-white/40">não usado</span>
            ) : p.token_configured ? (
              <span className="flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-4 w-4" /> configurado</span>
            ) : (
              <span className="flex items-center gap-1 text-red-300"><XCircle className="h-4 w-4" /> ausente</span>
            )}
          </Row>
          <Row label="Webhook">
            {p.webhook_url ? <span className="break-all font-mono text-[11px]">{p.webhook_url}</span> : <span className="text-white/40">desativado (precisa de HTTPS público)</span>}
          </Row>
          <Row label="Validade do Pix">{p.pix_expiration_minutes} min</Row>
          <p className="rounded-xl bg-ink-800 p-3 text-xs leading-relaxed text-white/50">
            Credenciais ficam no arquivo <code className="text-white/80">apps/api/.env</code> (<code>PAGBANK_ENV</code>, <code>PAGBANK_TOKEN_SANDBOX</code>,{' '}
            <code>PAGBANK_TOKEN_PRODUCTION</code>). Sem webhook, o status é confirmado consultando o PagBank enquanto o cliente está na tela do QR.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-white/50">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
