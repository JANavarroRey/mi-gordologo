import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, UserPlus, KeyRound, Clock, RefreshCw } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { adminService } from '@/domain/services/adminService';
import { authSyncService } from '@/domain/services/authSyncService';
import { getAccessToken } from '@/domain/services/supabaseClient';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';
import { PasswordField, fieldInputClass } from '@/ui/components/forms/PasswordField';

interface Props {
  isOpen: boolean;
  onSelectUser: (user: UserProfile) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

type Mode = 'login' | 'signup' | 'forgot' | 'bootstrap' | 'pending' | 'switch';
type MsgTone = 'error' | 'success' | 'info';

export const UserSelectionModal: React.FC<Props> = ({
  isOpen,
  onSelectUser,
  canDismiss = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [backendOk, setBackendOk] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<MsgTone>('error');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [pendingStatus, setPendingStatus] = useState<'pending' | 'rejected' | null>(null);

  const isVerifiedAdmin = backendService.isVerifiedAdmin();
  const authUserId = backendService.getAuthUserId();

  const showMessage = (text: string | null, tone: MsgTone = 'error') => {
    setMsg(text);
    setMsgTone(tone);
  };

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      const st = await backendService.status();
      if (cancelled) return;
      setBackendOk(Boolean(st.ok && st.backend));
      const bootstrap = Boolean(st.needsBootstrap);
      setNeedsBootstrap(bootstrap);
      setMsg(null);
      setPassword('');

      const token = await getAccessToken();
      if (cancelled) return;

      if (token && backendService.isApproved()) {
        if (backendService.isVerifiedAdmin()) {
          setMode('switch');
          const state = await backendService.getState();
          if (cancelled) return;
          if (state.users?.length) {
            setProfiles(
              state.users
                .filter((u) => u.status === 'approved')
                .map((u) => ({
                  id: u.id,
                  name: u.name,
                  age: u.age ?? 0,
                  height: u.height ?? 0,
                  targetCalories: u.targetCalories ?? 1500,
                  linkedMenuUserId: null,
                  createdAt: u.createdAt || '',
                  role: u.role === 'superadmin' ? 'superadmin' : 'member',
                  email: u.email,
                  status: 'approved',
                }))
            );
          } else {
            setProfiles(storageService.getProfiles());
          }
          return;
        }
        // Un usuario normal nunca usa selector de otros perfiles
        if (onClose) onClose();
        return;
      }

      if (token) {
        const mine = await backendService.getMyProfile();
        if (cancelled) return;
        const status = mine.status || mine.authUser?.status || backendService.getAuthStatus();
        if (status === 'approved') {
          await authSyncService.syncAfterAuth();
          if (cancelled) return;
          const user = storageService.getActiveProfile();
          onSelectUser(user);
          if (onClose) onClose();
          return;
        }
        setPendingStatus(status === 'rejected' ? 'rejected' : 'pending');
        setMode('pending');
        return;
      }

      setPendingStatus(null);
      setMode(bootstrap ? 'bootstrap' : 'login');
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, onClose, onSelectUser]);

  if (!isOpen) return null;

