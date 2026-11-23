import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Gift, Search } from 'lucide-react';
import type { User } from '@novelas/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { FullScreenLoader, Modal, StatusBadge } from '../../components/ui';
import { PageHeader } from '../DashboardLayout';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [grantFor, setGrantFor] = useState<User | null>(null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', search], queryFn: () => api.admin.users(search) });

  const setRole = async (u: User, role: 'admin' | 'user') => {
    if (!confirm(`Alterar ${u.name} para ${role === 'admin' ? 'ADMINISTRADOR' : 'usuário comum'}?`)) return;
    try {
      await api.admin.setRole(u.id, role);
      toast.success('Nível de acesso atualizado');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gerencie níveis de acesso e libere novelas como cortesia." />
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input className="input pl-9" placeholder="Nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <FullScreenLoader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-white/40">
              <tr className="border-b border-white/5">
                <th className="p-3">Usuário</th>
                <th className="p-3">Nível</th>
                <th className="p-3">Novelas</th>
                <th className="p-3">Cadastro</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-white/40">{u.email}</p>
                  </td>
                  <td className="p-3"><StatusBadge status={u.role} /></td>
                  <td className="p-3 tabular-nums">{u.purchases}</td>
                  <td className="p-3 text-xs text-white/50">{u.created_at && new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setGrantFor(u)} className="btn-ghost px-3 py-1.5 text-xs">
                        <Gift className="h-3.5 w-3.5" /> Liberar novela
                      </button>
                      {u.id !== me?.id && (
                        <button onClick={() => setRole(u, u.role === 'admin' ? 'user' : 'admin')} className="btn-outline px-3 py-1.5 text-xs">
                          {u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {grantFor && <GrantModal user={grantFor} onClose={() => setGrantFor(null)} />}
    </div>
  );
}

function GrantModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin', 'novels', ''], queryFn: () => api.admin.novels('') });
  const [novelId, setNovelId] = useState('');
  const grant = async () => {
    if (!novelId) return;
    await api.admin.grant(user.id, Number(novelId));
    toast.success('Novela liberada!');
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    onClose();
  };
  return (
    <Modal open onClose={onClose}>
      <h3 className="mb-1 text-lg font-bold">Liberar novela</h3>
      <p className="mb-4 text-sm text-white/50">Para {user.name}, sem cobrança.</p>
      <select className="input" value={novelId} onChange={(e) => setNovelId(e.target.value)}>
        <option value="">Selecione a novela...</option>
        {data?.data.map((n) => (
          <option key={n.id} value={n.id}>{n.title}</option>
        ))}
      </select>
      <button onClick={grant} disabled={!novelId} className="btn-primary mt-4 w-full">Liberar acesso</button>
    </Modal>
  );
}
