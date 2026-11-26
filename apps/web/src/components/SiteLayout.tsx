import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Home, LayoutDashboard, LogIn, Search, User } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settings';
import { Logo } from './ui';

export default function SiteLayout() {
  const { user } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    nav(`/explorar?search=${encodeURIComponent(q.trim())}`);
  };

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx('text-sm font-semibold transition', isActive ? 'text-white' : 'text-white/55 hover:text-white');

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          scrolled ? 'bg-ink-950/85 backdrop-blur-xl border-b border-white/5' : 'bg-gradient-to-b from-black/70 to-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" end className={link}>
              Início
            </NavLink>
            <NavLink to="/explorar" className={link}>
              Explorar
            </NavLink>
            {user && (
              <NavLink to="/painel/biblioteca" className={link}>
                Minhas novelas
              </NavLink>
            )}
          </nav>
          <form onSubmit={search} className="ml-auto hidden max-w-xs flex-1 sm:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar novelas..."
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-brand-500"
              />
            </div>
          </form>
          {user ? (
            <Link to={user.role === 'admin' ? '/painel/admin' : '/painel'} className="ml-auto flex items-center gap-2 sm:ml-0">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link to="/entrar" className="btn-primary ml-auto py-2 sm:ml-0">
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-16 hidden border-t border-white/5 py-10 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-white/40">
          <Logo className="opacity-70" />
          <p>{settings.site_tagline}</p>
          <div className="flex items-center gap-5">
            <Link to="/contato" className="hover:text-white">Contato e ajuda</Link>
            <span>© {new Date().getFullYear()} {settings.site_name}</span>
          </div>
        </div>
      </footer>

      {/* navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-white/5 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {[
          { to: '/', icon: Home, label: 'Início', end: true },
          { to: '/explorar', icon: Compass, label: 'Explorar' },
          { to: user ? '/painel' : '/entrar', icon: user ? LayoutDashboard : User, label: user ? 'Painel' : 'Entrar' },
        ].map((i) => (
          <NavLink
            key={i.label}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', isActive ? 'text-brand-400' : 'text-white/50')
            }
          >
            <i.icon className="h-5 w-5" />
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
