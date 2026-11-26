import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  LayoutGrid,
  MessageCircle,
  Pause,
  Play,
  Send,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Film,
} from 'lucide-react';
import { ApiError, compactNumber, formatDuration, type NovelDetail } from '@novelas/shared';
import { api, media } from '../lib/api';
import { useAuth } from '../lib/auth';
import Paywall, { type UnlockKind } from '../components/Paywall';
import CheckoutModal from '../components/CheckoutModal';
import { FullScreenLoader, Spinner } from '../components/ui';

export default function Watch() {
  const { slug = '', ep } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['novel', slug],
    queryFn: () => api.catalog.novel(slug),
  });

  const requested = ep ? Number(ep) : data?.last_episode || 1;
  const episodes = data?.episodes ?? [];
  const episode = episodes.find((e) => e.number === requested) ?? episodes[0];
  const idx = episode ? episodes.indexOf(episode) : -1;
  const prev = idx > 0 ? episodes[idx - 1] : undefined;
  const next = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : undefined;

  const [checkout, setCheckout] = useState<UnlockKind | null>(null);
  const [sheet, setSheet] = useState<'episodes' | 'comments' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [likeAnim, setLikeAnim] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaved = useRef(0);

  // abre o checkout automaticamente ao voltar do login (?comprar=1)
  useEffect(() => {
    const c = sp.get('comprar');
    if (c && user && data && !data.has_access) {
      setCheckout(c === 'pack' ? 'pack' : 'full');
      sp.delete('comprar');
      setSp(sp, { replace: true });
    }
  }, [sp, user, data, setSp]);

  // prévia: episódio bloqueado que toca alguns segundos antes do paywall
  const previewSec = episode?.locked ? episode.preview_seconds : 0;
  const [previewEnded, setPreviewEnded] = useState(false);
  const showPaywall = !!episode?.locked && (!previewSec || previewEnded);
  const unlockedUntil = data?.unlocked_until ?? episodes.length;
  const openCheckout = (kind: UnlockKind) => setCheckout(kind);
  const playable = !!episode && episode.has_video && (!episode.locked || previewSec > 0);

  const stream = useQuery({
    queryKey: ['stream', episode?.id, episode?.locked],
    queryFn: () => api.catalog.stream(episode!.id),
    enabled: playable,
    staleTime: previewSec ? 0 : 60 * 60 * 1000,
    retry: false,
  });

  const goTo = useCallback(
    (n: number) => {
      setSheet(null);
      nav(`/assistir/${slug}/${n}`, { replace: true });
    },
    [nav, slug],
  );

  // salva "continuar assistindo" ao iniciar o episódio
  useEffect(() => {
    lastSaved.current = 0;
    setTime({ cur: 0, dur: 0 });
    setPreviewEnded(false);
    if (user && episode && !episode.locked) api.social.progress(episode.id, 0).catch(() => undefined);
  }, [episode?.id, episode?.locked, user]);

  // tenta tocar com som; se o navegador bloquear, toca mudo
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream.data?.url) return;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => undefined);
    });
  }, [stream.data?.url]);

  // teclado: ↑ ↓ espaço
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' && next) goTo(next.number);
      if (e.key === 'ArrowUp' && prev) goTo(prev.number);
      if (e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // rolar / deslizar troca de episódio (estilo feed)
  const wheelLock = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (sheet || checkout || Math.abs(e.deltaY) < 30 || Date.now() < wheelLock.current) return;
    wheelLock.current = Date.now() + 900;
    if (e.deltaY > 0 && next) goTo(next.number);
    if (e.deltaY < 0 && prev) goTo(prev.number);
  };
  const touchY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchY.current = e.touches[0].clientY);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current == null || sheet) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    touchY.current = null;
    if (dy > 80 && next) goTo(next.number);
    if (dy < -80 && prev) goTo(prev.number);
  };

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }

  const onTimeUpdate = () => {
    const v = videoRef.current!;
    if (previewSec) {
      if (v.currentTime >= previewSec) {
        v.pause();
        setPreviewEnded(true);
      }
      setTime({ cur: v.currentTime, dur: v.duration || 0 });
      return;
    }
    setTime({ cur: v.currentTime, dur: v.duration || 0 });
    if (user && episode && v.currentTime - lastSaved.current > 10) {
      lastSaved.current = v.currentTime;
      api.social.progress(episode.id, Math.floor(v.currentTime)).catch(() => undefined);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const target = ((e.clientX - r.left) / r.width) * v.duration;
    v.currentTime = previewSec ? Math.min(target, Math.max(0, previewSec - 0.3)) : Math.min(target, v.duration - 0.2);
  };

  const requireLogin = () => {
    toast('Entre na sua conta para interagir', { icon: '🔒' });
    nav(`/entrar?next=${encodeURIComponent(`/assistir/${slug}/${episode?.number ?? 1}`)}`);
  };

  const like = async () => {
    if (!user) return requireLogin();
    if (!episode) return;
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    const r = await api.social.like(episode.id);
    qc.setQueryData<NovelDetail>(['novel', slug], (old) =>
      old && {
        ...old,
        episodes: old.episodes.map((e) => (e.id === episode.id ? { ...e, liked: r.liked, likes_count: r.likes_count } : e)),
      },
    );
  };

  const share = async () => {
    const url = `${window.location.origin}/assistir/${slug}/1`;
    try {
      if (navigator.share) await navigator.share({ title: data?.novel.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado!');
      }
    } catch {
      /* cancelado */
    }
  };

  if (isLoading) return <div className="fixed inset-0 bg-black"><FullScreenLoader /></div>;
  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-center">
        <div>
          <p className="mb-4 text-white/60">{(error as ApiError)?.message || 'Novela não encontrada.'}</p>
          <Link to="/" className="btn-primary">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const { novel } = data;
  const progress = time.dur ? (time.cur / time.dur) * 100 : 0;

  return (
    <div
      className="player-shield fixed inset-0 overflow-hidden bg-black"
      onContextMenu={(e) => e.preventDefault()}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* fundo desfocado */}
      {novel.cover_url && (
        <img src={media(novel.cover_url)} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl" draggable={false} />
      )}

      <div className="relative mx-auto h-full w-full sm:aspect-[9/16] sm:w-auto sm:max-w-full sm:py-4">
        <div className="relative h-full w-full overflow-hidden bg-ink-950 sm:rounded-3xl sm:ring-1 sm:ring-white/10">
          {/* vídeo / placeholders */}
          {playable && stream.data?.url ? (
            <video
              key={stream.data.url}
              ref={videoRef}
              src={stream.data.url}
              className="h-full w-full object-cover"
              playsInline
              autoPlay
              muted={muted}
              preload="auto"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={onTimeUpdate}
              onEnded={() => (previewSec ? setPreviewEnded(true) : next && goTo(next.number))}
            />
          ) : (
            <div className="relative h-full w-full">
              {novel.cover_url && <img src={media(novel.cover_url)} alt="" className="h-full w-full object-cover opacity-60" draggable={false} />}
              {episode && !showPaywall && (
                <div className="absolute inset-0 grid place-items-center">
                  {episode.has_video && stream.isLoading ? (
                    <Spinner className="h-10 w-10" />
                  ) : (
                    <div className="rounded-2xl bg-black/70 px-5 py-4 text-center backdrop-blur">
                      <Film className="mx-auto mb-2 h-8 w-8 text-white/50" />
                      <p className="text-sm text-white/70">
                        {(stream.error as ApiError)?.message || 'Vídeo deste episódio em breve.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* play central quando pausado */}
          {stream.data?.url && !playing && !showPaywall && (
            <button onClick={toggle} className="absolute inset-0 z-10 grid place-items-center" aria-label="Reproduzir">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-black/40 backdrop-blur">
                <Play className="h-9 w-9 translate-x-1 fill-white" />
              </span>
            </button>
          )}

          {/* topo */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <Link to={`/novela/${slug}`} className="rounded-full bg-black/40 p-2 backdrop-blur hover:bg-black/60" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{novel.title}</p>
              <p className="text-xs text-white/60">
                EP {episode?.number ?? 1} / {episodes.length}
              </p>
            </div>
            {stream.data?.url && (
              <button
                onClick={() => {
                  setMuted((m) => !m);
                  if (videoRef.current) videoRef.current.muted = !muted;
                }}
                className="rounded-full bg-black/40 p-2 backdrop-blur"
                aria-label="Som"
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
          </div>

          {/* ações à direita */}
          {episode && !showPaywall && (
            <div className="absolute bottom-20 right-3 z-20 flex flex-col items-center gap-5">
              <RailButton onClick={like} label={compactNumber(episode.likes_count)}>
                <Heart className={clsx('h-7 w-7', episode.liked && 'fill-brand-500 text-brand-500', likeAnim && 'animate-heart-pop')} />
              </RailButton>
              <RailButton onClick={() => setSheet('comments')} label={compactNumber(episode.comments_count)}>
                <MessageCircle className="h-7 w-7" />
              </RailButton>
              <RailButton onClick={() => setSheet('episodes')} label="EPs">
                <LayoutGrid className="h-7 w-7" />
              </RailButton>
              <RailButton onClick={share} label="Enviar">
                <Share2 className="h-7 w-7" />
              </RailButton>
            </div>
          )}

          {/* info + barra de progresso */}
          {episode && !showPaywall && (
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16">
              <p className="pr-16 text-sm font-semibold">{episode.title || `Episódio ${episode.number}`}</p>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={toggle} className="shrink-0" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
                  {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
                </button>
                <div className="group relative h-4 flex-1 cursor-pointer" onClick={seek}>
                  <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/20" />
                  <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-gradient" style={{ width: `${progress}%` }} />
                  <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition group-hover:opacity-100" style={{ left: `${progress}%` }} />
                </div>
                <span className="shrink-0 font-mono text-[11px] text-white/60">
                  {formatDuration(time.cur) || '0:00'} / {formatDuration(time.dur) || '0:00'}
                </span>
              </div>
            </div>
          )}

          {/* PAYWALL */}
          {showPaywall && episode && (
            <Paywall novel={novel} unlockedUntil={unlockedUntil} totalEpisodes={episodes.length} onUnlock={openCheckout} />
          )}

          {/* sheets */}
          {sheet === 'episodes' && (
            <EpisodesSheet data={data} current={episode?.number ?? 1} onPick={goTo} onClose={() => setSheet(null)} />
          )}
          {sheet === 'comments' && episode && (
            <CommentsSheet episodeId={episode.id} slug={slug} onClose={() => setSheet(null)} requireLogin={requireLogin} />
          )}
        </div>
      </div>

      {/* setas no desktop */}
      <div className="absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button disabled={!prev} onClick={() => prev && goTo(prev.number)} className="rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20 disabled:opacity-30" aria-label="Episódio anterior">
          <ChevronUp className="h-6 w-6" />
        </button>
        <button disabled={!next} onClick={() => next && goTo(next.number)} className="rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20 disabled:opacity-30" aria-label="Próximo episódio">
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      <CheckoutModal
        novel={novel}
        kind={checkout ?? 'pack'}
        unlockedUntil={unlockedUntil}
        totalEpisodes={episodes.length}
        open={!!checkout}
        onClose={() => setCheckout(null)}
        onPaid={() => {
          refetch();
        }}
      />
    </div>
  );
}

function RailButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 drop-shadow-[0_2px_6px_rgba(0,0,0,.7)] transition active:scale-90">
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="flex max-h-[70%] flex-col rounded-t-3xl bg-ink-900 animate-float-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EpisodesSheet({
  data,
  current,
  onPick,
  onClose,
}: {
  data: NovelDetail;
  current: number;
  onPick: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={`${data.novel.title} · ${data.episodes.length} episódios`} onClose={onClose}>
      <div className="grid grid-cols-6 gap-2 overflow-y-auto p-5">
        {data.episodes.map((e) => (
          <button
            key={e.id}
            onClick={() => onPick(e.number)}
            className={clsx(
              'relative grid aspect-square place-items-center rounded-lg text-sm font-medium transition',
              e.number === current ? 'bg-brand-500 text-white' : 'bg-ink-800 text-white/80 hover:bg-ink-700',
            )}
          >
            {e.number}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function CommentsSheet({
  episodeId,
  slug,
  onClose,
  requireLogin,
}: {
  episodeId: number;
  slug: string;
  onClose: () => void;
  requireLogin: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['comments', episodeId], queryFn: () => api.social.comments(episodeId) });

  const bump = (delta: number) =>
    qc.setQueryData<NovelDetail>(['novel', slug], (old) =>
      old && { ...old, episodes: old.episodes.map((e) => (e.id === episodeId ? { ...e, comments_count: e.comments_count + delta } : e)) },
    );

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return requireLogin();
    if (!body.trim()) return;
    setSending(true);
    try {
      const c = await api.social.comment(episodeId, body.trim());
      qc.setQueryData(['comments', episodeId], (old: any) => ({ data: [c, ...(old?.data ?? [])] }));
      bump(1);
      setBody('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: number) => {
    await api.social.deleteComment(id);
    qc.setQueryData(['comments', episodeId], (old: any) => ({ data: (old?.data ?? []).filter((c: any) => c.id !== id) }));
    bump(-1);
  };

  return (
    <Sheet title={`Comentários${data ? ` (${data.data.length})` : ''}`} onClose={onClose}>
      <div className="min-h-[180px] flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {isLoading && <Spinner />}
        {data?.data.length === 0 && <p className="py-8 text-center text-sm text-white/40">Seja o primeiro a comentar!</p>}
        {data?.data.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-bold">{c.user_name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/50">
                <span className="font-semibold text-white/80">{c.user_name}</span> · {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
            </div>
            {(user?.id === c.user_id || user?.role === 'admin') && (
              <button onClick={() => remove(c.id)} className="self-start p-1 text-white/30 hover:text-red-400" aria-label="Excluir comentário">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-white/5 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
        <input
          className="input rounded-full py-2.5"
          placeholder={user ? 'Escreva um comentário...' : 'Entre para comentar'}
          value={body}
          maxLength={1000}
          onFocus={() => !user && requireLogin()}
          onChange={(e) => setBody(e.target.value)}
        />
        <button disabled={sending || !body.trim()} className="btn-primary px-4" aria-label="Enviar">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </Sheet>
  );
}