  const finishApproved = async () => {
    await authSyncService.syncAfterAuth();
    const user = storageService.getActiveProfile();
    onSelectUser(user);
    if (onClose) onClose();
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    showMessage(null);
    const res = await backendService.bootstrapAdmin(email, password, name || 'Admin');
    if (!res.ok) {
      showMessage(res.error || 'No se pudo crear el administrador.', 'error');
      setBusy(false);
      return;
    }
    const sign = await authSyncService.signInWithPassword(email, password);
    if (sign.ok && sign.status === 'approved') {
      await finishApproved();
    } else {
      showMessage(sign.error || res.message || 'Administrador creado. Inicia sesión.', 'success');
      setMode('login');
      setNeedsBootstrap(false);
    }
    setBusy(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    showMessage(null);
    const res = await authSyncService.signInWithPassword(email, password);
    if (!res.ok) {
      showMessage(res.error || 'No se pudo entrar.', 'error');
      setBusy(false);
      return;
    }
    if (res.status === 'approved') {
      await finishApproved();
    } else {
      setPendingStatus(res.status === 'rejected' ? 'rejected' : 'pending');
      setMode('pending');
    }
    setBusy(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    showMessage(null);
    if (password.length < 6) {
      showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
      setBusy(false);
      return;
    }
    const res = await authSyncService.signUp(email, password, name);
    if (!res.ok) {
      showMessage(res.error || 'No se pudo completar el registro.', 'error');
      setBusy(false);
      return;
    }
    setPendingStatus('pending');
    setMode('pending');
    showMessage(
      res.message || 'Solicitud enviada. Cuando el administrador la apruebe podrás entrar.',
      'success'
    );
    setBusy(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    showMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const res = await authSyncService.requestPasswordReset(cleanEmail);
    if (res.ok) {
      showMessage(
        res.message ||
          'Si el email está registrado, recibirás un código de 6 dígitos en unos minutos. Revisa también spam.',
        'success'
      );
    } else {
      showMessage(res.error || 'No se pudo enviar el correo.', 'error');
    }
    setBusy(false);
  };

  const handleCheckApproval = async () => {
    setBusy(true);
    showMessage(null);
    const res = await authSyncService.syncAfterAuth();
    if (res.ok && res.status === 'approved') {
      await finishApproved();
    } else if (res.status === 'rejected') {
      setPendingStatus('rejected');
      showMessage('Tu solicitud fue rechazada. Contacta con el administrador.', 'error');
    } else {
      showMessage('Tu cuenta sigue pendiente de aprobación. Vuelve a comprobarlo más tarde.', 'info');
    }
    setBusy(false);
  };

  const handlePickProfile = async (p: UserProfile) => {
    if (!isVerifiedAdmin) return;
    setBusy(true);
    showMessage(null);
    authSyncService.cancelPendingPush();
    const res = await adminService.openAsUser(p.id);
    if (res.ok) {
      await finishApproved();
    } else {
      showMessage(res.error || 'No se pudo abrir el perfil.', 'error');
    }
    setBusy(false);
  };

  const handleLogout = async () => {
    setBusy(true);
    await backendService.logout();
    setPendingStatus(null);
    setEmail('');
    setPassword('');
    showMessage(null);
    setMode(needsBootstrap ? 'bootstrap' : 'login');
    setBusy(false);
  };

  const title =
    mode === 'bootstrap'
      ? 'Configuración inicial'
      : mode === 'signup'
        ? 'Solicitar cuenta nueva'
        : mode === 'forgot'
          ? 'Recuperar contraseña'
          : mode === 'pending'
            ? pendingStatus === 'rejected'
              ? 'Solicitud rechazada'
              : 'Pendiente de aprobación'
            : mode === 'switch'
              ? 'Cambiar perfil (Admin)'
              : 'Iniciar sesión';

  const msgClasses =
    msgTone === 'success'
      ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
      : msgTone === 'info'
        ? 'text-amber-950 bg-amber-50 border-amber-200'
        : 'text-rose-900 bg-rose-50 border-rose-200';

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-neutral-100 max-h-[92vh] overflow-y-auto">
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
          <p className="text-xs font-bold text-neutral-700">{title}</p>
        </div>

        {!backendOk && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
            No se pudo conectar con el servidor en este momento. Comprueba tu conexión e inténtalo de nuevo.
          </p>
        )}

        {mode === 'pending' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center space-y-2">
              <Clock className="w-7 h-7 text-amber-700 mx-auto" />
              <p className="text-xs font-bold text-amber-950">
                {pendingStatus === 'rejected'
                  ? 'Acceso no autorizado'
                  : 'Tu cuenta está pendiente de aprobación'}
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                {pendingStatus === 'rejected'
                  ? 'Tu solicitud fue rechazada. Si crees que es un error, contacta con quien te compartió el enlace.'
                  : 'Hemos avisado al administrador. En cuanto apruebe tu acceso podrás entrar a tu menú y seguimiento.'}
              </p>
            </div>
            {pendingStatus !== 'rejected' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCheckApproval()}
                className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                Comprobar si ya me aprobaron
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogout()}
              className="w-full py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {mode === 'bootstrap' && backendOk && (
          <form onSubmit={(e) => void handleBootstrap(e)} className="space-y-3">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Primera configuración: crea la cuenta del administrador autorizado.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Contraseña (mín. 8)
              </label>
              <PasswordField
                value={password}
                onChange={setPassword}
                minLength={8}
                required
                autoComplete="new-password"
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

        {mode === 'login' && (
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
                placeholder="tu@email.com"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <Lock className="w-3.5 h-3.5" /> Contraseña
              </label>
              <PasswordField
                value={password}
                onChange={setPassword}
                minLength={6}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <div className="flex justify-between gap-2 text-[11px] pt-1">
              <button
                type="button"
                className="text-emerald-800 font-bold"
                onClick={() => {
                  showMessage(null);
                  setMode('signup');
                }}
              >
                Crear cuenta
              </button>
              <button
                type="button"
                className="text-neutral-600 font-medium"
                onClick={() => {
                  showMessage(null);
                  setMode('forgot');
                }}
              >
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
                minLength={2}
                placeholder="Tu nombre"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="gmail, hotmail, outlook…"
                className={fieldInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Contraseña (mín. 6)
              </label>
              <PasswordField
                value={password}
                onChange={setPassword}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Al registrarte enviaremos tu solicitud al administrador. Podrás acceder en cuanto la apruebe.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Enviando solicitud…' : 'Solicitar registro'}
            </button>
            <button
              type="button"
              className="w-full text-[11px] text-neutral-600 font-medium"
              onClick={() => {
                showMessage(null);
                setMode('login');
              }}
            >
              Ya tengo cuenta · Iniciar sesión
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={(e) => void handleForgot(e)} className="space-y-3">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Te enviaremos un código de 6 dígitos y un enlace a tu correo (funciona con Gmail, Hotmail, Outlook, Yahoo, etc.).
            </p>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <KeyRound className="w-3.5 h-3.5" /> Email de tu cuenta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className={fieldInputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Enviando correo…' : 'Enviar código de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => {
                const q = email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : '';
                navigate(`/restablecer-clave${q}`);
              }}
              className="w-full py-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-bold"
            >
              Ya tengo un código de 6 dígitos
            </button>
            <button
              type="button"
              className="w-full text-[11px] text-neutral-600 font-medium"
              onClick={() => {
                showMessage(null);
                setMode('login');
              }}
            >
              Volver a entrar
            </button>
          </form>
        )}

        {mode === 'switch' && isVerifiedAdmin && (
          <div className="space-y-2 mb-2">
            <p className="text-[11px] text-neutral-500 mb-2">
              Elige un perfil aprobado para consultar o ajustar su menú:
            </p>
            {profiles.map((p) => {
              const isSelfAdmin = p.id === authUserId || p.role === 'superadmin';
              const isMaria = p.id === 'maria_ignacia';
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePickProfile(p)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isSelfAdmin
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : isMaria
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-neutral-50/80 border-neutral-200'
                  }`}
                >
                  <div className="min-w-0">
                    <h4
                      className={`font-bold text-sm truncate ${
                        isSelfAdmin ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      {p.name}
                    </h4>
                    <p
                      className={`text-[11px] truncate ${
                        isSelfAdmin ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      {p.email || (isSelfAdmin ? 'Administrador' : `${p.targetCalories} kcal`)}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>
              );
            })}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogout()}
              className="w-full py-2.5 rounded-2xl border border-rose-200 text-rose-800 text-xs font-bold mt-2"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {msg && (
          <p className={`text-[11px] font-semibold rounded-xl p-2.5 mt-3 leading-relaxed border ${msgClasses}`}>
            {msg}
          </p>
        )}

        {canDismiss && onClose && backendService.isApproved() && (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs text-neutral-500 hover:text-neutral-700 py-2 mt-2"
          >
            Cerrar sin cambiar
          </button>
        )}
      </div>
    </div>
  );
};
