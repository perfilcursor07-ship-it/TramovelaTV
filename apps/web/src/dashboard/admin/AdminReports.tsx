import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Check, Flag, RotateCcw } from 'lucide-react';
import { REPORT_TYPE_LABELS } from '@novelas/shared';
import { api } from '../../lib/api';
import { Empty, FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function AdminReports() {
  const [status, setStatus] = useState<'open' | 'resolved' | 'all'>('open');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'reports', status], queryFn: () => api.admin.reports(status) });

  const setReport = async (id: number, s: 'open' | 'resolved') => {
    await api.admin.setReportStatus(id, s);
    qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
  };

  return (
    <div>
      <PageHeader title="Problemas reportados" subtitle={data ? `${data.open} em aberto` : 'Avisos enviados pelos usuários'} />
      <div className="mb-4 flex gap-2">
        {(
          [
            ['open', 'Em aberto'],
            ['resolved', 'Resolvidos'],
            ['all', 'Todos'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={clsx('rounded-full px-4 py-1.5 text-sm font-semibold', status === k ? 'bg-white text-ink-950' : 'bg-white/[.07] text-white/60')}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FullScreenLoader />
      ) : !data?.data.length ? (
        <Empty icon={<Flag className="h-10 w-10" />} title="Nenhum problema por aqui" text="Quando alguém reportar um problema, ele aparece nesta lista." />
      ) : (
        <div className="space-y-3">
          {data.data.map((r) => (
            <div key={r.id} className={clsx('card p-4', r.status === 'resolved' && 'opacity-60')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{REPORT_TYPE_LABELS[r.type] ?? r.type}</p>
                  <p className="text-xs text-white/45">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                    {r.novel_slug && (
                      <>
                        {' · '}
                        <Link to={`/assistir/${r.novel_slug}/${r.episode_number ?? 1}`} target="_blank" className="text-brand-400 hover:underline">
                          {r.novel_slug}
                          {r.episode_number ? ` · EP ${r.episode_number}` : ''}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                {r.status === 'open' ? (
                  <button onClick={() => setReport(r.id, 'resolved')} className="btn-ghost px-3 py-1.5 text-xs">
                    <Check className="h-3.5 w-3.5" /> Marcar resolvido
                  </button>
                ) : (
                  <button onClick={() => setReport(r.id, 'open')} className="btn-ghost px-3 py-1.5 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/80">{r.message}</p>
              <p className="mt-3 text-xs text-white/50">
                {r.user_name ? (
                  <>
                    <b className="text-white/70">{r.user_name}</b> · {r.user_email}
                  </>
                ) : (
                  'Visitante sem conta'
                )}
                {r.contact && <> · contato: <b className="text-white/70">{r.contact}</b></>}
              </p>
              {r.user_agent && <p className="mt-1 truncate text-[11px] text-white/30" title={r.user_agent}>{r.user_agent}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
