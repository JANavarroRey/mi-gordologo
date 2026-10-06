import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, LogOut } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';

export const SuperAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<{
    backend: boolean;
    hasAdmin: boolean;
    hasGemini: boolean;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(() => backendService.isSuperadminSession());

  const refresh = async () => {
    if (!backendService.isConfigured()) {
      setStatus({ backend: false, hasAdmin: false, hasGemini: false });
      return;
    }
    const res = await backendService.status();
    setStatus({
      backend: res.ok,
      hasAdmin: Boolean(res.hasAdmin),
      hasGemini: Boolean(res.hasGemini),
    });
  };

  useEffect(() => {
    void refresh();
  }, []);

  const onBootstrapOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const action = status?.hasAdmin ? backendService.login(password) : backendService.bootstrap(password);
    const res = await action;
    if (res.ok && res.token) {
      backendService.setAdminToken(res.token);
      setLoggedIn(true);
      setPassword('');
      setMsg(status?.hasAdmin ? 'Sesión de superadmin abierta.' : 'Superadmin creado. Ahora pega la clave de Gemini.');
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo entrar.');
    }
    setBusy(false);
  };

  const onSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await backendService.setGeminiKey(geminiKey);
    if (res.ok) {
      setGeminiKey('');
      setMsg('Clave Gemini guardada en el servidor. Todos los móviles la usarán sin pegarla.');
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo guardar la clave.');
    }
    setBusy(false);
  };

  const onLogout = async () => {
    await backendService.logout();
    setLoggedIn(false);
    setMsg('Sesión cerrada.');
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-sm text-neutral-900">Superadmin</h3>
        </div>
        {loggedIn && (
          <button
            type="button"
            onClick={() => void onLogout()}
            className="text-[11px] font-bold text-neutral-500 flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        )}
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Solo tú. Aquí se guarda <strong>una vez</strong> la clave de Gemini en el servidor. María no ve este paso ni pega claves.
      </p>

      {!status?.backend && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
          El servidor aún no está conectado. Crea el proyecto Supabase, ejecuta <code className="bg-white px-1 rounded">supabase/schema.sql</code>,
          publica la función <code className="bg-white px-1 rounded">gordologo</code> y añade en GitHub los secrets{' '}
          <code className="bg-white px-1 rounded">VITE_SUPABASE_URL</code> y{' '}
          <code className="bg-white px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
        </p>
      )}

      {status?.backend && (
        <p className="text-[11px] font-semibold text-emerald-800">
          Servidor: conectado · IA: {status.hasGemini ? 'activa para todos' : 'pendiente de clave'}
        </p>
      )}

      {status?.backend && !loggedIn && (
        <form onSubmit={(e) => void onBootstrapOrLogin(e)} className="space-y-2">
          <label className="block text-[11px] font-bold text-neutral-700">
            {status.hasAdmin ? 'Contraseña de superadmin' : 'Crea tu contraseña de superadmin (mín. 8)'}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="current-password"
              className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 min-w-0"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-2 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs shrink-0"
            >
              {status.hasAdmin ? 'Entrar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      {status?.backend && loggedIn && (
        <form onSubmit={(e) => void onSaveGemini(e)} className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Clave Gemini (Google AI Studio)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza…"
              required
              autoComplete="off"
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
          <p className="text-[10px] text-neutral-500">
            Se almacena en el servidor, no en el móvil de María. Consíguela en aistudio.google.com/apikey
          </p>
        </form>
      )}

      {msg && <p className="text-[11px] text-neutral-700 leading-relaxed">{msg}</p>}
    </div>
  );
};
