import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  TrendingUp,
  ShoppingCart,
  User,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { adminService } from '@/domain/services/adminService';
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
  const navigate = useNavigate();
  const [activeUser, setActiveUser] = useState<UserProfile>(() => storageService.getActiveProfile());
  const [sessionReady, setSessionReady] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [habitsBusy, setHabitsBusy] = useState(false);
  const [habitsMsg, setHabitsMsg] = useState<string | null>(null);
  const [exitingImpersonation, setExitingImpersonation] = useState(false);
  const skippedQuizFor = useRef<string | null>(null);

  useEffect(() => {
    const syncLocalUi = () => {
      const approved = backendService.isApproved();
      const admin = backendService.isVerifiedAdmin();
      const next = storageService.getActiveProfile();
      setIsApproved(approved);
      setIsVerifiedAdmin(admin);
      setIsImpersonating(backendService.isImpersonating());
      setPendingCount(admin ? backendService.getPendingCount() : 0);
      setActiveUser(next);

      if (approved && next.id && storageService.needsHabitsQuiz(next.id) && skippedQuizFor.current !== next.id) {
        setShowHabits(true);
      } else {
        setShowHabits(false);
      }
    };

    window.addEventListener('storage', syncLocalUi);

    void authSyncService.syncAfterAuth().then((res) => {
      setSessionReady(true);
      if (res.ok && res.status === 'approved') {
        syncLocalUi();
        setShowUserModal(false);
      } else {
        setIsApproved(false);
        setIsVerifiedAdmin(false);
        setIsImpersonating(false);
        setPendingCount(0);
        setShowUserModal(true);
      }
    });

    return () => window.removeEventListener('storage', syncLocalUi);
  }, []);

  useEffect(() => {
    if (!habitsMsg || showHabits) return;
    const t = window.setTimeout(() => setHabitsMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [habitsMsg, showHabits]);

  const handleReturnToAdmin = async () => {
    if (!isVerifiedAdmin) return;
    setExitingImpersonation(true);
    authSyncService.cancelPendingPush();
    const res = await adminService.openAsUser(backendService.getAuthUserId());
    if (res.ok) {
      await authSyncService.syncAfterAuth();
    }
    setExitingImpersonation(false);
  };

  // AuthGate estricto: nunca montamos rutas internas antes de verificar sesión aprobada
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-neutral-100/70 flex flex-col items-center justify-center p-6 space-y-3">
        <img
          src={assetUrl('logo.jpg')}
          alt="Mi Gordólogo"
          className="h-20 w-auto object-contain rounded-2xl"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="w-7 h-7 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-neutral-500">Verificando sesión…</p>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-neutral-100/70">
        <UserSelectionModal
          isOpen={true}
          canDismiss={false}
          onSelectUser={(u) => {
            setActiveUser(u);
            setIsApproved(backendService.isApproved());
            setIsVerifiedAdmin(backendService.isVerifiedAdmin());
            setIsImpersonating(backendService.isImpersonating());
            setPendingCount(backendService.isVerifiedAdmin() ? backendService.getPendingCount() : 0);
            setShowUserModal(false);
            window.dispatchEvent(new Event('storage'));
          }}
        />
      </div>
    );
  }

  const navItems = [
    { to: '/menu', icon: UtensilsCrossed, label: 'Menú', badge: 0 },
    { to: '/compra', icon: ShoppingCart, label: 'Lista', badge: 0 },
    { to: '/seguimiento', icon: TrendingUp, label: 'Progreso', badge: 0 },
    { to: '/perfil', icon: User, label: 'Mi Perfil', badge: isVerifiedAdmin ? pendingCount : 0 },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100/70 text-neutral-800 font-sans antialiased">
      {isImpersonating && (
        <div className="bg-neutral-900 text-white px-3 py-2 sticky top-0 z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold truncate">
                Modo Admin · Viendo perfil de {activeUser.name}
              </span>
            </div>
            <button
              type="button"
              disabled={exitingImpersonation}
              onClick={() => void handleReturnToAdmin()}
              className="px-2.5 py-1 min-h-8 min-w-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
            >
              <ArrowLeft className="w-3 h-3" />
              Volver a Admin
            </button>
          </div>
        </div>
      )}

      <header className="flex-none bg-white border-b border-neutral-200/80 px-3 py-2 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2 max-w-md mx-auto">
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

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowChat(true)}
              title="Preguntar al Gordólogo"
              className="h-9 w-9 min-h-9 min-w-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors"
              aria-label="Preguntar al Gordólogo"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowTutorialModal(true)}
              title="Ayuda"
              className="h-9 w-9 min-h-9 min-w-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors"
              aria-label="Ayuda"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700" />
            </button>
            {isVerifiedAdmin ? (
              <button
                type="button"
                onClick={() => setShowUserModal(true)}
                title="Cambiar de perfil (Admin)"
                className="h-9 min-h-9 pl-2.5 pr-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-xs font-bold flex items-center gap-0.5 transition-colors"
              >
                <span className="max-w-[4.5rem] truncate text-[11px]">
                  {activeUser.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/perfil')}
                title="Mi perfil"
                className="h-9 min-h-9 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-xs font-bold flex items-center transition-colors"
              >
                <span className="max-w-[5rem] truncate text-[11px]">
                  {activeUser.name.split(' ')[0]}
                </span>
              </button>
            )}
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
            {navItems.map(({ to, icon: Icon, label, badge }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-all min-h-[48px] ${
                      isActive
                        ? 'text-emerald-700 font-bold scale-105'
                        : 'text-neutral-500 hover:text-neutral-700 font-medium'
                    }`
                  }
                >
                  <span className="relative">
                    <Icon size={21} strokeWidth={2.2} aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] tracking-tight">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {isVerifiedAdmin && (
        <UserSelectionModal
          isOpen={showUserModal}
          canDismiss={true}
          onClose={() => setShowUserModal(false)}
          onSelectUser={(u) => {
            setActiveUser(u);
            setIsImpersonating(backendService.isImpersonating());
            setShowUserModal(false);
            window.dispatchEvent(new Event('storage'));
          }}
        />
      )}

      <TutorialModal isOpen={showTutorialModal} onClose={() => setShowTutorialModal(false)} />
      <NutritionChatModal isOpen={showChat} onClose={() => setShowChat(false)} />

      <HabitsQuestionnaireModal
        isOpen={showHabits}
        personName={activeUser.name}
        busy={habitsBusy}
        error={
          habitsMsg && /no se pudo|falta|servidor|saturad|desconocida|disponible/i.test(habitsMsg)
            ? habitsMsg
            : null
        }
        onClose={() => {
          skippedQuizFor.current = activeUser.id;
          setShowHabits(false);
          setHabitsMsg(null);
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

      {habitsMsg && !showHabits && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[90%] rounded-2xl bg-neutral-900 text-white text-[11px] px-3 py-2 shadow-lg">
          {habitsMsg}
        </div>
      )}
    </div>
  );
}
