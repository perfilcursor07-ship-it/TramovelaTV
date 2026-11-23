import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Library as LibIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { NovelCard } from '../../components/NovelCard';
import { Empty, FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function Library() {
  const { data, isLoading } = useQuery({ queryKey: ['me', 'library'], queryFn: api.me.library });
  return (
    <div>
      <PageHeader title="Minhas novelas" subtitle="Novelas desbloqueadas com acesso completo." />
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
          icon={<LibIcon className="h-10 w-10" />}
          title="Nenhuma novela desbloqueada"
          text="Escolha uma novela e desbloqueie todos os episódios."
          action={<Link to="/explorar" className="btn-primary">Explorar novelas</Link>}
        />
      )}
    </div>
  );
}
