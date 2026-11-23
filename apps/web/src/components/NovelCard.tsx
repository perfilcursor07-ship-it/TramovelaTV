import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import clsx from 'clsx';
import type { Novel } from '@novelas/shared';
import { media } from '../lib/api';

/** Card vertical estilo app de dorama: capa 3:4, selo, contagem de episódios e tags. */
export function NovelCard({
  novel,
  rank,
  badge,
  className,
}: {
  novel: Novel;
  rank?: number;
  badge?: 'hot' | 'new' | null;
  className?: string;
}) {
  const href = novel.last_episode ? `/assistir/${novel.slug}/${novel.last_episode}` : `/novela/${novel.slug}`;
  const tags = (novel.tags?.length ? novel.tags : [novel.genre]).filter(Boolean).slice(0, 2) as string[];
  const progress = novel.last_episode && novel.episodes_count ? Math.min(100, (novel.last_episode / novel.episodes_count) * 100) : 0;

  return (
    <Link to={href} className={clsx('group block', className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-800">
        {novel.cover_url && (
          <img
            src={media(novel.cover_url)}
            alt={novel.title}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

        {rank != null ? (
          <span
            className={clsx(
              'absolute left-0 top-0 grid h-7 min-w-7 place-items-center rounded-br-xl px-2 text-sm font-black',
              rank <= 3 ? 'bg-brand-500' : 'bg-black/70',
            )}
          >
            {rank}
          </span>
        ) : badge ? (
          <span
            className={clsx(
              'absolute left-0 top-0 rounded-br-xl px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
              badge === 'hot' ? 'bg-brand-500' : 'bg-emerald-500 text-black',
            )}
          >
            {badge === 'hot' ? 'Em alta' : 'Novo'}
          </span>
        ) : null}

        {novel.episodes_count ? (
          <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white/90">
            {novel.last_episode ? `EP ${novel.last_episode}/${novel.episodes_count}` : `${novel.episodes_count} EPs`}
          </span>
        ) : null}

        <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 backdrop-blur">
            <Play className="ml-0.5 h-5 w-5 fill-white" />
          </span>
        </span>

        {progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white/90 group-hover:text-white">{novel.title}</h3>
      {tags.length > 0 && <p className="mt-0.5 truncate text-xs text-white/40">{tags.join(' · ')}</p>}
    </Link>
  );
}

export function NovelRow({ title, novels }: { title: string; novels: Novel[] }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!novels.length) return null;
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="group/row">
      <div className="mx-auto mb-3 flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        <div className="hidden gap-1 opacity-0 transition group-hover/row:opacity-100 md:flex">
          <button onClick={() => scroll(-1)} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar mx-auto flex max-w-7xl snap-x scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 sm:scroll-px-6 sm:gap-4 sm:px-6">
        {novels.map((n) => (
          <NovelCard key={n.id} novel={n} className="w-[30vw] shrink-0 snap-start sm:w-36 lg:w-40" />
        ))}
      </div>
    </section>
  );
}
