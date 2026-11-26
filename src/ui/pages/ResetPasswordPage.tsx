import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authSyncService } from '@/domain/services/authSyncService';
import { assetUrl } from '@/shared/assets';
import { PasswordField, fieldInputClass } from '@/ui/components/forms/PasswordField';

function readInitialRecoveryParams(): { email: string; code: string } {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const hashParams = new URLSearchParams(hashQuery);

  const email = (hashParams.get('email') || searchParams.get('email') || '').trim().toLowerCase();
  const code = (hashParams.get('code') || searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6);
  return { email, code };
}

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const initial = readInitialRecoveryParams();

  const [email, setEmail] = useState(initial.email);
  const [code, setCode] = useState(initial.code);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, '');

    if (!cleanEmail.includes('@')) {
      setMsg({ text: 'Indica el email de tu cuenta.', ok: false });
      return;
    }
    if (cleanCode.length !== 6) {
      setMsg({ text: 'Introduce el código de 6 dígitos que recibiste en tu correo.', ok: false });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', ok: false });
      return;
    }
    if (password !== confirm) {
      setMsg({ text: 'Las contraseñas no coinciden.', ok: false });
      return;
    }

    setBusy(true);
    const res = await authSyncService.confirmPasswordReset(cleanEmail, cleanCode, password);
    if (res.ok) {
      setDone(true);
      setMsg({
        text: res.message || 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        ok: true,
      });
      // Limpia parámetros sensibles de la barra de direcciones
      if (window.location.search) {
        window.history.replaceState({}, '', `${window.location.pathname}#/restablecer-clave`);
      }
    } else {
      setMsg({
        text: res.error || 'El código no es válido o ha caducado. Solicita uno nuevo.',
        ok: false,
      });
    }
    setBusy(false);
  };

  const onResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setMsg({ text: 'Escribe primero tu email arriba para enviarte un código nuevo.', ok: false });
      return;
    }
    setResendBusy(true);
    setMsg(null);
    const res = await authSyncService.requestPasswordReset(cleanEmail);
    setMsg({
      text: res.ok
        ? res.message || 'Si el email existe, te hemos enviado un nuevo código de 6 dígitos.'
        : res.error || 'No se pudo enviar el código.',
      ok: res.ok,
    });
    setResendBusy(false);
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
        <h1 className="text-center font-bold text-base text-neutral-900 mb-1">
          Restablecer contraseña
        </h1>
        <p className="text-center text-[11px] text-neutral-500 mb-4 leading-relaxed">
          Introduce el código de 6 dígitos que enviamos a tu correo y elige tu nueva contraseña.
        </p>

        {msg && (
          <p
            className={`text-[11px] font-semibold rounded-xl p-2.5 mb-3 leading-relaxed border ${
              msg.ok
                ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
                : 'text-rose-900 bg-rose-50 border-rose-200'
            }`}
          >
            {msg.text}
          </p>
        )}

        {done ? (
          <div className="space-y-3 text-center py-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
            <p className="text-xs text-neutral-700">
              Tu nueva contraseña ya está activa. Puedes iniciar sesión ahora mismo.
            </p>
            <button
              type="button"
              onClick={() => navigate('/menu', { replace: true })}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <Mail className="w-3.5 h-3.5" /> Email de tu cuenta
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
                <ShieldCheck className="w-3.5 h-3.5" /> Código de 6 dígitos
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoComplete="one-time-code"
                placeholder="000000"
                className={`${fieldInputClass} font-mono text-center tracking-[0.35em] font-bold`}
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 mb-1">
                <KeyRound className="w-3.5 h-3.5" /> Nueva contraseña (mín. 6)
              </label>
              <PasswordField
                value={password}
                onChange={setPassword}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                Repetir nueva contraseña
              </label>
              <PasswordField
                value={confirm}
                onChange={setConfirm}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Guardando…' : 'Guardar nueva contraseña'}
            </button>

            <button
              type="button"
              disabled={resendBusy}
              onClick={() => void onResend()}
              className="w-full py-2 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 disabled:opacity-50"
            >
              {resendBusy ? 'Enviando código…' : 'Solicitar un código nuevo'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/menu', { replace: true })}
          className="mt-4 block w-full text-center text-[11px] font-bold text-emerald-800"
        >
          Volver a entrar
        </button>
      </div>
    </div>
  );
};
