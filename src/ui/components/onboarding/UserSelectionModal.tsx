import React, { useEffect, useState } from 'react';
import { ArrowRight, Lock, Mail, UserPlus, KeyRound } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { authSyncService } from '@/domain/services/authSyncService';
import { getAccessToken, getSupabase } from '@/domain/services/supabaseClient';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';

interface Props {
  isOpen: boolean;
  onSelectUser: (user: UserProfile) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

type Mode = 'login' | 'signup' | 'forgot' | 'bootstrap' | 'switch';

export const UserSelectionModal: React.FC<Props> = ({
  isOpen,
  onSelectUser,
  canDismiss = false,
  onClose,
}) => {
  const [mode, setMode] = useState<Mode>('login');
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [backendOk, setBackendOk] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const authIsPepe = backendService.isAuthSuperadmin() && backendService.isApproved();

  useEffect(() => {
    if (!isOpen) return;
    setMsg(null);
    setPassword('');
    setPendingStatus(null);

    void (async () => {
      const st = await backendService.status();
      setBackendOk(Boolean(st.ok && st.backend));
      const bootstrap = Boolean(st.needsBootstrap);
      setNeedsBootstrap(bootstrap);

      const token = await getAccessToken();
      if (token && backendService.isApproved()) {
        setMode('switch');
        const state = await backendService.getState();
        if (state.users?.length) {
          setProfiles(
            state.users
              .filter((u) => u.status === 'approved' || !u.status)
              .map((u) => {
                const local = storageService.getProfileById(u.id);
                return (
                  local || {
                    id: u.id,
                    name: u.name,
                    age: u.age ?? 0,
                    height: u.height ?? 0,
                    targetCalories: u.targetCalories ?? 1500,
                    linkedMenuUserId: null,
                    createdAt: u.createdAt || new Date().toISOString(),
                    role: u.role === 'superadmin' ? 'superadmin' : 'member',
                    email: u.email,
                    status: 'approved' as const,
                  }
                );
              })
          );
        } else {
          setProfiles(storageService.getProfiles());
        }
        return;
      }

      if (token) {
        const mine = await backendService.getMyProfile();
        const status = mine.status || mine.authUser?.status || backendService.getAuthStatus();
        setPendingStatus(status || 'pending');
        if (mine.authUser) {
          storageService.upsertProfile({
            id: mine.authUser.id,
            name: mine.authUser.name,
            age: mine.authUser.age ?? 0,
            height: mine.authUser.height ?? 0,
            targetCalories: mine.authUser.targetCalories ?? 1500,
            linkedMenuUserId: null,
            createdAt: mine.authUser.createdAt || new Date().toISOString(),
            role: mine.authUser.role === 'superadmin' ? 'superadmin' : 'member',
            email: mine.authUser.email,
            status:
              status === 'approved' || status === 'rejected' || status === 'pending'
                ? status
                : 'pending',
          });
        }
      }

      setMode(bootstrap ? 'bootstrap' : 'login');
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const finishApproved = async () => {
    await authSyncService.hydrateFromServer();
    const user = storageService.getActiveProfile();
    storageService.setActiveUserId(user.id);
    onSelectUser(user);
    if (onClose) onClose();
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const extra = authSyncService.collectMigrationPayload();
    const res = await backendService.bootstrapAdmin(email, password, name || 'Admin', extra);
    if (!res.ok) {
      setMsg(res.error || 'No se pudo crear el administrador.');
      setBusy(false);
      return;
    }
    const sign = await authSyncService.signInWithPassword(email, password);
    if (sign.ok && sign.status === 'approved') {
      await finishApproved();
    } else {
      setMsg(sign.error || res.message || 'Admin creado. Entra con tu email.');
      setMode('login');
      setNeedsBootstrap(false);
    }
    setBusy(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await authSyncService.signInWithPassword(email, password);
    if (!res.ok) {
      setMsg(res.error || 'No se pudo entrar.');
      setBusy(false);
      return;
    }
    if (res.status === 'approved') {
      await finishApproved();
    } else {
      setPendingStatus(res.status || 'pending');
      setMsg(
        res.status === 'rejected'
          ? 'Tu cuenta fue rechazada.'
          : 'Cuenta creada. Un administrador debe aprobarte antes de usar la app.'
      );
    }
    setBusy(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (password.length < 6) {
      setMsg('La contraseña debe tener al menos 6 caracteres.');
      setBusy(false);
      return;
    }
    const res = await authSyncService.signUp(email, password, name);
    if (!res.ok) {
      setMsg(res.error || 'No se pudo registrar.');
      setBusy(false);
      return;
    }
    if ('status' in res && res.status === 'confirm_email') {
      const confirmMsg =
        'message' in res && typeof res.message === 'string'
          ? res.message
          : 'Revisa tu email para confirmar la cuenta.';
      setMsg(confirmMsg);
      setMode('login');
      setBusy(false);
      return;
    }
    if (res.status === 'approved') {
      await finishApproved();
    } else {
      setPendingStatus(res.status || 'pending');
      setMsg('Registro listo. Cuando un admin te apruebe podrás usar la app.');
    }
    setBusy(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await authSyncService.requestPasswordReset(email);
    if (res.ok) {
      setMsg('Si el email existe, recibirás un enlace para restablecer la contraseña.');
      setMode('login');
    } else {
      setMsg(res.error || 'No se pudo enviar el email.');
    }
    setBusy(false);
  };

  const handlePick = async (p: UserProfile) => {
    setMsg(null);
    if (!authIsPepe) return;
    setBusy(true);
    const res = await backendService.openAsUser(p.id);
    if (res.ok) {
      storageService.setActiveUserId(p.id);
      await finishApproved();
    } else {
      setMsg(res.error || 'No se pudo abrir el perfil.');
    }
    setBusy(false);
  };

  const handleLogoutPending = async () => {
    setBusy(true);
    await backendService.logout();
    setPendingStatus(null);
    setMode(needsBootstrap ? 'bootstrap' : 'login');
    setBusy(false);
  };

  const title =
    mode === 'bootstrap'
      ? 'Primer administrador'
      : mode === 'signup'
        ? 'Crear cuenta'
        : mode === 'forgot'
          ? 'Recuperar contraseña'
          : mode === 'switch'
            ? 'Cambiar de perfil'
            : pendingStatus && pendingStatus !== 'approved'
              ? 'Cuenta pendiente'
              : 'Entrar';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-5">
          <img
            src={assetUrl('logo.jpg')}
            alt="Mi Gordólogo"
            className="h-24 w-auto mx-auto object-contain mb-2"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="h-0.5 w-10 bg-emerald-200 mx-auto my-2 rounded-full" />
          <p className="text-xs font-medium text-neutral-600">{title}</p>
        </div>

        {!backendOk && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
            El servidor no responde. Configura Supabase para registro y recuperación por email.
          </p>
        )}

        {pendingStatus && pendingStatus !== 'approved' && mode !== 'bootstrap' && (
          <div className="space-y-3 mb-3">
            <p className="text-[12px] text-neutral-700 leading-relaxed bg-amber-50 border border-amber-200 rounded-2xl p-3">
              {pendingStatus === 'rejected'
                ? 'Tu cuenta fue rechazada. Contacta con quien te compartió el enlace.'
                : 'Tu cuenta está pendiente de aprobación. Cuando un administrador te acepte, vuelve a entrar.'}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogoutPending()}
              className="w-full py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {mode === 'bootstrap' && backendOk && (
          <form onSubmit={(e) => void handleBootstrap(e)} className="space-y-3">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Primera vez: crea el administrador con tu email. El resto se registrará solo y tú los aprobarás.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contraseña (mín. 8)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
            >
              Crear administrador
            </button>
          </form>
        )}

        {mode === 'login' && !pendingStatus && (
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <Mail className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <Lock className="w-3.5 h-3.5" /> Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="current-password"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              Entrar
            </button>
            <div className="flex justify-between gap-2 text-[11px]">
              <button type="button" className="text-emerald-800 font-semibold" onClick={() => setMode('signup')}>
                Crear cuenta
              </button>
              <button type="button" className="text-neutral-500" onClick={() => setMode('forgot')}>
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={(e) => void handleSignup(e)} className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <UserPlus className="w-3.5 h-3.5" /> Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contraseña (mín. 6)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Tras registrarte, un administrador debe aprobar tu cuenta antes de usar la app.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              Registrarme
            </button>
            <button type="button" className="w-full text-[11px] text-neutral-500" onClick={() => setMode('login')}>
              Ya tengo cuenta
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={(e) => void handleForgot(e)} className="space-y-3">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Te enviaremos un enlace para elegir una contraseña nueva (requiere SMTP/Resend configurado).
            </p>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <KeyRound className="w-3.5 h-3.5" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
            >
              Enviar enlace
            </button>
            <button type="button" className="w-full text-[11px] text-neutral-500" onClick={() => setMode('login')}>
              Volver a entrar
            </button>
          </form>
        )}

        {mode === 'switch' && (
          <div className="space-y-2 mb-2">
            {!authIsPepe && (
              <p className="text-[11px] text-neutral-500 mb-2">
                Sesión activa: {storageService.getActiveProfile().name}
              </p>
            )}
            {authIsPepe &&
              profiles.map((p) => {
                const isMaria = p.id === 'maria_ignacia';
                const isPepe = p.id === 'pepe';
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePick(p)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isMaria
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : isPepe
                          ? 'bg-neutral-800 border-neutral-700 text-white'
                          : 'bg-neutral-50/80 border-neutral-200'
                    }`}
                  >
                    <div>
                      <h4 className={`font-bold text-sm ${isPepe ? 'text-white' : 'text-neutral-900'}`}>{p.name}</h4>
                      <p className={`text-[11px] ${isPepe ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {p.email || (isPepe ? 'Superadmin' : `${p.targetCalories} kcal`)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </button>
                );
              })}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogoutPending()}
              className="w-full py-2.5 rounded-2xl border border-rose-200 text-rose-800 text-xs font-bold mt-2"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {msg && <p className="text-[11px] text-rose-700 mt-2 leading-relaxed">{msg}</p>}

        {canDismiss && onClose && backendService.isApproved() && (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 py-2 mt-2"
          >
            Cerrar sin cambiar
          </button>
        )}
      </div>
    </div>
  );
};

/** Escucha sesión Auth al arrancar (p. ej. tras confirmar email). */
export function useAuthSessionBootstrap(onReady: () => void) {
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      onReady();
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        void authSyncService.syncAfterAuth().finally(onReady);
      } else {
        onReady();
      }
    });
  }, [onReady]);
}
