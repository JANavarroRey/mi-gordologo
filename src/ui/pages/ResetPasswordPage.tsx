import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authSyncService } from '@/domain/services/authSyncService';
import { getSupabase } from '@/domain/services/supabaseClient';
import { assetUrl } from '@/shared/assets';
import { PasswordField } from '@/ui/components/forms/PasswordField';

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
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
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
      setMsg('Contraseña actualizada. Ya puedes usar la app.');
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
