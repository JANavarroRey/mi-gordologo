import React, { useEffect, useState } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { authSyncService } from '@/domain/services/authSyncService';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';

interface Props {
  isOpen: boolean;
  onSelectUser: (user: UserProfile) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const UserSelectionModal: React.FC<Props> = ({
  isOpen,
  onSelectUser,
  canDismiss = false,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => storageService.getProfiles());
  const [hasUsers, setHasUsers] = useState(true);
  const [backendOk, setBackendOk] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pepePassword, setPepePassword] = useState('');
  const [mariaPassword, setMariaPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const authIsPepe = backendService.isAuthSuperadmin() && backendService.isLoggedIn();

  useEffect(() => {
    if (!isOpen) return;
    setProfiles(storageService.getProfiles());
    setMsg(null);
    setPassword('');
    setSelectedId(null);
    void backendService.status().then((res) => {
      setBackendOk(Boolean(res.ok && res.backend));
      setHasUsers(Boolean(res.hasUsers));
      if (res.users?.length) {
        const mapped = res.users.map((u) => {
          const local = storageService.getProfileById(u.id);
          return (
            local || {
              id: u.id,
              name: u.name,
              age: 0,
              height: 0,
              targetCalories: 1500,
              linkedMenuUserId: null,
              createdAt: new Date().toISOString(),
              role: u.role === 'superadmin' ? 'superadmin' : 'member',
            }
          );
        });
        setProfiles(mapped as UserProfile[]);
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const finish = async (userId: string) => {
    await authSyncService.hydrateFromServer();
    const user = storageService.getProfileById(userId) || storageService.getActiveProfile();
    storageService.setActiveUserId(user.id);
    onSelectUser(user);
    if (onClose) onClose();
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const extra = authSyncService.collectMigrationPayload();
    const res = await backendService.bootstrapUsers(pepePassword, mariaPassword, extra);
    if (res.ok && res.token) {
      authSyncService.applyLogin(res);
      await finish('pepe');
    } else {
      setMsg(res.error || 'No se pudieron crear las cuentas.');
    }
    setBusy(false);
  };

  const handlePick = async (p: UserProfile) => {
    setMsg(null);
    if (authIsPepe) {
      setBusy(true);
      const res = await backendService.openAsUser(p.id);
      if (res.ok) {
        storageService.setActiveUserId(p.id);
        await finish(p.id);
      } else {
        setMsg(res.error || 'No se pudo abrir el perfil.');
      }
      setBusy(false);
      return;
    }
    setSelectedId(p.id);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setMsg(null);
    const res = await backendService.login(selectedId, password);
    if (res.ok && res.token) {
      authSyncService.applyLogin(res);
      await finish(selectedId);
    } else {
      setMsg(res.error || 'No se pudo entrar.');
    }
    setBusy(false);
  };

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
          <p className="text-xs font-medium text-neutral-600">
            {!hasUsers ? 'Crea las contraseñas de Pepe y María' : '¿Quién va a usar la aplicación hoy?'}
          </p>
        </div>

        {!backendOk && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
            El servidor no responde. Sin él no se pueden guardar cuentas ni la clave de Gemini.
          </p>
        )}

        {!hasUsers && backendOk && (
          <form onSubmit={(e) => void handleBootstrap(e)} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contraseña de Pepe (mín. 8)</label>
              <input
                type="password"
                value={pepePassword}
                onChange={(e) => setPepePassword(e.target.value)}
                minLength={8}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contraseña de María (mín. 6)</label>
              <input
                type="password"
                value={mariaPassword}
                onChange={(e) => setMariaPassword(e.target.value)}
                minLength={6}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
            >
              Crear cuentas y entrar como Pepe
            </button>
          </form>
        )}

        {hasUsers && (
          <div className="space-y-2 mb-4">
            {profiles.map((p) => {
              const isMaria = p.id === 'maria_ignacia';
              const isPepe = p.id === 'pepe';
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePick(p)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                    selectedId === p.id
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : isMaria
                      ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500 shadow-2xs'
                      : isPepe
                      ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500 text-white'
                      : 'bg-neutral-50/80 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                        isMaria ? 'bg-emerald-700 text-white' : isPepe ? 'bg-white text-neutral-900' : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isPepe && selectedId !== p.id ? 'text-white' : 'text-neutral-900'}`}>
                        {p.name}
                      </h4>
                      <p className={`text-[11px] ${isPepe && selectedId !== p.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {isMaria
                          ? 'Plan Morales Meseguer (1.500 kcal)'
                          : isPepe
                          ? authIsPepe
                            ? 'Superadmin · tocar para entrar'
                            : 'Superadmin · requiere contraseña'
                          : `${p.targetCalories} kcal`}
                      </p>
                    </div>
                  </div>
                  {authIsPepe ? (
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {hasUsers && selectedId && !authIsPepe && (
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-2">
            <label className="block text-[11px] font-bold text-neutral-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoFocus
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
            >
              Entrar
            </button>
          </form>
        )}

        {msg && <p className="text-[11px] text-rose-700 mt-2">{msg}</p>}

        {canDismiss && onClose && backendService.isLoggedIn() && (
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
