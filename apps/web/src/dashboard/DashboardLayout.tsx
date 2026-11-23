import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  BarChart3,
  Bookmark,
  Clapperboard,
  ExternalLink,
  Home,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  ShoppingBag,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/ui';

const userItems = [
  { to: '/painel', label: 'Início', icon: Home, end: true },
  { to: '/painel/biblioteca', label: 'Minhas novelas', icon: Library },
  { to: '/painel/favoritos', label: 'Minha lista', icon: Bookmark },
  { to: '/painel/pedidos', label: 'Meus pedidos', icon: ShoppingBag },
  { to: '/painel/perfil', label: 'Perfil', icon: UserCircle },
];

const adminItems = [
  { to: '/painel/admin', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/painel/admin/novelas', label: 'Novelas & vídeos', icon: Clapperboard },
  { to: '/painel/admin/pedidos', label: 'Pedidos', icon: Receipt },
  { to: '/painel/admin/usuarios', label: 'Usuários', icon: Users },
  { to: '/painel/admin/comentarios', label: 'Comentários', icon: MessageSquare },
  { to: '/painel/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const item = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
      isActive ? 'bg-white/[.08] text-white' : 'text-white/55 hover:bg-white/[.04] hover:text-white',
    );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-2 pt-2">
        <Logo />
        <button className="rounded-lg p-1 text-white/60 lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {user?.role === 'admin' && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-white/30">Administração</p>
            <div className="space-y-1">
              {adminItems.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={item}>
                  <i.icon className="h-[18px] w-[18px]" /> {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-white/30">Minha conta</p>
          <div className="space-y-1">
            {userItems.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={item}>
                <i.icon className="h-[18px] w-[18px]" /> {i.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className="space-y-1 border-t border-white/5 pt-4">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-[18px] w-[18px]" /> Ver site
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="h-[18px] w-[18px]" /> Sair
        </button>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold">{user?.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-white/40">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      {/* menu vertical à esquerda */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/5 bg-ink-900 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/5 bg-ink-900 animate-float-up">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-ink-950/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-white/5" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
