import { Flame, Zap } from 'lucide-react';
import { formatBRL, type Novel } from '@novelas/shared';
import { useCountdown } from './ui';

export type UnlockKind = 'pack' | 'full';

/**
 * Tela que aparece por cima do player quando a parte grátis acaba.
 * Oferta principal: pacote barato com os próximos episódios. Secundária: novela completa.
 */
export default function Paywall({
  novel,
  unlockedUntil,
  totalEpisodes,
  onUnlock,
  compact,
}: {
  novel: Novel;
  /** até qual episódio o usuário já pode assistir */
  unlockedUntil: number;
  totalEpisodes: number;
  onUnlock: (kind: UnlockKind) => void;
  compact?: boolean;
}) {
  const promo = useCountdown(novel.promo_ends_at);
  const left = Math.max(0, totalEpisodes - unlockedUntil);
  // o pacote libera a quantidade cheia, inclusive episódios que ainda vão ser enviados
  const packEps = left > 0 ? novel.pack_episodes || 0 : 0;
  const hasPack = packEps > 0 && novel.pack_price_cents > 0;
  const from = unlockedUntil + 1;
  const to = unlockedUntil + packEps;
  const fullCheaper = hasPack && novel.effective_price_cents <= novel.pack_price_cents;
  // desconto do pacote sobre o preço "de" configurado no painel
  const off =
    novel.pack_compare_cents > novel.pack_price_cents
      ? Math.round((1 - novel.pack_price_cents / novel.pack_compare_cents) * 100)
      : 0;

  return (
    <div className={compact ? 'relative' : 'absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black via-black/85 to-black/30 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]'}>
      <div className="mx-auto w-full max-w-sm animate-float-up text-center">
        {hasPack && !fullCheaper ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-brand-500 px-3 py-1 text-xs font-black uppercase tracking-wide shadow-lg shadow-brand-500/30">
              <Flame className="h-3.5 w-3.5 fill-white" /> Promoção
            </span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">Quer saber o que acontece?</h2>
            <p className="mt-1.5 text-sm text-white/70">
              Assista agora {packEps === 1 ? `o episódio ${from}` : `mais ${packEps} episódios`}
              {packEps > 1 && <span className="text-white/45"> (EP {from} ao {to})</span>}
            </p>

            {off > 0 ? (
              <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-yellow-400/70 bg-gradient-to-br from-yellow-400/15 via-orange-500/10 to-brand-500/15 px-4 pb-4 pt-9">
                <span className="absolute -right-8 top-3 rotate-45 bg-yellow-400 px-9 py-0.5 text-[10px] font-black uppercase text-black">Hoje</span>
                <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-b-xl bg-yellow-400 px-4 py-1 text-sm font-black uppercase tracking-wide text-black shadow-lg">
                  {off}% de desconto
                </span>
                <p className="text-sm text-white/60">
                  de <span className="font-semibold text-white/60 line-through decoration-red-500 decoration-2">{formatBRL(novel.pack_compare_cents)}</span> por apenas
                </p>
                <p className="text-5xl font-black tracking-tight text-yellow-300 drop-shadow-[0_2px_12px_rgba(250,204,21,.35)]">
                  {formatBRL(novel.pack_price_cents)}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-300">
                  Você economiza {formatBRL(novel.pack_compare_cents - novel.pack_price_cents)}
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/70">por apenas</p>
                <p className="mt-1 text-5xl font-black tracking-tight text-white">{formatBRL(novel.pack_price_cents)}</p>
              </>
            )}

            <button
              onClick={() => onUnlock('pack')}
              className="btn-primary mt-5 w-full animate-pulse-glow py-4 text-base font-extrabold shadow-xl shadow-brand-500/40"
            >
              <Zap className="h-5 w-5 fill-white" /> Assistir agora por {formatBRL(novel.pack_price_cents)}
            </button>
            <p className="mt-2 text-xs text-white/45">Pix · liberação na hora, sem assinatura</p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-brand-500 px-3 py-1 text-xs font-black uppercase tracking-wide">
              <Flame className="h-3.5 w-3.5 fill-white" /> Promoção
            </span>
            <h2 className="mt-3 text-2xl font-extrabold leading-tight">Assista até o final</h2>
            <p className="mt-1.5 text-sm text-white/70">
              Libere {left > 1 ? `os ${left} episódios que faltam` : 'o episódio que falta'} por apenas
            </p>
            <p className="mt-2 flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black tracking-tight">{formatBRL(novel.effective_price_cents)}</span>
              {novel.promo_price_cents != null && <span className="text-sm text-white/40 line-through">{formatBRL(novel.price_cents)}</span>}
            </p>
            <button onClick={() => onUnlock('full')} className="btn-primary mt-5 w-full py-4 text-base font-extrabold shadow-xl shadow-brand-500/40">
              <Zap className="h-5 w-5 fill-white" /> Assistir agora
            </button>
            <p className="mt-2 text-xs text-white/45">Pix · liberação na hora, sem assinatura</p>
          </>
        )}

        {!(hasPack && !fullCheaper) && promo && !promo.done && (
          <p className="mt-3 text-xs text-white/50">
            Oferta termina em{' '}
            <span className="font-mono text-white/80">
              {promo.d > 0 ? `${promo.d}d ` : ''}
              {String(promo.h).padStart(2, '0')}:{String(promo.m).padStart(2, '0')}:{String(promo.s).padStart(2, '0')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
