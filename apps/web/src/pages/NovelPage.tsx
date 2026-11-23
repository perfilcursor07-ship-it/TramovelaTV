import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Bookmark, BookmarkCheck, CheckCircle2, Flame, Heart, Lock, Play, Share2, Timer, Unlock } from 'lucide-react';
import { ApiError, compactNumber, formatBRL, type NovelDetail } from '@novelas/shared';
import { api, media } from '../lib/api';
import { useAuth } from '../lib/auth';
import CheckoutModal from '../components/CheckoutModal';
import { NovelCard } from '../components/NovelCard';
import { Empty, FullScreenLoader, useCountdown } from '../components/ui';

const PAGE = 30;

export default function NovelPage() {
  const { slug = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [checkout, setCheckout] = useState(false);
  const [range, setRange] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['novel', slug], queryFn: () => api.catalog.novel(slug) });
  const genre = data?.novel.genre || undefined;
  const { data: related } = useQuery({
    queryKey: ['related', genre],
    queryFn: async () => {
      const same = genre ? await api.catalog.novels({ genre }) : { data: [] };
      if (same.data.length >= 7) return same;
      const all = await api.catalog.novels();
      const ids = new Set(same.data.map((n) => n.id));
      return { data: [...same.data, ...all.data.filter((n) => !ids.has(n.id))] };
    },
    enabled: !!data,
  });
  const promo = useCountdown(data?.novel.promo_ends_at ?? null);

  useEffect(() => {
    if (sp.get('comprar') === '1' && user && data && !data.has_access) {
      setCheckout(true);
      sp.delete('comprar');
      setSp(sp, { replace: true });
    }
  }, [sp, user, data, setSp]);

  useEffect(() => {
    setRange(data?.last_episode ? Math.floor((data.last_episode - 1) / PAGE) : 0);
  }, [data?.last_episode, slug]);

  const relatedList = useMemo(() => (related?.data ?? []).filter((n) => n.slug !== slug).slice(0, 6), [related, slug]);

  if (isLoading) return <div className="pt-24"><FullScreenLoader /></div>;
  if (error || !data)
    return (
      <div className="mx-auto max-w-xl px-4 pt-28">
        <Empty title="Novela não encontrada" text={(error as ApiError)?.message} action={<Link to="/" className="btn-primary">Início</Link>} />
      </div>
    );

  const { novel, episodes, has_access } = data;
  const startEp = data.last_episode || 1;
  const hasPromo = novel.promo_price_cents != null;
  const previewSec = episodes[0]?.preview_seconds || 0;
  const tags = [novel.genre, ...(novel.tags || [])].filter((t, i, a) => t && a.indexOf(t) === i) as string[];
  const ranges = Array.from({ length: Math.ceil(episodes.length / PAGE) }, (_, i) => i);
  const shown = episodes.slice(range * PAGE, range * PAGE + PAGE);

  const fav = async () => {
    if (!user) return nav(`/entrar?next=/novela/${slug}`);
    const r = await api.social.favorite(novel.id);
    qc.setQueryData<NovelDetail>(['novel', slug], (o) => o && { ...o, favorite: r.favorite });
    toast.success(r.favorite ? 'Adicionada à sua lista' : 'Removida da sua lista');
  };

  const share = async () => {
    const url = `${window.location.origin}/novela/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: novel.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
      }
    } catch {
      /* cancelado */
    }
  };

  const buy = () => (user ? setCheckout(true) : nav(`/entrar?next=${encodeURIComponent(`/novela/${slug}?comprar=1`)}`));

  return (
    <div>
      {/* topo */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={media(novel.banner_url || novel.cover_url)} alt="" className="h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/80 to-ink-950" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-20 sm:px-6 sm:pt-28 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
          {/* capa como "player" vertical */}
          <Link
            to={`/assistir/${slug}/${has_access ? startEp : 1}`}
            className="group relative mx-auto block w-56 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:w-64 md:mx-0 md:w-full"
          >
            <img src={media(novel.cover_url)} alt={novel.title} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 grid place-items-center bg-black/20 transition group-hover:bg-black/40">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-950 shadow-xl transition group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-ink-950" />
              </span>
            </div>
            {!has_access && previewSec > 0 && (
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full bg-black/70 py-1.5 text-xs font-semibold backdrop-blur">
                <Timer className="h-3.5 w-3.5 text-brand-400" /> {previewSec}s grátis no EP 1
              </span>
            )}
          </Link>

          <div className="min-w-0 md:pt-2">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{novel.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
              <span className="flex items-center gap-1 font-semibold text-orange-300">
                <Flame className="h-4 w-4 fill-orange-400 text-orange-400" /> {compactNumber(novel.views || 0)}
              </span>
              {novel.likes_count ? (
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" /> {compactNumber(novel.likes_count)}
                </span>
              ) : null}
              <span>{episodes.length} episódios</span>
              {novel.purchases_count ? <span>{compactNumber(novel.purchases_count)} já desbloquearam</span> : null}
            </div>

            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link
                    key={t}
                    to={`/explorar?genre=${encodeURIComponent(t)}`}
                    className="rounded-md bg-white/[.08] px-2.5 py-1 text-xs text-white/75 hover:bg-white/15"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}

            {novel.synopsis && (
              <div className="mt-5 max-w-2xl">
                <p className={clsx('text-sm leading-relaxed text-white/70 sm:text-[15px]', !expanded && 'line-clamp-3')}>{novel.synopsis}</p>
                {novel.synopsis.length > 180 && (
                  <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-semibold text-white/50 hover:text-white">
                    {expanded ? 'Mostrar menos' : 'Ler mais'}
                  </button>
                )}
              </div>
            )}

            {/* bloco de ação */}
            {has_access ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to={`/assistir/${slug}/${startEp}`} className="btn-primary px-8 py-3.5 text-base">
                  <Play className="h-5 w-5 fill-white" /> {data.last_episode ? `Continuar EP ${startEp}` : 'Assistir'}
                </Link>
                <span className="flex items-center gap-1.5 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Todos os episódios liberados
                </span>
              </div>
            ) : (
              <div className="mt-7 max-w-xl rounded-2xl border border-white/10 bg-ink-900/80 p-4 backdrop-blur sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Novela completa</p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold">{formatBRL(novel.effective_price_cents)}</span>
                      {hasPromo && <span className="text-sm text-white/40 line-through">{formatBRL(novel.price_cents)}</span>}
                    </p>
                    <p className="text-xs text-white/45">Pagamento único via Pix · {episodes.length} episódios</p>
                  </div>
                  {promo && !promo.done && (
                    <div className="rounded-lg bg-brand-500/15 px-3 py-1.5 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">Promoção acaba em</p>
                      <p className="font-mono text-sm font-bold">
                        {promo.d > 0 ? `${promo.d}d ` : ''}
                        {String(promo.h).padStart(2, '0')}:{String(promo.m).padStart(2, '0')}:{String(promo.s).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button onClick={buy} className="btn-primary py-3.5 text-base">
                    <Unlock className="h-5 w-5" /> Desbloquear tudo
                  </button>
                  {previewSec > 0 && (
                    <Link to={`/assistir/${slug}/1`} className="btn-ghost py-3.5 text-base">
                      <Play className="h-5 w-5 fill-white" /> Assistir {previewSec}s grátis
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={fav} className="btn-ghost px-4 py-2">
                {data.favorite ? <BookmarkCheck className="h-4 w-4 text-brand-400" /> : <Bookmark className="h-4 w-4" />}
                {data.favorite ? 'Na minha lista' : 'Minha lista'}
              </button>
              <button onClick={share} className="btn-ghost px-4 py-2">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* episódios */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            Episódios <span className="font-normal text-white/40">({episodes.length})</span>
          </h2>
          {ranges.length > 1 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={clsx(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition',
                    range === r ? 'bg-white text-ink-950' : 'bg-white/[.07] text-white/60 hover:text-white',
                  )}
                >
                  {r * PAGE + 1}-{Math.min(episodes.length, r * PAGE + PAGE)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-10">
          {shown.map((e) => {
            const current = e.number === data.last_episode;
            const preview = e.locked && e.preview_seconds > 0;
            return (
              <Link
                key={e.id}
                to={`/assistir/${slug}/${e.number}`}
                title={e.title || `Episódio ${e.number}`}
                className={clsx(
                  'relative grid h-12 place-items-center rounded-lg text-sm font-semibold transition sm:h-14',
                  current
                    ? 'bg-brand-500 text-white'
                    : e.locked && !preview
                      ? 'bg-ink-900 text-white/45 hover:bg-ink-800 hover:text-white/70'
                      : 'bg-ink-800 text-white hover:bg-ink-700',
                )}
              >
                {e.number}
                {preview && (
                  <span className="absolute -top-1.5 right-1 rounded bg-emerald-500 px-1 text-[9px] font-black uppercase leading-[14px] text-black">
                    Grátis
                  </span>
                )}
                {e.locked && !preview && <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-white/30" />}
              </Link>
            );
          })}
        </div>
        {!has_access && (
          <p className="mt-3 text-xs text-white/40">
            {previewSec > 0 ? `O EP 1 tem ${previewSec} segundos grátis. ` : ''}Os demais episódios são liberados após o pagamento.
          </p>
        )}
      </section>

      {/* recomendações */}
      {relatedList.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="mb-4 text-lg font-bold">Você também pode gostar</h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
            {relatedList.map((n) => <NovelCard key={n.id} novel={n} />)}
          </div>
        </section>
      )}
      {!relatedList.length && <div className="pb-24" />}

      <CheckoutModal novel={novel} open={checkout} onClose={() => setCheckout(false)} onPaid={() => refetch()} />
    </div>
  );
}
