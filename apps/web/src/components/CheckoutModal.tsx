import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Copy, Lock, PartyPopper, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { ApiError, formatBRL, maskCpf, maskPhone, type Novel, type Order } from '@novelas/shared';
import { api, media } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Modal, PriceTag, Spinner, useCountdown } from './ui';

type Step = 'form' | 'creating' | 'qr' | 'paid';

export default function CheckoutModal({
  novel,
  open,
  onClose,
  onPaid,
}: {
  novel: Novel;
  open: boolean;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const { user, setUser } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('form');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  const create = async (withData?: boolean) => {
    setError('');
    setStep('creating');
    try {
      const o = await api.orders.create(novel.id, withData ? cpf : undefined, withData ? phone : undefined);
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
      if (err.code === 'CPF_REQUIRED' || err.code === 'CPF_INVALID') {
        setStep('form');
      } else setStep('form');
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!open) {
      started.current = false;
      return;
    }
    if (!user) {
      onClose();
      nav(`/entrar?next=${encodeURIComponent(window.location.pathname + '?comprar=1')}`);
      return;
    }
    if (started.current) return;
    started.current = true;
    setCpf(user.cpf ? maskCpf(user.cpf) : '');
    setPhone(user.phone ? maskPhone(user.phone) : '');
    if (user.cpf) create(false);
    else setStep('form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      onPaid?.();
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

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mb-5 flex items-center gap-3 pr-8">
        {novel.cover_url && <img src={media(novel.cover_url)} alt="" className="h-16 w-11 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Desbloquear novela completa</p>
          <h3 className="truncate font-bold">{novel.title}</h3>
          <PriceTag novel={novel} size="sm" />
        </div>
      </div>

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
            <QrCode className="h-5 w-5" /> Gerar Pix de {formatBRL(novel.effective_price_cents)}
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
                  <img src={order.qr_image} alt="QR Code Pix" className="h-56 w-56" />
                ) : (
                  <div className="grid h-56 w-56 place-items-center text-ink-900">QR indisponível</div>
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
                    · expira em {String(left.m + left.h * 60).padStart(2, '0')}:{String(left.s).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="rounded-xl bg-ink-800 p-3 text-left">
                <p className="label">Pix copia e cola</p>
                <p className="break-all font-mono text-[11px] leading-relaxed text-white/70">{order.qr_text}</p>
              </div>
              <button onClick={copy} className="btn-primary w-full py-3.5 text-base">
                <Copy className="h-5 w-5" /> Copiar código Pix
              </button>
              <ol className="space-y-1 text-left text-xs text-white/50">
                <li>1. Abra o app do seu banco e escolha Pix.</li>
                <li>2. Escaneie o QR ou cole o código.</li>
                <li>3. Pronto! A liberação é automática em segundos.</li>
              </ol>
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
          <h3 className="text-2xl font-extrabold">Novela desbloqueada!</h3>
          <p className="text-sm text-white/60">Todos os episódios de “{novel.title}” já estão liberados para você.</p>
          <button
            onClick={() => {
              onClose();
              onPaid?.();
            }}
            className="btn-primary mt-2 w-full py-3.5 text-base"
          >
            Continuar assistindo
          </button>
        </div>
      )}

      {step !== 'paid' && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-white/30">
          <Lock className="h-3 w-3" /> Acesso vitalício · pagamento único
        </p>
      )}
    </Modal>
  );
}
