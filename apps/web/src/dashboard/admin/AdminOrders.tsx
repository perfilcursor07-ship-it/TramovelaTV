import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { RefreshCw, Search } from 'lucide-react';
import { formatBRL } from '@novelas/shared';
import { api } from '../../lib/api';
import { Empty, FullScreenLoader, StatusBadge } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

const filters = [
  ['', 'Todos'],
  ['paid', 'Pagos'],
  ['pending', 'Pendentes'],
  ['expired', 'Expirados'],
];

export default function AdminOrders() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', status, search],
    queryFn: () => api.admin.orders({ status, search }),
  });

  const refresh = async (id: number) => {
    const o = await api.admin.refreshOrder(id);
    toast.success(`Pedido #${id}: ${o.status}`);
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Pagamentos Pix via PagBank." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-white/5 p-1">
          {filters.map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)} className={clsx('rounded-full px-4 py-1.5 text-sm font-semibold', status === v ? 'bg-white text-ink-950' : 'text-white/60')}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input className="input pl-9" placeholder="Cliente ou novela..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {isLoading ? (
        <FullScreenLoader />
      ) : !data?.data.length ? (
        <Empty title="Nenhum pedido encontrado" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-white/40">
              <tr className="border-b border-white/5">
                <th className="p-3">#</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Novela</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3">Criado</th>
                <th className="p-3">PagBank</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {data.data.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3 text-white/40">{o.id}</td>
                  <td className="p-3">
                    <p className="font-semibold">{o.user_name}</p>
                    <p className="text-xs text-white/40">{o.user_email}</p>
                  </td>
                  <td className="p-3">{o.novel_title}</td>
                  <td className="p-3 font-bold tabular-nums">{formatBRL(o.amount_cents)}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-xs text-white/50">{o.created_at && new Date(o.created_at).toLocaleString('pt-BR')}</td>
                  <td className="p-3 font-mono text-[11px] text-white/40">{o.provider_order_id}</td>
                  <td className="p-3">
                    {o.status === 'pending' && (
                      <button onClick={() => refresh(o.id)} className="rounded-lg p-2 text-white/60 hover:bg-white/5" title="Consultar no PagBank">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
