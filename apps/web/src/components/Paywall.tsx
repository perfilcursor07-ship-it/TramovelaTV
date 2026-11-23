import { Check } from 'lucide-react';
import { formatBRL, type Novel } from '@novelas/shared';
import { useSettings } from '../lib/settings';
import { useCountdown } from './ui';

/** Tela de desbloqueio por cima do player, limpa e direta. */
export default function Paywall({
  novel,
  onUnlock,
  compact,
}: {
  novel: Novel;
  episodeNumber?: number;
  onUnlock: () => void;
  compact?: boolean;
}) {
  const s = useSettings();
  const promo = useCountdown(novel.promo_ends_at);
  const hasPromo = novel.promo_price_cents != null;
  const benefits = s.paywall_benefits.slice(0, 3);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-black/20 p-6">
      <div className="mx-auto w-full max-w-sm animate-float-up text-center">
        <h2 className="text-xl font-bold">{s.paywall_title}</h2>
        <p className="mt-1.5 text-sm text-white/60">{s.paywall_subtitle}</p>

        <div className="mt-5 flex items-baseline justify-center gap-2">
          <span className="text-3xl font-bold">{formatBRL(novel.effective_price_cents)}</span>
          {hasPromo && <span className="text-sm text-white/40 line-through">{formatBRL(novel.price_cents)}</span>}
        </div>
        <p className="text-xs text-white/45">
          {novel.episodes_count ? `${novel.episodes_count} episódios · ` : ''}pagamento único via Pix
        </p>

        {!compact && benefits.length > 0 && (
          <ul className="mx-auto mt-4 w-fit space-y-1 text-left text-sm text-white/70">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-400" /> {b}
              </li>
            ))}
          </ul>
        )}

        <button onClick={onUnlock} className="btn-primary mt-6 w-full py-3.5 text-base">
          {s.paywall_cta}
        </button>

        {promo && !promo.done && (
          <p className="mt-3 text-xs text-white/50">
            Promoção termina em{' '}
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
