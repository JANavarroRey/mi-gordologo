import { Outlet, NavLink } from 'react-router-dom';
import { UtensilsCrossed, TrendingUp, ShoppingCart, User, HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { authSyncService } from '@/domain/services/authSyncService';
import { UserSelectionModal } from '@/ui/components/onboarding/UserSelectionModal';
import { TutorialModal } from '@/ui/components/tutorial/TutorialModal';
import { WeeklyWeighInAlert } from '@/ui/components/alerts/WeeklyWeighInAlert';
import { PwaInstallBanner } from '@/ui/components/pwa/PwaInstallBanner';
import { NutritionChatModal } from '@/ui/components/chat/NutritionChatModal';
import { HabitsQuestionnaireModal } from '@/ui/components/onboarding/HabitsQuestionnaireModal';
import { assetUrl } from '@/shared/assets';
import type { FoodIntake, UserProfile } from '@/domain/models/types';
import { personalizeFromIntake } from '@/domain/services/menuPersonalizeService';

export function AppLayout() {
  const [activeUser, setActiveUser] = useState<UserProfile>(() => storageService.getActiveProfile());
  const [showUserModal, setShowUserModal] = useState(
    () => !backendService.isLoggedIn() || !storageService.hasCompletedOnboarding()
  );
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [habitsBusy, setHabitsBusy] = useState(false);
  const [habitsMsg, setHabitsMsg] = useState<string | null>(null);
  const skippedQuizFor = useRef<string | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const next = storageService.getActiveProfile();
      setActiveUser(next);
      if (
        backendService.isLoggedIn() &&
        storageService.needsHabitsQuiz(next.id) &&
        skippedQuizFor.current !== next.id
      ) {
        setShowHabits(true);
      } else if (!storageService.needsHabitsQuiz(next.id)) {
        setShowHabits(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    if (backendService.isLoggedIn()) {
      void authSyncService.hydrateFromServer().then(() => {
        const next = storageService.getActiveProfile();
        setActiveUser(next);
        setShowHabits(storageService.needsHabitsQuiz(next.id) && skippedQuizFor.current !== next.id);
      });
    } else if (storageService.needsHabitsQuiz()) {
      setShowHabits(true);
    }
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const navItems = [
    { to: '/menu', icon: UtensilsCrossed, label: 'Menú' },
    { to: '/compra', icon: ShoppingCart, label: 'Lista' },
    { to: '/seguimiento', icon: TrendingUp, label: 'Progreso' },
    { to: '/perfil', icon: User, label: 'Mi Perfil' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100/70 text-neutral-800 font-sans antialiased">
      <header className="flex-none bg-white border-b border-neutral-200/80 px-3 py-2 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 max-w-md mx-auto">
          {/* Marca: icono del muñeco + título en 1 línea */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={assetUrl('apple-touch-icon.jpg')}
              alt=""
              className="h-9 w-9 rounded-xl object-cover shrink-0 ring-1 ring-emerald-100"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = assetUrl('logo.jpg');
              }}
            />
            <div className="min-w-0">
              <h1 className="text-[15px] sm:text-base font-extrabold font-display text-neutral-900 tracking-tight leading-none whitespace-nowrap">
                Mi Gordólogo
              </h1>
              <p className="text-[10px] font-bold text-emerald-700 italic leading-none mt-0.5 whitespace-nowrap">
                Adelgaza sin comer
              </p>
            </div>
          </div>

          {/* Acciones compactas */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowChat(true)}
              title="Preguntar al Gordólogo"
              className="h-9 w-9 min-h-9 min-w-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors"
              aria-label="Preguntar al Gordólogo"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowTutorialModal(true)}
              title="Ayuda"
              className="h-9 w-9 min-h-9 min-w-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors"
              aria-label="Ayuda"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700" />
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              title="Cambiar de usuario"
              className="h-9 min-h-9 pl-2.5 pr-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-xs font-bold flex items-center gap-0.5 transition-colors"
            >
              <span className="max-w-[4.5rem] truncate text-[11px]">
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
        canDismiss={backendService.isLoggedIn() && storageService.hasCompletedOnboarding()}
        onClose={() => {
          if (backendService.isLoggedIn()) setShowUserModal(false);
        }}
        onSelectUser={(u) => {
          setActiveUser(u);
          setShowUserModal(false);
          window.dispatchEvent(new Event('storage'));
        }}
      />

      <TutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      <NutritionChatModal isOpen={showChat} onClose={() => setShowChat(false)} />

      <HabitsQuestionnaireModal
        isOpen={showHabits && !habitsBusy}
        personName={activeUser.name}
        onClose={() => {
          skippedQuizFor.current = activeUser.id;
          setShowHabits(false);
        }}
        onComplete={(intake: FoodIntake) => {
          setHabitsBusy(true);
          setHabitsMsg(null);
          void personalizeFromIntake(intake)
            .then((msg) => {
              skippedQuizFor.current = null;
              setHabitsMsg(msg);
              setShowHabits(false);
              setActiveUser(storageService.getActiveProfile());
              window.dispatchEvent(new Event('storage'));
            })
            .catch((err: unknown) => {
              setHabitsMsg(err instanceof Error ? err.message : 'No se pudo adaptar el menú.');
              setShowHabits(true);
            })
            .finally(() => setHabitsBusy(false));
        }}
      />
      {(habitsBusy || habitsMsg) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[90%] rounded-2xl bg-neutral-900 text-white text-[11px] px-3 py-2 shadow-lg">
          {habitsBusy ? 'Adaptando comidas y cenas…' : habitsMsg}
        </div>
      )}
    </div>
  );
}
