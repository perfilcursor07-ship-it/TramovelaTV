import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Copy, Lock, PartyPopper, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiError, formatBRL, maskCpf, maskPhone, type Novel, type Order } from '@novelas/shared';
import { api, media } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Modal, Spinner, useCountdown } from './ui';

type Step = 'account' | 'form' | 'creating' | 'qr' | 'paid';

/**
 * Checkout Pix em um só lugar: cria a conta (se precisar), pede o CPF, mostra o QR
 * e confirma sozinho. kind = 'pack' (próximos episódios) ou 'full' (novela completa).
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
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const packEps = Math.min(novel.pack_episodes || 0, Math.max(0, totalEpisodes - unlockedUntil));
  const amount = kind === 'pack' ? novel.pack_price_cents : novel.effective_price_cents;
  const headline = kind === 'pack' ? `Liberar mais ${packEps} episódio${packEps > 1 ? 's' : ''}` : 'Novela completa';

  const create = async (withData: boolean) => {
    setError('');
    setStep('creating');
    try {
      const o = await api.orders.create(novel.id, withData ? cpf : undefined, withData ? phone : undefined, kind);
      if (withData && user) setUser({ ...user, cpf: cpf.replace(/\D/g, ''), phone: phone.replace(/\D/g, '') || user.phone });
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

  // ao abrir: sem conta → cria conta; sem CPF → formulário; senão gera o Pix direto
  useEffect(() => {
    if (!open) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    setError('');
    setOrderId(null);
    if (!user) {
      setStep('account');
      return;
    }
    setCpf(user.cpf ? maskCpf(user.cpf) : '');
    setPhone(user.phone ? maskPhone(user.phone) : '');
    if (user.cpf) create(false);
    else setStep('form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submitAccount = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = mode === 'signup' ? await register(acc.name, acc.email, acc.password) : await login(acc.email, acc.password);
      setCpf(u.cpf ? maskCpf(u.cpf) : '');
      setPhone(u.phone ? maskPhone(u.phone) : '');
      if (u.cpf) {
        // espera o token ser salvo antes de chamar a API
        setTimeout(() => create(false), 0);
      } else setStep('form');
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create(true);
  };

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

      {step === 'account' && (
        <form onSubmit={submitAccount} className="space-y-3">
          <p className="text-sm text-white/60">
            {mode === 'signup' ? 'Crie sua conta rapidinho para liberar os episódios.' : 'Entre na sua conta para continuar.'}
          </p>
          {mode === 'signup' && (
            <input className="input" placeholder="Seu nome" autoComplete="name" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} required />
          )}
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
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="btn-primary w-full py-3.5 text-base">
            {busy ? <Spinner className="h-5 w-5" /> : 'Continuar para o Pix'}
          </button>
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
        </form>
      )}

      {step === 'form' && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-white/60">O PagBank exige CPF para gerar o Pix. Pedimos só uma vez.</p>
          <div>
            <label className="label">CPF</label>
            <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} required />
          </div>
          <div>
            <label className="label">Celular (opcional)</label>
            <input className="input" inputMode="tel" placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
          </div>
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button className="btn-primary w-full py-3.5 text-base">
            <QrCode className="h-5 w-5" /> Gerar Pix de {formatBRL(amount)}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-white/40">
            <ShieldCheck className="h-3.5 w-3.5" /> Pagamento processado pelo PagBank
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
              <button onClick={() => create(false)} className="btn-primary w-full">
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
              ? `Os próximos ${packEps} episódios de “${novel.title}” já estão liberados.`
              : `Todos os episódios de “${novel.title}” já estão liberados.`}
          </p>
          <button onClick={finish} className="btn-primary mt-2 w-full py-3.5 text-base">
            Continuar assistindo
          </button>
        </div>
      )}

      {step !== 'paid' && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/30">
          <Lock className="h-3 w-3" /> Pagamento único via Pix · sem assinatura
        </p>
      )}
    </Modal>
  );
}
