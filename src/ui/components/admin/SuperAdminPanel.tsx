import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, KeyRound, Eye, EyeOff, Link2 } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';
import type { RemoteUser } from '@/domain/services/backendService';
import { storageService } from '@/domain/services/storageService';
import { authSyncService } from '@/domain/services/authSyncService';

export const SuperAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<{ backend: boolean; hasGemini: boolean } | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [linkUserId, setLinkUserId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localProfiles = storageService.getProfiles();

  const refresh = async () => {
    if (!backendService.isConfigured()) {
      setStatus({ backend: false, hasGemini: false });
      return;
    }
    const [st, state] = await Promise.all([backendService.status(), backendService.getState()]);
    setStatus({
      backend: st.ok,
      hasGemini: Boolean(st.hasGemini || state.hasGemini),
    });
    if (state.ok && state.users?.length) {
      setUsers(state.users);
    }
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

  const onSavePassword = async (userId: string) => {
    const next = (drafts[userId] || '').trim();
    const minLen = userId === 'pepe' ? 8 : 6;
    if (next.length < minLen) {
      setMsg(`La contraseña de ese perfil debe tener al menos ${minLen} caracteres.`);
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await backendService.setUserPassword(userId, next);
    if (res.ok) {
      setDrafts((d) => ({ ...d, [userId]: '' }));
      setMsg('Contraseña guardada. Ya puedes verla en esta lista.');
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo cambiar la contraseña.');
    }
    setBusy(false);
  };

  const onLinkMenus = () => {
    if (!linkUserId) {
      setMsg('Elige qué perfil compartirá el menú de otro.');
      return;
    }
    storageService.setLinkedMenuUser(linkUserId, linkTargetId || null);
    setMsg(
      linkTargetId
        ? `${storageService.getProfileById(linkUserId)?.name} usará el mismo menú que ${storageService.getProfileById(linkTargetId)?.name}.`
        : `${storageService.getProfileById(linkUserId)?.name} vuelve a tener menú propio.`
    );
    window.dispatchEvent(new Event('storage'));
  };

  const onResetMenus = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await authSyncService.resetAllMenusToHospitalSeed();
      setMsg('Todos los perfiles vuelven al menú hospitalario de 1.500 kcal (8 semanas).');
    } catch {
      setMsg('No se pudieron resetear los menús.');
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

      {status?.backend && (
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <KeyRound className="w-3.5 h-3.5" />
            Contraseñas de la familia
          </label>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Solo las ves tú. Si pone «sin recordar», entra una vez con ese perfil o escribe aquí una nueva.
          </p>
          <ul className="space-y-2">
            {users.map((u) => {
              const shown = Boolean(visible[u.id]);
              const remembered = u.passwordRecovery || '';
              return (
                <li key={u.id} className="rounded-2xl border border-neutral-200 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-neutral-900 truncate">{u.name}</p>
                    <span className="text-[10px] text-neutral-400 shrink-0">{u.role === 'superadmin' ? 'Admin' : 'Perfil'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type={shown ? 'text' : 'password'}
                      readOnly
                      value={remembered}
                      placeholder="Sin recordar"
                      className="flex-1 text-xs p-2 rounded-xl border border-neutral-200 bg-neutral-50 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((v) => ({ ...v, [u.id]: !shown }))}
                      className="h-9 w-9 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-600"
                      aria-label={shown ? 'Ocultar' : 'Mostrar'}
                    >
                      {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={drafts[u.id] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                      minLength={u.id === 'pepe' ? 8 : 6}
                      placeholder={u.id === 'pepe' ? 'Nueva (mín. 8)' : 'Nueva (mín. 6)'}
                      autoComplete="off"
                      className="flex-1 text-xs p-2 rounded-xl border border-neutral-200 min-w-0"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSavePassword(u.id)}
                      className="px-3 py-2 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
          <Link2 className="w-3.5 h-3.5" />
          Vincular menús entre perfiles
        </label>
        <p className="text-[10px] text-neutral-500 leading-relaxed">
          Útil si dos personas cocinan lo mismo. El perfil vinculado ve el menú del otro (comidas y cenas incluidas).
        </p>
        <select
          value={linkUserId}
          onChange={(e) => setLinkUserId(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
        >
          <option value="">Quién comparte menú…</option>
          {localProfiles
            .filter((p) => p.id !== 'pepe')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.linkedMenuUserId
                  ? ` (ahora: ${storageService.getProfileById(p.linkedMenuUserId)?.name || p.linkedMenuUserId})`
                  : ' (menú propio)'}
              </option>
            ))}
        </select>
        <select
          value={linkTargetId}
          onChange={(e) => setLinkTargetId(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
        >
          <option value="">Menú propio (sin vínculo)</option>
          {localProfiles
            .filter((p) => p.id !== linkUserId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                Usar el de {p.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={busy || !linkUserId}
          onClick={onLinkMenus}
          className="w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-bold disabled:opacity-50"
        >
          Guardar vínculo
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void onResetMenus()}
        className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-bold disabled:opacity-50"
      >
        Restaurar menú hospitalario 1.500 kcal en todos
      </button>

      {msg && <p className="text-[11px] text-neutral-700 leading-relaxed">{msg}</p>}
    </div>
  );
};
