import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Copy, Lock, PartyPopper, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiError, formatBRL, maskCpf, type Novel, type Order, type User } from '@novelas/shared';
import { api, media } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Modal, Spinner, useCountdown } from './ui';

type Step = 'form' | 'creating' | 'qr' | 'paid';

/** Validação de CPF no navegador (evita criar a conta e só depois descobrir o erro). */
function cpfOk(v: string) {
  const d = v.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/**
 * Checkout Pix em uma tela só: primeiro nome, e-mail, senha e CPF → QR code na hora.
 * Quem já tem conta com CPF vai direto para o QR. kind = 'pack' (próximos episódios) ou 'full'.
 */
export default function CheckoutModal({
  novel,
  kind = 'full',
  unlockedUntil = 0,
  totalEpisodes = novel.episodes_count ?? 0,
  open,
  onClose,
  onPaid,
}: {
  novel: Novel;
  kind?: 'full' | 'pack';
  unlockedUntil?: number;
  totalEpisodes?: number;
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const { user, setUser, register, login } = useAuth();
  const settings = useSettings();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [acc, setAcc] = useState({ name: '', email: '', password: '' });
  const [cpf, setCpf] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const packEps = novel.pack_episodes || 0;
  const amount = kind === 'pack' ? novel.pack_price_cents : novel.effective_price_cents;
  const headline = kind === 'pack' ? `Mais ${packEps} episódio${packEps > 1 ? 's' : ''}` : 'Novela completa';

  const needCpf = !user?.cpf && !(mode === 'login' && !user);
  const needAccount = !user;

  /** Gera o Pix. cpfDigits só quando o usuário acabou de informar. */
  const create = async (cpfDigits?: string, who?: User | null) => {
    setError('');
    setStep('creating');
    try {
      const o = await api.orders.create(novel.id, cpfDigits, undefined, kind);
      const u = who ?? user;
      if (cpfDigits && u) setUser({ ...u, cpf: cpfDigits });
      qc.setQueryData(['order', o.id], o);
      setOrderId(o.id);
      setStep(o.status === 'paid' ? 'paid' : 'qr');
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'ALREADY_OWNED') {
        setStep('paid');
        return;
      }
      setStep('form');
      setError(err.message);
    }
  };

  // ao abrir: quem já tem conta com CPF vai direto para o QR
  useEffect(() => {
    if (!open) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    setError('');
    setOrderId(null);
    if (user?.cpf) create();
    else setStep('form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = cpf.replace(/\D/g, '');
    if (needCpf && !cpfOk(digits)) {
      setError('CPF inválido. Confira os números.');
      return;
    }
    setBusy(true);
    try {
      let u: User | null = user;
      if (needAccount) {
        u = mode === 'signup' ? await register(acc.name.trim(), acc.email, acc.password) : await login(acc.email, acc.password);
      }
      if (u?.cpf) await create(undefined, u);
      else if (digits) await create(digits, u);
      else setStep('form'); // entrou numa conta sem CPF: o campo aparece agora
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.orders.get(orderId!),
    enabled: open && !!orderId && step === 'qr',
    refetchInterval: (q) => ((q.state.data as Order | undefined)?.status === 'pending' ? 4000 : false),
  });

  useEffect(() => {
    if (order?.status === 'paid' && step !== 'paid') {
      setStep('paid');
      qc.invalidateQueries({ queryKey: ['novel'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);

  const left = useCountdown(order?.status === 'pending' ? order.expires_at : null);

  const copy = async () => {
    if (!order?.qr_text) return;
    try {
      await navigator.clipboard.writeText(order.qr_text);
      toast.success('Código Pix copiado!');
    } catch {
      toast.error('Não foi possível copiar. Selecione o código manualmente.');
    }
  };

  const simulate = async () => {
    if (!orderId) return;
    await api.orders.simulatePay(orderId);
    qc.invalidateQueries({ queryKey: ['order', orderId] });
  };

  const finish = () => {
    onClose();
    onPaid?.();
  };

  return (
    <Modal open={open} onClose={step === 'paid' ? finish : onClose}>
      <div className="mb-5 flex items-center gap-3 pr-8">
        {novel.cover_url && <img src={media(novel.cover_url)} alt="" className="h-16 w-12 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">{headline}</p>
          <h3 className="truncate font-bold">{novel.title}</h3>
          <p className="text-lg font-extrabold">{formatBRL(amount)}</p>
        </div>
      </div>

      {step === 'form' && (
        <form onSubmit={submit} className="space-y-3">
          {needAccount && mode === 'signup' && (
            <input
              className="input"
              placeholder="Primeiro nome"
              autoComplete="given-name"
              value={acc.name}
              onChange={(e) => setAcc({ ...acc, name: e.target.value })}
              required
              minLength={2}
            />
          )}
          {needAccount && (
            <>
              <input className="input" type="email" placeholder="E-mail" autoComplete="email" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} required />
              <input
                className="input"
                type="password"
                placeholder={mode === 'signup' ? 'Crie uma senha (mín. 6)' : 'Senha'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 6 : 1}
                value={acc.password}
                onChange={(e) => setAcc({ ...acc, password: e.target.value })}
                required
              />
            </>
          )}
          {needCpf && (
            <div>
              <input className="input" inputMode="numeric" placeholder="CPF" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} required />
              <p className="mt-1 text-[11px] text-white/40">Exigido pelo PagBank para gerar o Pix. Pedimos só uma vez.</p>
            </div>
          )}
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="btn-primary w-full py-4 text-base font-extrabold">
            {busy ? <Spinner className="h-5 w-5" /> : <><QrCode className="h-5 w-5" /> Gerar Pix de {formatBRL(amount)}</>}
          </button>
          {needAccount && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setError('');
              }}
              className="w-full text-center text-sm text-white/50 hover:text-white"
            >
              {mode === 'signup' ? 'Já tenho conta' : 'Criar uma conta nova'}
            </button>
          )}
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35">
            <ShieldCheck className="h-3.5 w-3.5" /> Pagamento seguro pelo PagBank
          </p>
        </form>
      )}

      {step === 'creating' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-white/60">Gerando seu Pix...</p>
        </div>
      )}

      {step === 'qr' && order && (
        <div className="space-y-4 text-center">
          {order.status === 'pending' ? (
            <>
              <div className="mx-auto w-fit rounded-2xl bg-white p-3">
                {order.qr_image ? (
                  <img src={order.qr_image} alt="QR Code Pix" className="h-52 w-52" />
                ) : (
                  <div className="grid h-52 w-52 place-items-center text-ink-900">QR indisponível</div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-amber-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                Aguardando pagamento
                {left && !left.done && (
                  <span className="font-mono text-white/50">
                    · {String(left.m + left.h * 60).padStart(2, '0')}:{String(left.s).padStart(2, '0')}
                  </span>
                )}
              </div>
              <button onClick={copy} className="btn-primary w-full py-3.5 text-base">
                <Copy className="h-5 w-5" /> Copiar código Pix
              </button>
              <div className="rounded-xl bg-ink-800 p-3 text-left">
                <p className="label">Pix copia e cola</p>
                <p className="line-clamp-3 break-all font-mono text-[11px] leading-relaxed text-white/70">{order.qr_text}</p>
              </div>
              <p className="text-xs text-white/50">Pague no app do seu banco. A liberação é automática em segundos.</p>
              {settings.payment_mode === 'mock' && (
                <button onClick={simulate} className="btn-outline w-full border-dashed text-amber-300">
                  Simular pagamento (modo de teste)
                </button>
              )}
            </>
          ) : (
            <div className="space-y-4 py-6">
              <p className="text-white/70">Este Pix expirou.</p>
              <button onClick={() => create()} className="btn-primary w-full">
                <RefreshCw className="h-4 w-4" /> Gerar novo Pix
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'paid' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center animate-float-up">
          <div className="relative">
            <CheckCircle2 className="h-20 w-20 text-emerald-400" />
            <PartyPopper className="absolute -right-6 -top-2 h-8 w-8 text-gold" />
          </div>
          <h3 className="text-2xl font-extrabold">Liberado!</h3>
          <p className="text-sm text-white/60">
            {kind === 'pack'
              ? `Mais ${packEps} episódios de “${novel.title}” foram liberados na sua conta.`
              : `Todos os episódios de “${novel.title}” foram liberados na sua conta.`}
          </p>
          <button onClick={finish} className="btn-primary mt-2 w-full py-3.5 text-base">
            Continuar assistindo
          </button>
        </div>
      )}

      {step !== 'paid' && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/30">
          <Lock className="h-3 w-3" /> Pagamento único via Pix · sem assinatura
        </p>
      )}
    </Modal>
  );
}
