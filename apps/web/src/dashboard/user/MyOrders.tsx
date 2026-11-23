import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { formatBRL } from '@novelas/shared';
import { api, media } from '../../lib/api';
import { Empty, FullScreenLoader, StatusBadge } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function MyOrders() {
  const { data, isLoading } = useQuery({ queryKey: ['me', 'orders'], queryFn: api.me.orders });
  return (
    <div>
      <PageHeader title="Meus pedidos" subtitle="Histórico dos seus pagamentos via Pix." />
      {isLoading ? (
        <FullScreenLoader />
      ) : data?.data.length ? (
        <div className="space-y-2">
          {data.data.map((o) => (
            <div key={o.id} className="card flex items-center gap-4 p-3">
              {o.novel_cover && <img src={media(o.novel_cover)} alt="" className="h-16 w-11 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <Link to={`/novela/${o.novel_slug}`} className="block truncate font-semibold hover:text-brand-400">
                  {o.novel_title}
                </Link>
                <p className="text-xs text-white/40">
                  #{o.id} · {o.created_at && new Date(o.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatBRL(o.amount_cents)}</p>
                <StatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<ShoppingBag className="h-10 w-10" />} title="Nenhum pedido ainda" />
      )}
    </div>
  );
}
