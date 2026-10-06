import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, KeyRound } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';
import { storageService } from '@/domain/services/storageService';

export const SuperAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<{ backend: boolean; hasGemini: boolean } | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [resetUserId, setResetUserId] = useState('maria_ignacia');
  const [resetPassword, setResetPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const profiles = storageService.getProfiles().filter((p) => p.id !== 'pepe');

  const refresh = async () => {
    if (!backendService.isConfigured()) {
      setStatus({ backend: false, hasGemini: false });
      return;
    }
    const res = await backendService.status();
    setStatus({
      backend: res.ok,
      hasGemini: Boolean(res.hasGemini),
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await backendService.setGeminiKey(geminiKey);
    if (res.ok) {
      setGeminiKey('');
      setMsg('Clave Gemini guardada en el servidor. Todos los perfiles logueados la usarán.');
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo guardar la clave.');
    }
    setBusy(false);
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await backendService.setUserPassword(resetUserId, resetPassword);
    if (res.ok) {
      setResetPassword('');
      setMsg('Contraseña actualizada.');
    } else {
      setMsg(res.error || 'No se pudo cambiar la contraseña.');
    }
    setBusy(false);
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-700" />
        <h3 className="font-bold text-sm text-neutral-900">Superadmin</h3>
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        La clave de Gemini se guarda <strong>una vez</strong> en el servidor y vale para todos los perfiles, incluidos los que crees después.
      </p>

      {!status?.backend && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
          El servidor aún no está conectado.
        </p>
      )}

      {status?.backend && (
        <p className="text-[11px] font-semibold text-emerald-800">
          Servidor: conectado · IA: {status.hasGemini ? 'activa para todos' : 'pendiente de clave'}
        </p>
      )}

      {status?.backend && (
        <form onSubmit={(e) => void onSaveGemini(e)} className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Clave Gemini (Google AI Studio)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza… o AQ.…"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              name="gordologo-gemini-key"
              className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 font-mono min-w-0"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-2 rounded-xl bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shrink-0"
            >
              Guardar
            </button>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Pega solo la clave de aistudio.google.com/apikey. Las nuevas empiezan por <strong>AQ.</strong>; las antiguas por <strong>AIza</strong>. No es la contraseña de María.
          </p>
        </form>
      )}

      {status?.backend && profiles.length > 0 && (
        <form onSubmit={(e) => void onResetPassword(e)} className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <KeyRound className="w-3.5 h-3.5" />
            Resetear contraseña de un perfil
          </label>
          <select
            value={resetUserId}
            onChange={(e) => setResetUserId(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={6}
              required
              placeholder="Nueva contraseña"
              className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 min-w-0"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-2 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs shrink-0"
            >
              OK
            </button>
          </div>
        </form>
      )}

      {msg && <p className="text-[11px] text-neutral-700 leading-relaxed">{msg}</p>}
    </div>
  );
};
