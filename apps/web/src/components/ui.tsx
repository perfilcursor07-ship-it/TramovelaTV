import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Play, X } from 'lucide-react';
import clsx from 'clsx';
import { discountPercent, formatBRL, type Novel } from '@novelas/shared';
import { useSettings } from '../lib/settings';

export function Logo({ className }: { className?: string }) {
  const s = useSettings();
  const [first, ...rest] = s.site_name.split(' ');
  return (
    <Link to="/" className={clsx('flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500">
        <Play className="h-3.5 w-3.5 fill-white text-white" />
      </span>
      <span className="text-base font-bold">
        {first}
        {rest.length > 0 && <span className="font-medium text-white/60"> {rest.join(' ')}</span>}
      </span>
    </Link>
  );
}

export const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={clsx('animate-spin text-brand-400', className ?? 'h-6 w-6')} />
);

export const FullScreenLoader = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <Spinner className="h-8 w-8" />
  </div>
);

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-white/30">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-white/50">{text}</p>}
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className={clsx(
          'relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-6 animate-float-up sm:max-w-md sm:rounded-3xl',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function PriceTag({ novel, size = 'md' }: { novel: Novel; size?: 'sm' | 'md' | 'lg' }) {
  const off = discountPercent(novel.price_cents, novel.promo_price_cents);
  return (
    <div className="flex items-baseline gap-2">
      <span className={clsx('font-extrabold', size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-xl' : 'text-sm')}>
        {formatBRL(novel.effective_price_cents)}
      </span>
      {off > 0 && (
        <>
          <span className={clsx('text-white/40 line-through', size === 'lg' ? 'text-lg' : 'text-xs')}>{formatBRL(novel.price_cents)}</span>
          <span className="chip bg-gold-gradient text-ink-950">-{off}%</span>
        </>
      )}
    </div>
  );
}

/** Contagem regressiva real até uma data (ex.: fim da promoção) */
export function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: diff === 0 };
}

export function CountdownBoxes({ target }: { target: string | null }) {
  const c = useCountdown(target);
  if (!c || c.done) return null;
  const parts = [
    ...(c.d > 0 ? [{ v: c.d, l: 'dias' }] : []),
    { v: c.h, l: 'h' },
    { v: c.m, l: 'min' },
    { v: c.s, l: 'seg' },
  ];
  return (
    <div className="flex items-center justify-center gap-1.5">
      {parts.map((p, i) => (
        <div key={i} className="min-w-[3rem] rounded-lg bg-black/50 px-2 py-1 text-center ring-1 ring-white/10">
          <div className="font-mono text-lg font-extrabold tabular-nums">{String(p.v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase text-white/50">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: ['Pago', 'bg-emerald-500/15 text-emerald-300'],
    pending: ['Pendente', 'bg-amber-500/15 text-amber-300'],
    expired: ['Expirado', 'bg-white/10 text-white/50'],
    canceled: ['Cancelado', 'bg-white/10 text-white/50'],
    failed: ['Falhou', 'bg-red-500/15 text-red-300'],
    published: ['Publicada', 'bg-emerald-500/15 text-emerald-300'],
    draft: ['Rascunho', 'bg-white/10 text-white/60'],
    admin: ['Admin', 'bg-brand-500/20 text-brand-400'],
    user: ['Usuário', 'bg-white/10 text-white/60'],
  };
  const [label, cls] = map[status] ?? [status, 'bg-white/10'];
  return <span className={clsx('chip', cls)}>{label}</span>;
}
