import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { NovelCard } from '../components/NovelCard';
import { Empty, FullScreenLoader } from '../components/ui';

export default function Explore() {
  const [sp, setSp] = useSearchParams();
  const search = sp.get('search') || '';
  const genre = sp.get('genre') || '';
  const [q, setQ] = useState(search);
  useEffect(() => setQ(search), [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['novels', search, genre],
    queryFn: () => api.catalog.novels({ search, genre }),
  });

  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
      <h1 className="text-3xl font-extrabold">Explorar</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          set('search', q.trim());
        }}
        className="relative mt-5"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input className="input rounded-full py-3.5 pl-12" placeholder="Busque pelo nome da novela..." value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {['', ...(data?.genres ?? [])].map((g) => (
          <button
            key={g || 'all'}
            onClick={() => set('genre', g)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              genre === g ? 'bg-white text-ink-950' : 'bg-white/5 text-white/70 hover:bg-white/10',
            )}
          >
            {g || 'Todas'}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <FullScreenLoader />
        ) : data?.data.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.data.map((n) => (
              <NovelCard key={n.id} novel={n} />
            ))}
          </div>
        ) : (
          <Empty icon={<Search className="h-10 w-10" />} title="Nada encontrado" text="Tente outro nome ou gênero." />
        )}
      </div>
    </div>
  );
}
