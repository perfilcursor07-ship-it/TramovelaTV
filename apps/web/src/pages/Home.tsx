import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ChevronRight, Flame, Play } from 'lucide-react';
import { compactNumber, type Novel } from '@novelas/shared';
import { api, media } from '../lib/api';
import HeroFeatured from '../components/HeroFeatured';
import { NovelCard } from '../components/NovelCard';
import { Empty, FullScreenLoader } from '../components/ui';

function Section({ title, icon, to, children }: { title: string; icon?: ReactNode; to?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          {icon}
          {title}
        </h2>
        {to && (
          <Link to={to} className="flex items-center text-sm text-white/50 hover:text-white">
            Ver mais <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const gridCls = 'grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';

/** Ranking numerado com visualizações (estilo "Mais assistidas" dos apps de dorama). */
function Ranking({ novels }: { novels: Novel[] }) {
  return (
    <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {novels.map((n, i) => (
        <li key={n.id}>
          <Link to={`/novela/${n.slug}`} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[.05]">
            <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-ink-800">
              {n.cover_url && <img src={media(n.cover_url)} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <span
                className={clsx(
                  'absolute left-0 top-0 grid h-6 min-w-6 place-items-center rounded-br-lg px-1.5 text-xs font-black',
                  i < 3 ? 'bg-brand-500' : 'bg-black/70',
                )}
              >
                {i + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold leading-snug text-white/90 group-hover:text-white">{n.title}</p>
              <p className="mt-1 truncate text-xs text-white/40">
                {[n.genre, n.episodes_count ? `${n.episodes_count} EPs` : null].filter(Boolean).join(' · ')}
              </p>
              {n.views > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-orange-300">
                  <Flame className="h-3.5 w-3.5 fill-orange-400 text-orange-400" /> {compactNumber(n.views)}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  const { data, isLoading } = useQuery({ queryKey: ['home'], queryFn: api.catalog.home });
  const [tab, setTab] = useState('hot');

  const tabs = useMemo(
    () => [
      { id: 'hot', label: 'Em alta' },
      { id: 'new', label: 'Novidades' },
      ...(data?.genres ?? []).map((g) => ({ id: `g:${g.genre}`, label: g.genre })),
    ],
    [data],
  );

  if (isLoading) return <div className="pt-24"><FullScreenLoader /></div>;
  if (!data || !data.trending.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-28">
        <Empty title="Nenhuma novela publicada ainda" text="Entre no painel administrativo para cadastrar a primeira novela." />
      </div>
    );
  }

  const hero = data.featured.length ? data.featured.slice(0, 6) : data.trending.slice(0, 6);
  const newIds = new Set(data.latest.slice(0, 4).map((n) => n.id));
  const hotIds = new Set(data.trending.slice(0, 4).map((n) => n.id));
  const badgeOf = (n: Novel) => (hotIds.has(n.id) ? 'hot' : newIds.has(n.id) ? 'new' : null);

  const tabNovels =
    tab === 'hot'
      ? data.trending
      : tab === 'new'
        ? data.latest
        : data.genres.find((g) => `g:${g.genre}` === tab)?.novels ?? [];

  return (
    <div>
      <HeroFeatured novels={hero} />

      <div className="mx-auto max-w-7xl space-y-12 px-4 pb-24 pt-6 sm:px-6">
        {data.continue_watching.length > 0 && (
          <Section title="Continue assistindo" icon={<Play className="h-5 w-5 fill-brand-500 text-brand-500" />}>
            <div className={gridCls}>
              {data.continue_watching.slice(0, 6).map((n) => <NovelCard key={n.id} novel={n} />)}
            </div>
          </Section>
        )}

        <Section title="Mais assistidas" icon={<Flame className="h-5 w-5 fill-orange-400 text-orange-400" />}>
          <Ranking novels={data.trending.slice(0, 9)} />
        </Section>

        <section>
          <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
                  tab === t.id ? 'bg-white text-ink-950' : 'bg-white/[.07] text-white/70 hover:bg-white/[.12] hover:text-white',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={gridCls}>
            {tabNovels.slice(0, 12).map((n) => <NovelCard key={n.id} novel={n} badge={badgeOf(n)} />)}
          </div>
          <div className="mt-8 text-center">
            <Link to="/explorar" className="btn-outline">
              Ver catálogo completo <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
