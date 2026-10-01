import { Outlet, NavLink } from 'react-router-dom';
import { UtensilsCrossed, TrendingUp, ShoppingCart, User, HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storageService } from '@/domain/services/storageService';
import { UserSelectionModal } from '@/ui/components/onboarding/UserSelectionModal';
import { TutorialModal } from '@/ui/components/tutorial/TutorialModal';
import { WeeklyWeighInAlert } from '@/ui/components/alerts/WeeklyWeighInAlert';
import { PwaInstallBanner } from '@/ui/components/pwa/PwaInstallBanner';
import { NutritionChatModal } from '@/ui/components/chat/NutritionChatModal';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';

export function AppLayout() {
  const [activeUser, setActiveUser] = useState<UserProfile>(() => storageService.getActiveProfile());
  const [showUserModal, setShowUserModal] = useState(() => !storageService.hasCompletedOnboarding());
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveUser(storageService.getActiveProfile());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const navItems = [
    { to: '/menu', icon: UtensilsCrossed, label: 'Menú' },
    { to: '/seguimiento', icon: TrendingUp, label: 'Progreso' },
    { to: '/compra', icon: ShoppingCart, label: 'Lista' },
    { to: '/perfil', icon: User, label: 'Mi Perfil' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100/70 text-neutral-800 font-sans antialiased">
      <header className="flex-none bg-white border-b border-neutral-200/80 px-4 py-2.5 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-2.5">
            <img
              src={assetUrl('logo.jpg')}
              alt="Mi Gordólogo"
              className="h-11 w-auto max-w-[48px] object-contain shrink-0 rounded-lg"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-base font-extrabold font-display text-neutral-900 tracking-tight leading-tight">
                Mi Gordólogo
              </h1>
              <p className="text-[11px] font-bold text-emerald-700 italic leading-tight">
                Adelgaza sin comer
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowChat(true)}
              title="Preguntar al Gordólogo"
              className="h-10 w-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors"
              aria-label="Preguntar al Gordólogo"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTutorialModal(true)}
              title="Ver guía de uso paso a paso"
              className="h-10 px-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span className="text-[11px] font-bold">Ayuda</span>
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              title="Cambiar de usuario"
              className="h-10 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <span className="max-w-[80px] truncate text-[11px]">
                {activeUser.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 p-3 max-w-md mx-auto w-full">
        <PwaInstallBanner />
        <WeeklyWeighInAlert />
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-2px_15px_rgba(0,0,0,0.04)] z-30">
        <div className="max-w-md mx-auto">
          <ul className="flex justify-around items-center h-16">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all min-h-[48px] ${
                      isActive
                        ? 'text-emerald-700 font-bold scale-105'
                        : 'text-neutral-500 hover:text-neutral-700 font-medium'
                    }`
                  }
                >
                  <Icon size={21} strokeWidth={2.2} aria-hidden="true" />
                  <span className="text-[11px] tracking-tight">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <UserSelectionModal
        isOpen={showUserModal}
        canDismiss={storageService.hasCompletedOnboarding()}
        onClose={() => setShowUserModal(false)}
        onSelectUser={(u) => {
          setActiveUser(u);
          setShowUserModal(false);
        }}
      />

      <TutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      <NutritionChatModal isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
