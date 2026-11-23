import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Clapperboard, Copy, Pencil, Search, Star, Trash2 } from 'lucide-react';
import { formatBRL } from '@novelas/shared';
import { api, media } from '../../lib/api';
import { Empty, FullScreenLoader, StatusBadge } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export function copyPromoLink(slug: string) {
  const url = `${window.location.origin}/assistir/${slug}/1`;
  navigator.clipboard.writeText(url).then(
    () => toast.success('Link de divulgação copiado!'),
    () => toast(url),
  );
}

export default function AdminNovels() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'novels', search], queryFn: () => api.admin.novels(search) });

  const remove = async (id: number, title: string) => {
    if (!confirm(`Excluir "${title}" e TODOS os episódios/vídeos? Isso não pode ser desfeito.`)) return;
    await api.admin.deleteNovel(id);
    toast.success('Novela excluída');
    qc.invalidateQueries({ queryKey: ['admin', 'novels'] });
  };

  return (
    <div>
      <PageHeader
        title="Novelas & vídeos"
        subtitle="Cadastre novelas, suba os episódios e defina o preço."
        actions={<Link to="/painel/admin/novelas/nova" className="btn-primary">+ Nova novela</Link>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input className="input pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <FullScreenLoader />
      ) : !data?.data.length ? (
        <Empty icon={<Clapperboard className="h-10 w-10" />} title="Nenhuma novela" action={<Link to="/painel/admin/novelas/nova" className="btn-primary">Cadastrar</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-white/40">
              <tr className="border-b border-white/5">
                <th className="p-3">Novela</th>
                <th className="p-3">Status</th>
                <th className="p-3">EPs</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Vendas</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((n) => (
                <tr key={n.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.02]">
                  <td className="p-3">
                    <Link to={`/painel/admin/novelas/${n.id}`} className="flex items-center gap-3">
                      {n.cover_url ? <img src={media(n.cover_url)} alt="" className="h-14 w-10 rounded object-cover" /> : <div className="h-14 w-10 rounded bg-ink-700" />}
                      <div>
                        <p className="flex items-center gap-1 font-semibold">
                          {n.title} {n.featured && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
                        </p>
                        <p className="text-xs text-white/40">{n.genre}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3"><StatusBadge status={n.status} /></td>
                  <td className="p-3 tabular-nums">{n.episodes_count}</td>
                  <td className="p-3 tabular-nums">
                    {formatBRL(n.effective_price_cents)}
                    {n.promo_price_cents != null && <span className="ml-1 text-xs text-white/40 line-through">{formatBRL(n.price_cents)}</span>}
                  </td>
                  <td className="p-3 tabular-nums">{n.sales}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => copyPromoLink(n.slug)} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white" title="Copiar link de divulgação">
                        <Copy className="h-4 w-4" />
                      </button>
                      <Link to={`/painel/admin/novelas/${n.id}`} className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(n.id, n.title)} className="rounded-lg p-2 text-white/60 hover:bg-red-500/10 hover:text-red-300" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
