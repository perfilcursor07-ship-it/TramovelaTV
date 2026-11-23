import { ReactNode, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { useSettings } from './lib/settings';
import SiteLayout from './components/SiteLayout';
import { FullScreenLoader } from './components/ui';
import Home from './pages/Home';
import Explore from './pages/Explore';
import NovelPage from './pages/NovelPage';
import Watch from './pages/Watch';
import { Login, Register } from './pages/Auth';
import NotFound from './pages/NotFound';
import DashboardLayout from './dashboard/DashboardLayout';
import Overview from './dashboard/user/Overview';
import Library from './dashboard/user/Library';
import MyOrders from './dashboard/user/MyOrders';
import Favorites from './dashboard/user/Favorites';
import Profile from './dashboard/user/Profile';
import AdminStats from './dashboard/admin/AdminStats';
import AdminNovels from './dashboard/admin/AdminNovels';
import AdminNovelEdit from './dashboard/admin/AdminNovelEdit';
import AdminOrders from './dashboard/admin/AdminOrders';
import AdminUsers from './dashboard/admin/AdminUsers';
import AdminComments from './dashboard/admin/AdminComments';
import AdminSettings from './dashboard/admin/AdminSettings';

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/painel" replace />;
  return <>{children}</>;
}

export default function App() {
  const settings = useSettings();
  useEffect(() => {
    document.title = settings.site_name;
  }, [settings.site_name]);

  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="explorar" element={<Explore />} />
        <Route path="novela/:slug" element={<NovelPage />} />
        <Route path="entrar" element={<Login />} />
        <Route path="cadastro" element={<Register />} />
      </Route>

      <Route path="assistir/:slug/:ep?" element={<Watch />} />

      <Route
        path="painel"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="biblioteca" element={<Library />} />
        <Route path="favoritos" element={<Favorites />} />
        <Route path="pedidos" element={<MyOrders />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="admin" element={<RequireAuth admin><AdminStats /></RequireAuth>} />
        <Route path="admin/novelas" element={<RequireAuth admin><AdminNovels /></RequireAuth>} />
        <Route path="admin/novelas/nova" element={<RequireAuth admin><AdminNovelEdit /></RequireAuth>} />
        <Route path="admin/novelas/:id" element={<RequireAuth admin><AdminNovelEdit /></RequireAuth>} />
        <Route path="admin/pedidos" element={<RequireAuth admin><AdminOrders /></RequireAuth>} />
        <Route path="admin/usuarios" element={<RequireAuth admin><AdminUsers /></RequireAuth>} />
        <Route path="admin/comentarios" element={<RequireAuth admin><AdminComments /></RequireAuth>} />
        <Route path="admin/configuracoes" element={<RequireAuth admin><AdminSettings /></RequireAuth>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
