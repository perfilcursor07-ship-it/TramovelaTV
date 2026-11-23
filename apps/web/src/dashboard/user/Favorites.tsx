import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { api } from '../../lib/api';
import { NovelCard } from '../../components/NovelCard';
import { Empty, FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function Favorites() {
  const { data, isLoading } = useQuery({ queryKey: ['me', 'favorites'], queryFn: api.me.favorites });
  return (
    <div>
      <PageHeader title="Minha lista" subtitle="Novelas que você salvou para assistir." />
      {isLoading ? (
        <FullScreenLoader />
      ) : data?.data.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {data.data.map((n) => (
            <NovelCard key={n.id} novel={n} />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Bookmark className="h-10 w-10" />}
          title="Sua lista está vazia"
          text="Toque em “Minha lista” na página de uma novela para salvá-la aqui."
          action={<Link to="/explorar" className="btn-primary">Explorar</Link>}
        />
      )}
    </div>
  );
}
