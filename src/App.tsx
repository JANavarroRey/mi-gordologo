import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './ui/components/layout/AppLayout';
import { ScrollToTop } from './ui/components/layout/ScrollToTop';

const MenuPage = lazy(() => import('./ui/pages/MenuPage').then((m) => ({ default: m.MenuPage })));
const TrackingPage = lazy(() => import('./ui/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })));
const ShoppingPage = lazy(() => import('./ui/pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })));
const ProfilePage = lazy(() => import('./ui/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] space-y-2">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-neutral-500">Cargando…</p>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/menu" replace />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/seguimiento" element={<TrackingPage />} />
            <Route path="/compra" element={<ShoppingPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
