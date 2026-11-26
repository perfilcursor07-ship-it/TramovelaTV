import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Library as LibIcon, Play } from 'lucide-react';
import { api, media } from '../../lib/api';
import { Empty, FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function Library() {
  const { data, isLoading } = useQuery({ queryKey: ['me', 'library'], queryFn: api.me.library });
  return (
    <div>
      <PageHeader title="Minhas novelas" subtitle="Tudo o que você já liberou fica aqui. Episódios pagos nunca são cobrados de novo." />
      {isLoading ? (
        <FullScreenLoader />
      ) : data?.data.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((n) => {
            const total = n.episodes_count ?? 0;
            const until = n.full_access ? total : Math.min(total, n.unlocked_until ?? 0);
            const next = n.last_episode && n.last_episode < until ? n.last_episode + 1 : n.last_episode || 1;
            const resume = n.last_episode ? Math.min(next, Math.max(until, 1)) : 1;
            const pct = total ? Math.round((until / total) * 100) : 0;
            return (
              <div key={n.id} className="card flex gap-4 p-3">
                <Link to={`/novela/${n.slug}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                  {n.cover_url && <img src={media(n.cover_url)} alt="" className="h-full w-full object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/novela/${n.slug}`} className="line-clamp-2 font-semibold leading-snug hover:text-brand-400">
                    {n.title}
                  </Link>
                  {n.full_access ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Novela completa liberada
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-white/55">
                      Liberado até o EP {n.unlocked_until}
                      {total ? <span className="text-white/35"> · {total} publicados</span> : null}
                    </p>
                  )}
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <Link to={`/assistir/${n.slug}/${resume}`} className="btn-primary mt-auto self-start px-4 py-2 text-xs">
                    <Play className="h-3.5 w-3.5 fill-white" /> {n.last_episode ? `Continuar EP ${resume}` : 'Assistir'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={<LibIcon className="h-10 w-10" />}
          title="Nenhuma novela liberada ainda"
          text="Assista o primeiro episódio grátis de qualquer novela e libere o resto com Pix."
          action={<Link to="/explorar" className="btn-primary">Explorar novelas</Link>}
        />
      )}
    </div>
  );
}
