import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { maskCpf, maskPhone } from '@novelas/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { PageHeader } from '../DashboardLayout';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [cpf, setCpf] = useState(user?.cpf ? maskCpf(user.cpf) : '');
  const [phone, setPhone] = useState(user?.phone ? maskPhone(user.phone) : '');
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.me.updateProfile({
        name,
        cpf,
        phone,
        ...(pw ? { current_password: cur, new_password: pw } : {}),
      });
      setUser(r.user);
      setCur('');
      setPw('');
      toast.success('Perfil atualizado!');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Perfil" subtitle={user?.email} />
      <form onSubmit={save} className="card space-y-5 p-6">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">CPF (para pagamento Pix)</label>
            <input className="input" value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="label">Celular</label>
            <input className="input" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div className="border-t border-white/5 pt-5">
          <p className="mb-3 text-sm font-semibold text-white/70">Trocar senha</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" type="password" placeholder="Senha atual" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
            <input className="input" type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={6} />
          </div>
        </div>
        <button disabled={busy} className="btn-primary">{busy ? 'Salvando...' : 'Salvar alterações'}</button>
      </form>
    </div>
  );
}
