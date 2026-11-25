import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authSyncService } from '@/domain/services/authSyncService';
import { getSupabase } from '@/domain/services/supabaseClient';
import { knownPasswordsStore } from '@/domain/services/knownPasswordsStore';
import { storageService } from '@/domain/services/storageService';
import { assetUrl } from '@/shared/assets';
import { PasswordField } from '@/ui/components/forms/PasswordField';

function recoveryTokenFromLocation(): string | null {
  const fromHash = window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : '';
  const hashParams = new URLSearchParams(fromHash);
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get('th') || searchParams.get('th');
}

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setMsg('Servidor no configurado.');
      return;
    }

    let cancelled = false;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        markReady();
      }
    });

    void (async () => {
      const th = recoveryTokenFromLocation();
      if (th) {
        const { error } = await sb.auth.verifyOtp({
          token_hash: th,
          type: 'recovery',
        });
        if (error) {
          if (!cancelled) {
            setMsg(
              error.message ||
                'El enlace no es válido o ya se usó. Pide otro desde «Olvidé mi contraseña».'
            );
          }
        } else {
          markReady();
        }
        return;
      }

      const { data } = await sb.auth.getSession();
      if (data.session) markReady();
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setMsg('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const res = await authSyncService.updatePassword(password);
    if (res.ok) {
      const profileId = storageService.getActiveProfile()?.id;
      if (profileId) {
        knownPasswordsStore.set(profileId, password);
      }
      // También por email → id pepe / maria si el active aún no está sincronizado
      await authSyncService.syncAfterAuth().catch(() => null);
      const syncedId = storageService.getActiveProfile()?.id;
      if (syncedId) knownPasswordsStore.set(syncedId, password);

      setMsg('Contraseña actualizada. Ya puedes usarla y verla en Mi Perfil (ojo).');
      setTimeout(() => navigate('/menu', { replace: true }), 1200);
    } else {
      setMsg(res.error || 'No se pudo guardar.');
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-neutral-100">
        <img
          src={assetUrl('logo.jpg')}
          alt="Mi Gordólogo"
          className="h-20 w-auto mx-auto object-contain mb-3"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <h1 className="text-center font-bold text-base text-neutral-900 mb-1">Nueva contraseña</h1>
        <p className="text-center text-[11px] text-neutral-500 mb-4">Elige una clave nueva para tu cuenta.</p>

        {!ready && (
          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
            Abre el enlace del email de recuperación. Si ya lo hiciste, espera un momento…
          </p>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
          <div>
            <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
              <KeyRound className="w-3.5 h-3.5" /> Contraseña nueva
            </label>
            <PasswordField
              value={password}
              onChange={setPassword}
              minLength={6}
              required
              disabled={!ready}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">Repetir contraseña</label>
            <PasswordField
              value={confirm}
              onChange={setConfirm}
              minLength={6}
              required
              disabled={!ready}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
          >
            Guardar contraseña
          </button>
        </form>
        {msg && <p className="text-[11px] text-neutral-700 mt-3 leading-relaxed">{msg}</p>}
      </div>
    </div>
  );
};
