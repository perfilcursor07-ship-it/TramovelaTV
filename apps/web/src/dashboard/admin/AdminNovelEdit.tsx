import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { ArrowLeft, Check, Copy, Eye, Film, ImagePlus, Loader2, Save, Trash2, Upload, Video } from 'lucide-react';
import { formatDuration, type AdminEpisode, type Novel } from '@novelas/shared';
import { api, media, readVideoDuration, uploadWithProgress } from '../../lib/api';
import Paywall from '../../components/Paywall';
import { FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';
import { copyPromoLink } from './AdminNovels';

const toCents = (v: string) => Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100) || 0;
const fromCents = (c?: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminNovelEdit() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'novel', id],
    queryFn: () => api.admin.novel(Number(id)),
    enabled: !isNew,
  });

  const [f, setF] = useState({
    title: '',
    slug: '',
    synopsis: '',
    genre: '',
    tags: '',
    price: '19,90',
    promo: '',
    promoEnds: '',
    free: '1',
    preview: '5',
    packEps: '3',
    packPrice: '5,99',
    status: 'draft' as 'draft' | 'published',
    featured: false,
  });
  const [cover, setCover] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const n = data.novel;
    setF({
      title: n.title,
      slug: n.slug,
      synopsis: n.synopsis ?? '',
      genre: n.genre ?? '',
      tags: n.tags_text,
      price: fromCents(n.price_cents),
      promo: fromCents(n.raw_promo_price_cents),
      promoEnds: toLocalInput(n.raw_promo_ends_at),
      free: String(n.free_episodes),
      preview: String(n.preview_seconds ?? 0),
      packEps: String(n.pack_episodes ?? 0),
      packPrice: fromCents(n.pack_price_cents),
      status: n.status,
      featured: n.featured,
    });
  }, [data]);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : media(data?.novel.cover_url)), [cover, data]);
  const bannerPreview = useMemo(() => (banner ? URL.createObjectURL(banner) : media(data?.novel.banner_url)), [banner, data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', f.title);
      if (f.slug) fd.append('slug', f.slug);
      fd.append('synopsis', f.synopsis);
      fd.append('genre', f.genre);
      fd.append('tags', f.tags);
      fd.append('price_cents', String(toCents(f.price)));
      fd.append('promo_price_cents', f.promo ? String(toCents(f.promo)) : '');
      fd.append('promo_ends_at', f.promo && f.promoEnds ? new Date(f.promoEnds).toISOString() : '');
      fd.append('free_episodes', f.free || '0');
      fd.append('preview_seconds', f.preview || '0');
      fd.append('pack_episodes', f.packEps || '0');
      fd.append('pack_price_cents', String(toCents(f.packPrice || '0')));
      fd.append('status', f.status);
      fd.append('featured', String(f.featured));
      if (cover) fd.append('cover', cover);
      if (banner) fd.append('banner', banner);
      if (isNew) {
        const n = await api.admin.createNovel(fd);
        toast.success('Novela criada! Agora suba os episódios.');
        nav(`/painel/admin/novelas/${n.id}`, { replace: true });
      } else {
        await api.admin.updateNovel(Number(id), fd);
        toast.success('Alterações salvas');
        setCover(null);
        setBanner(null);
        qc.invalidateQueries({ queryKey: ['admin'] });
        qc.invalidateQueries({ queryKey: ['novel'] });
        qc.invalidateQueries({ queryKey: ['home'] });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // objeto "novela" para o preview do paywall
  const previewNovel: Novel = {
    id: 0,
    title: f.title || 'Título da novela',
    slug: f.slug,
    synopsis: f.synopsis,
    cover_url: null,
    banner_url: null,
    genre: f.genre,
    tags: [],
    price_cents: toCents(f.price),
    promo_price_cents: f.promo ? toCents(f.promo) : null,
    promo_ends_at: f.promo && f.promoEnds ? new Date(f.promoEnds).toISOString() : null,
    effective_price_cents: f.promo ? toCents(f.promo) : toCents(f.price),
    free_episodes: Number(f.free) || 0,
    preview_seconds: Number(f.preview) || 0,
    pack_episodes: Number(f.packEps) || 0,
    pack_price_cents: toCents(f.packPrice || '0'),
    featured: f.featured,
    views: 0,
    episodes_count: data?.episodes.length ?? 0,
  };

  if (!isNew && isLoading) return <FullScreenLoader />;

  return (
    <div>
      <Link to="/painel/admin/novelas" className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Novelas
      </Link>
      <PageHeader
        title={isNew ? 'Nova novela' : f.title}
        subtitle={isNew ? 'Preencha os dados e salve para liberar o envio dos episódios.' : `/${f.slug}`}
        actions={
          !isNew && (
            <div className="flex gap-2">
              <button onClick={() => copyPromoLink(f.slug)} className="btn-outline">
                <Copy className="h-4 w-4" /> Link de divulgação
              </button>
              <Link to={`/assistir/${f.slug}/1`} target="_blank" className="btn-ghost">
                <Eye className="h-4 w-4" /> Ver
              </Link>
            </div>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <form onSubmit={save} className="card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título</label>
              <input className="input" value={f.title} onChange={set('title')} required />
            </div>
            <div>
              <label className="label">Gênero</label>
              <input className="input" value={f.genre} onChange={set('genre')} placeholder="Romance, Drama, Fantasia..." list="genres" />
              <datalist id="genres">
                {['Romance', 'Drama', 'Fantasia', 'Comédia', 'Suspense', 'Ação', 'Vingança', 'CEO'].map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">Tags (separadas por vírgula)</label>
              <input className="input" value={f.tags} onChange={set('tags')} placeholder="bilionário, segunda chance" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Sinopse</label>
              <textarea className="input min-h-[110px]" value={f.synopsis} onChange={set('synopsis')} />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-brand-500/25 bg-brand-500/[.06] p-4">
            <p className="text-sm font-bold text-brand-400">💰 Funil de venda</p>

            <div>
              <p className="mb-2 text-xs font-semibold text-white/70">1. Parte grátis</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Episódios grátis (inteiros)</label>
                  <input className="input" type="number" min={0} value={f.free} onChange={set('free')} />
                </div>
                <div>
                  <label className="label">Segundos grátis do episódio seguinte</label>
                  <input className="input" type="number" min={0} max={600} value={f.preview} onChange={set('preview')} />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-white/70">2. Promoção (pacote de episódios)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Episódios por pacote</label>
                  <input className="input" type="number" min={0} max={100} value={f.packEps} onChange={set('packEps')} />
                </div>
                <div>
                  <label className="label">Preço do pacote (R$)</label>
                  <input className="input" inputMode="decimal" value={f.packPrice} onChange={set('packPrice')} disabled={!Number(f.packEps)} />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-white/70">3. Novela completa</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Preço (R$)</label>
                  <input className="input" inputMode="decimal" value={f.price} onChange={set('price')} required />
                </div>
                <div>
                  <label className="label">Preço promo (R$)</label>
                  <input className="input" inputMode="decimal" value={f.promo} onChange={set('promo')} placeholder="opcional" />
                </div>
                <div>
                  <label className="label">Promo até</label>
                  <input className="input" type="datetime-local" value={f.promoEnds} onChange={set('promoEnds')} disabled={!f.promo} />
                </div>
              </div>
            </div>

            <p className="rounded-xl bg-black/20 p-3 text-xs leading-relaxed text-white/60">
              <b className="text-white/80">Como fica para o espectador:</b>{' '}
              {Number(f.free) > 0 ? `assiste ${Number(f.free) === 1 ? 'o EP 1' : `do EP 1 ao ${f.free}`} inteiro, ` : ''}
              {Number(f.preview) > 0
                ? `passa sozinho para o EP ${Number(f.free) + 1}, assiste ${f.preview} segundos e aparece a tela de Pix`
                : `ao chegar no EP ${Number(f.free) + 1} já aparece a tela de Pix`}
              {Number(f.packEps) > 0
                ? ` com a promoção “mais ${f.packEps} episódios por R$ ${f.packPrice}”. Depois do pacote, o ciclo se repete no episódio seguinte.`
                : ` para liberar a novela completa.`}{' '}
              Cada episódio pode ter seus próprios segundos grátis na lista de episódios abaixo.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImagePick label="Capa (vertical 2:3)" preview={coverPreview} onPick={setCover} aspect="aspect-[2/3] w-32" />
            <ImagePick label="Banner (horizontal 16:7)" preview={bannerPreview} onPick={setBanner} aspect="aspect-[16/7] w-full" />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="label">Status</label>
              <select className="input w-48" value={f.status} onChange={set('status')}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicada</option>
              </select>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={f.featured} onChange={set('featured')} className="h-4 w-4 accent-brand-500" />
              Destaque na home
            </label>
            {!isNew && (
              <div className="w-full sm:w-auto">
                <label className="label">Slug (URL)</label>
                <input className="input w-64" value={f.slug} onChange={set('slug')} />
              </div>
            )}
          </div>

          <button disabled={saving} className="btn-primary px-8 py-3">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isNew ? 'Criar novela' : 'Salvar'}
          </button>
        </form>

        <div>
          <p className="label">Prévia do paywall</p>
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-3xl bg-ink-800 ring-1 ring-white/10">
            {coverPreview && <img src={coverPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="pointer-events-none origin-top scale-[.92]">
              <Paywall
                novel={previewNovel}
                unlockedUntil={Number(f.free) || 0}
                totalEpisodes={Math.max(data?.episodes.length ?? 0, (Number(f.free) || 0) + (Number(f.packEps) || 0) + 1)}
                onUnlock={() => undefined}
                compact
              />
            </div>
          </div>
        </div>
      </div>

      {!isNew && data && <EpisodesManager novelId={Number(id)} episodes={data.episodes} freeCount={Number(f.free) || 0} defaultPreview={Number(f.preview) || 0} />}
    </div>
  );
}

function ImagePick({ label, preview, onPick, aspect }: { label: string; preview: string; onPick: (f: File) => void; aspect: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="label">{label}</label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={clsx('relative grid place-items-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-ink-800 hover:border-brand-500', aspect)}
      >
        {preview ? <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-white/40" />}
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </div>
  );
}

type QueueItem = { name: string; pct: number; status: 'wait' | 'up' | 'ok' | 'err'; error?: string };

function EpisodesManager({
  novelId,
  episodes,
  freeCount,
  defaultPreview,
}: {
  novelId: number;
  episodes: AdminEpisode[];
  freeCount: number;
  defaultPreview: number;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const busy = queue.some((q) => q.status === 'wait' || q.status === 'up');
  const reload = () => qc.invalidateQueries({ queryKey: ['admin', 'novel', String(novelId)] });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    let nextNum = Math.max(0, ...episodes.map((e) => e.number)) + 1;
    setQueue(list.map((f) => ({ name: f.name, pct: 0, status: 'wait' })));
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const number = nextNum++;
      setQueue((q) => q.map((x, k) => (k === i ? { ...x, status: 'up' } : x)));
      try {
        const fd = new FormData();
        fd.append('number', String(number));
        fd.append('title', `Episódio ${number}`);
        fd.append('duration_seconds', String(await readVideoDuration(file)));
        fd.append('video', file);
        await uploadWithProgress('POST', `/admin/novels/${novelId}/episodes`, fd, (pct) =>
          setQueue((q) => q.map((x, k) => (k === i ? { ...x, pct } : x))),
        );
        setQueue((q) => q.map((x, k) => (k === i ? { ...x, pct: 100, status: 'ok' } : x)));
      } catch (e) {
        setQueue((q) => q.map((x, k) => (k === i ? { ...x, status: 'err', error: (e as Error).message } : x)));
      }
    }
    reload();
    toast.success('Envio concluído');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <section className="card mt-6 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Episódios ({episodes.length})</h2>
          <p className="text-xs text-white/50">Selecione vários vídeos de uma vez — eles serão numerados pela ordem do nome do arquivo. Formato vertical 9:16 em MP4 fica melhor.</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-primary">
          <Upload className="h-4 w-4" /> Enviar vídeos
        </button>
        <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {queue.length > 0 && (
        <div className="mb-4 space-y-2 rounded-xl bg-ink-800 p-3">
          {queue.map((q, i) => (
            <div key={i} className="text-xs">
              <div className="flex justify-between">
                <span className="truncate">{q.name}</span>
                <span className={clsx(q.status === 'err' ? 'text-red-300' : q.status === 'ok' ? 'text-emerald-300' : 'text-white/50')}>
                  {q.status === 'err' ? q.error : q.status === 'ok' ? 'Enviado' : q.status === 'wait' ? 'Na fila' : `${q.pct}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={clsx('h-full transition-all', q.status === 'err' ? 'bg-red-400' : 'bg-brand-gradient')} style={{ width: `${q.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {episodes.length === 0 ? (
        <button onClick={() => inputRef.current?.click()} className="grid w-full place-items-center gap-2 rounded-2xl border border-dashed border-white/15 py-14 text-white/50 hover:border-brand-500">
          <Video className="h-8 w-8" />
          Clique para enviar os vídeos dos episódios
        </button>
      ) : (
        <div className="space-y-2">
          {episodes.map((e) => (
            <EpisodeRow key={e.id} ep={e} free={e.number <= freeCount} defaultPreview={defaultPreview} onChange={reload} />
          ))}
        </div>
      )}
    </section>
  );
}

function EpisodeRow({ ep, free, defaultPreview, onChange }: { ep: AdminEpisode; free: boolean; defaultPreview: number; onChange: () => void }) {
  const [title, setTitle] = useState(ep.title ?? '');
  const [number, setNumber] = useState(String(ep.number));
  const [preview, setPreview] = useState(ep.preview_seconds == null ? '' : String(ep.preview_seconds));
  const [pct, setPct] = useState<number | null>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const dirty =
    title !== (ep.title ?? '') || number !== String(ep.number) || preview !== (ep.preview_seconds == null ? '' : String(ep.preview_seconds));

  const send = async (extra?: (fd: FormData) => Promise<void> | void) => {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('number', number);
    fd.append('preview_seconds', preview);
    if (extra) await extra(fd);
    setPct(0);
    try {
      await uploadWithProgress('PUT', `/admin/episodes/${ep.id}`, fd, setPct);
      toast.success(`Episódio ${number} atualizado`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPct(null);
    }
  };

  const remove = async () => {
    if (!confirm(`Excluir o episódio ${ep.number}?`)) return;
    await api.admin.deleteEpisode(ep.id);
    onChange();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-800/60 p-2.5">
      <button onClick={() => thumbRef.current?.click()} className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-ink-700" title="Trocar miniatura">
        {ep.thumbnail_url ? <img src={media(ep.thumbnail_url)} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="m-auto h-4 w-4 text-white/30" />}
      </button>
      <input ref={thumbRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && send((fd) => fd.append('thumbnail', e.target.files![0]))} />
      <input className="input w-16 px-2 py-2 text-center" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} />
      <input className="input min-w-[160px] flex-1 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
      {!free && (
        <label className="flex items-center gap-1.5 text-xs text-white/50" title="Segundos grátis deste episódio antes da tela de Pix. Vazio = padrão da novela.">
          <input
            className="input w-16 px-2 py-2 text-center"
            inputMode="numeric"
            placeholder={String(defaultPreview)}
            value={preview}
            onChange={(e) => setPreview(e.target.value.replace(/\D/g, ''))}
          />
          s grátis
        </label>
      )}
      <div className="flex items-center gap-2 text-xs">
        {free && <span className="chip bg-white/10 text-white/60">liberado</span>}
        {ep.has_video ? (
          <span className="flex items-center gap-1 text-white/50"><Film className="h-3.5 w-3.5" /> {formatDuration(ep.duration_seconds) || 'ok'}</span>
        ) : (
          <span className="text-amber-300">sem vídeo</span>
        )}
      </div>
      {pct != null && <span className="w-12 text-right text-xs text-brand-400">{pct}%</span>}
      <div className="ml-auto flex gap-1">
        {dirty && (
          <button onClick={() => send()} className="rounded-lg p-2 text-emerald-300 hover:bg-emerald-500/10" title="Salvar">
            <Check className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => videoRef.current?.click()} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white" title={ep.has_video ? 'Trocar vídeo' : 'Enviar vídeo'}>
          <Upload className="h-4 w-4" />
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file)
              send(async (fd) => {
                fd.append('duration_seconds', String(await readVideoDuration(file)));
                fd.append('video', file);
              });
          }}
        />
        <button onClick={remove} className="rounded-lg p-2 text-white/60 hover:bg-red-500/10 hover:text-red-300" title="Excluir">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
