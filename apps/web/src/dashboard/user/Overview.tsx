import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Library, MessageSquare, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { NovelCard } from '../../components/NovelCard';
import { PageHeader } from '../DashboardLayout';

export default function Overview() {
  const { user } = useAuth();
  const { data: s } = useQuery({ queryKey: ['me', 'summary'], queryFn: api.me.summary });
  const { data: home } = useQuery({ queryKey: ['home'], queryFn: api.catalog.home });

  const tiles = [
    { label: 'Novelas liberadas', value: s?.library, icon: Library, to: '/painel/biblioteca' },
    { label: 'Na minha lista', value: s?.favorites, icon: Bookmark, to: '/painel/favoritos' },
    { label: 'Pedidos', value: s?.orders, icon: ShoppingBag, to: '/painel/pedidos' },
    { label: 'Comentários', value: s?.comments, icon: MessageSquare, to: '/painel' },
  ];

  return (
    <div>
      <PageHeader title={`Olá, ${user?.name.split(' ')[0]} 👋`} subtitle="Bom te ver por aqui. Continue de onde parou." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card p-4 transition hover:border-white/15">
            <t.icon className="h-5 w-5 text-white/40" />
            <p className="mt-3 text-3xl font-extrabold">{t.value ?? '–'}</p>
            <p className="text-xs text-white/50">{t.label}</p>
          </Link>
        ))}
      </div>

      {!!home?.continue_watching.length && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Continue assistindo</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {home.continue_watching.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        </section>
      )}

      {!!home?.trending.length && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Em alta agora</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {home.trending.slice(0, 6).map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
