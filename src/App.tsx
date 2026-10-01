import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './ui/components/layout/AppLayout';

const MenuPage = lazy(() => import('./ui/pages/MenuPage').then((m) => ({ default: m.MenuPage })));
const TrackingPage = lazy(() => import('./ui/pages/TrackingPage').then((m) => ({ default: m.TrackingPage })));
const ShoppingPage = lazy(() => import('./ui/pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })));
const ProfilePage = lazy(() => import('./ui/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
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
