import { FormEvent, ReactNode, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Logo } from '../components/ui';

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const s = useSettings();
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-24">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-brand-500/25 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-flame/20 blur-[120px]" />
      <div className="card relative w-full max-w-md p-8 animate-float-up">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-white/50">{subtitle || s.site_tagline}</p>
        {children}
      </div>
    </div>
  );
}

function useNext() {
  const [sp] = useSearchParams();
  const next = sp.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const next = useNext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next || (user.role === 'admin' ? '/painel/admin' : '/')} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(email, password);
      nav(next || (u.role === 'admin' ? '/painel/admin' : '/'), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Bem-vindo de volta" subtitle="Entre para continuar suas novelas.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3.5 text-base">{busy ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-white/50">
        Ainda não tem conta?{' '}
        <Link to={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-400 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </Shell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const next = useNext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next || '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(name, email, password);
      nav(next || '/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Crie sua conta" subtitle="Leva 10 segundos. Assista, curta e comente.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3.5 text-base">{busy ? 'Criando...' : 'Criar conta'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-white/50">
        Já tem conta?{' '}
        <Link to={`/entrar${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-400 hover:underline">
          Entrar
        </Link>
      </p>
    </Shell>
  );
}
