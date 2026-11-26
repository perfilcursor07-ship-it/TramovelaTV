import { FormEvent, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BadgeCheck, Compass, Headphones, Home, LayoutDashboard, Lock, LogIn, Search, ShieldCheck, User, Zap } from 'lucide-react';
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

      <footer className="mt-16 border-t border-white/5 pb-28 pt-10 md:pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* selos de confiança */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'Pagamento seguro', text: 'Pix processado pelo PagBank' },
              { icon: Zap, title: 'Liberação na hora', text: 'Pagou, assistiu em segundos' },
              { icon: BadgeCheck, title: 'Sem assinatura', text: 'Sem mensalidade nem cobrança automática' },
              { icon: Headphones, title: 'Suporte de verdade', text: 'Fale com a gente quando precisar' },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-3 sm:p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <b.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <b className="block text-sm text-white/90">{b.title}</b>
                  <span className="text-xs leading-snug text-white/45">{b.text}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/5 pt-6 text-sm text-white/40 md:flex-row md:justify-between">
            <Logo className="opacity-80" />
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link to="/explorar" className="hover:text-white">Novelas</Link>
              <Link to={user ? '/painel/biblioteca' : '/entrar'} className="hover:text-white">Minhas novelas</Link>
              <Link to="/contato" className="hover:text-white">Contato e ajuda</Link>
              {settings.support_whatsapp && (
                <a
                  href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, '').replace(/^(?!55)/, '55')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              )}
            </nav>
            <p className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" /> Site seguro · © {new Date().getFullYear()} {settings.site_name}
            </p>
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
