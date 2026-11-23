import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clapperboard, Clock, DollarSign, MessageSquare, Receipt, Users } from 'lucide-react';
import { formatBRL } from '@novelas/shared';
import { api, media } from '../../lib/api';
import { FullScreenLoader, StatusBadge } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function AdminStats() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: api.admin.stats, refetchInterval: 30_000 });
  if (isLoading || !data) return <FullScreenLoader />;
  const t = data.totals;
  const tiles = [
    { label: 'Faturamento total', value: formatBRL(t.revenue_cents), icon: DollarSign },
    { label: 'Vendas pagas', value: t.paid_orders, icon: Receipt },
    { label: 'Pix pendentes', value: t.pending_orders, icon: Clock },
    { label: 'Usuários', value: t.users, icon: Users },
    { label: 'Novelas / episódios', value: `${t.novels} / ${t.episodes}`, icon: Clapperboard },
    { label: 'Comentários', value: t.comments, icon: MessageSquare },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das vendas e do catálogo."
        actions={<Link to="/painel/admin/novelas/nova" className="btn-primary">+ Nova novela</Link>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {tiles.map((x) => (
          <div key={x.label} className="card p-4">
            <x.icon className="h-5 w-5 text-white/35" />
            <p className="mt-3 text-2xl font-extrabold tabular-nums">{x.value}</p>
            <p className="text-xs text-white/50">{x.label}</p>
          </div>
        ))}
      </div>

      <RevenueChart series={data.series} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-bold">Novelas mais vendidas</h2>
          <div className="space-y-3">
            {data.top_novels.map((n, i) => (
              <Link key={n.id} to={`/painel/admin/novelas/${n.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-white/5">
                <span className="w-5 text-center font-black text-white/30">{i + 1}</span>
                {n.cover_url && <img src={media(n.cover_url)} alt="" className="h-12 w-8 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-white/40">{n.views} visualizações</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold tabular-nums">{n.sales} vendas</p>
                  <p className="text-xs text-white/50 tabular-nums">{formatBRL(n.revenue_cents)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Últimos pedidos</h2>
            <Link to="/painel/admin/pedidos" className="text-xs font-semibold text-brand-400">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {data.recent_orders.length === 0 && <p className="text-sm text-white/40">Nenhum pedido ainda.</p>}
            {data.recent_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{o.user_name}</p>
                  <p className="truncate text-xs text-white/40">{o.novel_title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{formatBRL(o.amount_cents)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Barras simples de faturamento diário (série única, uma cor, tooltip no hover) */
function RevenueChart({ series }: { series: { day: string; total_cents: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((s) => s.total_cents), 1);
  const total = series.reduce((s, x) => s + x.total_cents, 0);
  const h = hover != null ? series[hover] : null;
  const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="card mt-6 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-bold">Faturamento — últimos 30 dias</h2>
        <p className="text-sm text-white/60">
          {h ? (
            <>
              <span className="text-white/40">{fmtDay(h.day)}:</span> <b className="text-white tabular-nums">{formatBRL(h.total_cents)}</b> · {h.orders} vendas
            </>
          ) : (
            <>Total: <b className="text-white tabular-nums">{formatBRL(total)}</b></>
          )}
        </p>
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-white/[.06]" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/[.06]" />
        <div className="flex h-44 items-end gap-[2px] border-b border-white/10" onMouseLeave={() => setHover(null)}>
          {series.map((s, i) => (
            <div
              key={s.day}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
              role="img"
              aria-label={`${fmtDay(s.day)}: ${formatBRL(s.total_cents)}`}
            >
              <div
                className="w-full rounded-t-[4px] bg-brand-500 transition-opacity"
                style={{
                  height: s.total_cents ? `${Math.max(3, (s.total_cents / max) * 100)}%` : '2px',
                  opacity: s.total_cents ? (hover == null || hover === i ? 1 : 0.45) : 0.15,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-white/40">
          <span>{fmtDay(series[0].day)}</span>
          <span>{fmtDay(series[Math.floor(series.length / 2)].day)}</span>
          <span>{fmtDay(series[series.length - 1].day)}</span>
        </div>
      </div>
    </div>
  );
}
