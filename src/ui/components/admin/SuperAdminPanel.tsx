import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, Link2, UserCheck, UserX, Mail, KeyRound } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';
import type { RemoteUser } from '@/domain/services/backendService';
import { storageService } from '@/domain/services/storageService';
import { authSyncService } from '@/domain/services/authSyncService';

export const SuperAdminPanel: React.FC = () => {
  const [status, setStatus] = useState<{
    backend: boolean;
    hasGemini: boolean;
    hasMailSmtp: boolean;
    mailSmtpUser: string | null;
  } | null>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [pending, setPending] = useState<RemoteUser[]>([]);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const localProfiles = storageService.getProfiles();

  const refresh = async () => {
    if (!backendService.isConfigured()) {
      setStatus({ backend: false, hasGemini: false, hasMailSmtp: false, mailSmtpUser: null });
      return;
    }
    const [st, state, pend] = await Promise.all([
      backendService.status(),
      backendService.getState(),
      backendService.listPendingUsers(),
    ]);
    setStatus({
      backend: st.ok,
      hasGemini: Boolean(st.hasGemini || state.hasGemini),
      hasMailSmtp: Boolean(st.hasMailSmtp),
      mailSmtpUser: st.mailSmtpUser || null,
    });
    if (state.ok && state.users?.length) {
      setUsers(state.users);
    }
    if (pend.ok && pend.users) {
      setPending(pend.users);
    } else {
      setPending((state.users || []).filter((u) => u.status === 'pending'));
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

  const onSaveMailSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await backendService.setMailSmtp(smtpUser, smtpPass);
    if (res.ok) {
      setSmtpPass('');
      setMsg(
        'Gmail SMTP guardado. “Olvidé mi contraseña” ya puede enviar a Gmail, Hotmail, etc. (gratis).'
      );
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo guardar el correo.');
    }
    setBusy(false);
  };

  const onSetStatus = async (userId: string, next: 'approved' | 'rejected') => {
    setBusy(true);
    setMsg(null);
    const res = await backendService.setUserStatus(userId, next);
    if (res.ok) {
      setMsg(next === 'approved' ? 'Usuario aprobado. Ya puede entrar.' : 'Usuario rechazado.');
      await refresh();
    } else {
      setMsg(res.error || 'No se pudo actualizar el estado.');
    }
    setBusy(false);
  };

  const onAdminReset = async (userId: string) => {
    setBusy(true);
    setMsg(null);
    const res = await backendService.adminResetPassword(userId);
    if (res.ok && res.tempPassword) {
      setTempPasswords((t) => ({ ...t, [userId]: res.tempPassword || '' }));
      setMsg(`Contraseña temporal para ${res.user?.name || 'usuario'}: ${res.tempPassword}`);
    } else {
      setMsg(res.error || 'No se pudo generar la contraseña.');
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
        Aprueba cuentas, configura el email de recuperación (Gmail gratis) y genera contraseñas temporales si hace falta.
      </p>

      {!status?.backend && (
        <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
          El servidor aún no está conectado.
        </p>
      )}

      {status?.backend && (
        <p className="text-[11px] font-semibold text-emerald-800">
          Servidor: conectado · IA: {status.hasGemini ? 'activa' : 'pendiente'} · Email:{' '}
          {status.hasMailSmtp ? `OK (${status.mailSmtpUser || 'Gmail'})` : 'pendiente'}
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
              spellCheck={false}
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
        </form>
      )}

      {status?.backend && (
        <form onSubmit={(e) => void onSaveMailSmtp(e)} className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            Email de recuperación (Gmail gratis)
          </label>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            1) En tu Google: Seguridad → Verificación en 2 pasos (activada) → Contraseñas de aplicaciones → crear una
            para «Correo». 2) Pega aquí tu Gmail y esa contraseña de 16 caracteres (no la normal). Así se envían
            recuperaciones a cualquier Gmail/Hotmail sin comprar dominio.
          </p>
          <input
            type="email"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            placeholder={status.mailSmtpUser || 'tunombre@gmail.com'}
            required
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
          />
          <input
            type="password"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
            placeholder="Contraseña de aplicación (16 caracteres)"
            required
            autoComplete="off"
            className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-mono"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs"
          >
            Guardar Gmail para recuperación
          </button>
        </form>
      )}

      {status?.backend && (
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <UserCheck className="w-3.5 h-3.5" />
            Cuentas pendientes de aprobación
          </label>
          {pending.length === 0 ? (
            <p className="text-[10px] text-neutral-500">No hay solicitudes nuevas.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((u) => (
                <li key={u.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-2.5 space-y-1.5">
                  <p className="text-xs font-bold text-neutral-900 truncate">{u.name}</p>
                  <p className="text-[10px] text-neutral-600 truncate">{u.email || u.id}</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSetStatus(u.id, 'approved')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSetStatus(u.id, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-rose-200 text-rose-800 text-[11px] font-bold disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] text-neutral-500 pt-1">Usuarios · generar clave temporal si no llega el email</p>
          <ul className="space-y-2">
            {users
              .filter((u) => u.status === 'approved' || u.status === 'rejected')
              .map((u) => (
                <li key={u.id} className="rounded-xl border border-neutral-100 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-semibold text-neutral-800">
                      {u.name}
                      {u.email ? ` · ${u.email}` : ''}
                    </span>
                    <span className="shrink-0 text-neutral-400">
                      {u.role === 'superadmin' ? 'Admin' : u.status === 'rejected' ? 'Rechazado' : 'OK'}
                    </span>
                  </div>
                  {u.email && u.status === 'approved' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onAdminReset(u.id)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-neutral-200 text-[10px] font-bold text-neutral-700 disabled:opacity-50"
                    >
                      <KeyRound className="w-3 h-3" />
                      Generar contraseña temporal
                    </button>
                  )}
                  {tempPasswords[u.id] && (
                    <p className="text-[11px] font-mono bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 break-all">
                      {tempPasswords[u.id]}
                    </p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
          <Link2 className="w-3.5 h-3.5" />
          Vincular menús entre perfiles
        </label>
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

      {msg && <p className="text-[11px] text-neutral-700 leading-relaxed break-words">{msg}</p>}
    </div>
  );
};
