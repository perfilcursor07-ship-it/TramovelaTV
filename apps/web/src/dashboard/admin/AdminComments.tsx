import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquare, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Empty, FullScreenLoader } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function AdminComments() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'comments'], queryFn: api.admin.comments });

  const remove = async (id: number) => {
    if (!confirm('Excluir este comentário?')) return;
    await api.social.deleteComment(id);
    toast.success('Comentário excluído');
    qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
  };

  return (
    <div>
      <PageHeader title="Comentários" subtitle="Modere o que o público está dizendo." />
      {isLoading ? (
        <FullScreenLoader />
      ) : !data?.data.length ? (
        <Empty icon={<MessageSquare className="h-10 w-10" />} title="Nenhum comentário ainda" />
      ) : (
        <div className="space-y-2">
          {data.data.map((c) => (
            <div key={c.id} className="card flex gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/40">
                  <b className="text-white/80">{c.user_name}</b> ({c.user_email}) em{' '}
                  <Link to={`/assistir/${c.novel_slug}/${c.episode_number}`} className="text-brand-400 hover:underline">
                    {c.novel_title} · EP {c.episode_number}
                  </Link>{' '}
                  · {new Date(c.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
              <button onClick={() => remove(c.id)} className="self-start rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-300" aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
