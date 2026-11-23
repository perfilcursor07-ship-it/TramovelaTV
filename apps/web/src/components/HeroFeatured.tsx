import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Flame, Play } from 'lucide-react';
import clsx from 'clsx';
import { compactNumber, type Novel } from '@novelas/shared';
import { media } from '../lib/api';

/** Carrossel de destaques no estilo dos apps de dorama: card arredondado com capa vertical ao lado. */
export default function HeroFeatured({ novels }: { novels: Novel[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (novels.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % novels.length), 6000);
    return () => clearInterval(t);
  }, [novels.length, paused]);

  if (!novels.length) return null;
  const n = novels[i];
  const go = (d: number) => setI((x) => (x + d + novels.length) % novels.length);
  const tags = (n.tags?.length ? n.tags : [n.genre]).filter(Boolean).slice(0, 3) as string[];

  return (
    <section
      className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[460px] overflow-hidden rounded-3xl bg-ink-900 sm:h-[420px]">
        {/* fundo desfocado */}
        {novels.map((nv, idx) => (
          <img
            key={nv.id}
            src={media(nv.banner_url || nv.cover_url)}
            alt=""
            draggable={false}
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
              idx === i ? 'opacity-60' : 'opacity-0',
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/20 sm:bg-gradient-to-r sm:from-ink-950 sm:via-ink-950/80 sm:to-ink-950/10" />

        <div className="relative flex h-full items-end gap-8 p-5 sm:items-center sm:p-10 lg:p-12">
          <div key={n.id} className="min-w-0 flex-1 animate-float-up">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">Destaque</span>
              {n.views > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-orange-300">
                  <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400" /> {compactNumber(n.views)} views
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{n.title}</h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/75">{t}</span>
              ))}
              {n.episodes_count ? (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/75">{n.episodes_count} episódios</span>
              ) : null}
            </div>
            {n.synopsis && <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/70 sm:line-clamp-3 sm:text-base">{n.synopsis}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to={`/assistir/${n.slug}/1`} className="btn-primary px-7 py-3 text-base">
                <Play className="h-5 w-5 fill-white" /> Assistir agora
              </Link>
              {n.preview_seconds > 0 && (
                <span className="text-xs text-white/55">{n.preview_seconds} segundos grátis</span>
              )}
            </div>
          </div>

          <Link
            to={`/novela/${n.slug}`}
            key={`c${n.id}`}
            className="hidden w-52 shrink-0 animate-float-up overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 md:block lg:w-60"
          >
            <img src={media(n.cover_url)} alt={n.title} draggable={false} className="aspect-[3/4] w-full object-cover" />
          </Link>
        </div>

        {novels.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur hover:bg-black/60 lg:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próximo"
              className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur hover:bg-black/60 lg:grid"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-4 right-5 flex gap-1.5">
              {novels.map((nv, idx) => (
                <button
                  key={nv.id}
                  onClick={() => setI(idx)}
                  aria-label={nv.title}
                  className={clsx('h-1.5 rounded-full transition-all', idx === i ? 'w-6 bg-white' : 'w-1.5 bg-white/35')}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
