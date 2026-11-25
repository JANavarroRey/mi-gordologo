import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, Link2, UserCheck, UserX, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';
import type { RemoteUser } from '@/domain/services/backendService';
import { storageService } from '@/domain/services/storageService';
import { authSyncService } from '@/domain/services/authSyncService';
import { PasswordField, fieldInputClass } from '@/ui/components/forms/PasswordField';
import { knownPasswordsStore } from '@/domain/services/knownPasswordsStore';

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
  const [editMail, setEditMail] = useState(false);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [pending, setPending] = useState<RemoteUser[]>([]);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [draftPasswords, setDraftPasswords] = useState<Record<string, string>>({});
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>(() =>
    knownPasswordsStore.getAll()
  );
  const [showKnown, setShowKnown] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const localProfiles = storageService.getProfiles();

  const rememberPassword = (userId: string, password: string) => {
    knownPasswordsStore.set(userId, password);
    setKnownPasswords(knownPasswordsStore.getAll());
    setShowKnown((t) => ({ ...t, [userId]: true }));
  };

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
    if (st.mailSmtpUser && !smtpUser) {
      setSmtpUser(st.mailSmtpUser);
    }
    if (state.ok && state.users?.length) {
      setUsers(state.users);
      const fromServer: Record<string, string> = {};
      for (const u of state.users) {
        if (u.knownPassword) {
          knownPasswordsStore.set(u.id, u.knownPassword);
          fromServer[u.id] = u.knownPassword;
        }
      }
      if (Object.keys(fromServer).length) {
        setKnownPasswords((prev) => ({ ...prev, ...fromServer }));
        setShowKnown((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(fromServer)) next[id] = true;
          return next;
        });
      }
    }
    if (pend.ok && pend.users) {
      setPending(pend.users);
    } else {
      setPending((state.users || []).filter((u) => u.status === 'pending'));
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (text: string, ok = true) => {
    setMsg(text);
    setMsgOk(ok);
  };

  const onSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await backendService.setGeminiKey(geminiKey);
    if (res.ok) {
      setGeminiKey('');
      flash('Clave Gemini guardada en el servidor. Todos los perfiles logueados la usarán.');
      await refresh();
    } else {
      flash(res.error || 'No se pudo guardar la clave.', false);
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
      setEditMail(false);
      flash('Email de recuperación guardado correctamente.');
      await refresh();
    } else {
      flash(res.error || 'No se pudo guardar el correo.', false);
    }
    setBusy(false);
  };

  const onSetStatus = async (userId: string, next: 'approved' | 'rejected') => {
    setBusy(true);
    setMsg(null);
    const res = await backendService.setUserStatus(userId, next);
    if (res.ok) {
      flash(next === 'approved' ? 'Usuario aprobado. Ya puede entrar.' : 'Usuario rechazado.');
      await refresh();
    } else {
      flash(res.error || 'No se pudo actualizar el estado.', false);
    }
    setBusy(false);
  };

  const onAdminSetPassword = async (userId: string, mode: 'set' | 'random') => {
    setBusy(true);
    setMsg(null);
    const chosen = mode === 'set' ? (draftPasswords[userId] || '').trim() : undefined;
    if (mode === 'set' && (!chosen || chosen.length < 6)) {
      flash('Escribe una contraseña de al menos 6 caracteres (o genera una aleatoria).', false);
      setBusy(false);
      return;
    }
    const res = await backendService.adminResetPassword(userId, chosen);
    if (res.ok && res.tempPassword) {
      rememberPassword(userId, res.tempPassword);
      setDraftPasswords((d) => ({ ...d, [userId]: '' }));
      flash(
        mode === 'set'
          ? `Contraseña de ${res.user?.name || 'usuario'} guardada. Ya puedes verla abajo (ojo).`
          : `Contraseña temporal para ${res.user?.name || 'usuario'} lista. Mírala abajo y pásasela.`
      );
    } else {
      flash(res.error || 'No se pudo guardar la contraseña.', false);
    }
    setBusy(false);
  };

  const onLinkMenus = () => {
    if (!linkUserId) {
      flash('Elige qué perfil compartirá el menú de otro.', false);
      return;
    }
    storageService.setLinkedMenuUser(linkUserId, linkTargetId || null);
    flash(
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
      flash('Todos los perfiles vuelven al menú hospitalario de 1.500 kcal (8 semanas).');
    } catch {
      flash('No se pudieron resetear los menús.', false);
    }
    setBusy(false);
  };

  const mailConfigured = Boolean(status?.hasMailSmtp);
  const showMailForm = !mailConfigured || editMail;

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
              className={`${fieldInputClass} font-mono`}
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
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            Email de recuperación (Gmail gratis)
          </label>

          {mailConfigured && !editMail && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-900">Guardado y activo</p>
                  <p className="text-[12px] text-emerald-800 break-all mt-0.5">
                    {status.mailSmtpUser || 'Gmail configurado'}
                  </p>
                  <p className="text-[11px] text-emerald-700/90 mt-1 leading-relaxed">
                    «Olvidé mi contraseña» ya puede enviar enlaces a Gmail, Hotmail, etc.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditMail(true);
                  setSmtpUser(status.mailSmtpUser || smtpUser);
                  setSmtpPass('');
                }}
                className="w-full py-2 rounded-xl border border-emerald-200 bg-white text-emerald-900 text-xs font-bold"
              >
                Cambiar Gmail / contraseña de aplicación
              </button>
            </div>
          )}

          {showMailForm && (
            <form onSubmit={(e) => void onSaveMailSmtp(e)} className="space-y-2">
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                1) En tu Google: Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones → crear una para
                «Correo». 2) Pega aquí tu Gmail y esa contraseña de 16 caracteres (no la normal).
              </p>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder={status.mailSmtpUser || 'tunombre@gmail.com'}
                required
                className={fieldInputClass}
              />
              <PasswordField
                value={smtpPass}
                onChange={setSmtpPass}
                placeholder="Contraseña de aplicación (16 caracteres)"
                required
                autoComplete="off"
              />
              <div className="flex gap-2">
                {editMail && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditMail(false);
                      setSmtpPass('');
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 disabled:opacity-50 text-white font-bold text-xs"
                >
                  Guardar Gmail para recuperación
                </button>
              </div>
            </form>
          )}
        </div>
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

          <div className="pt-2 space-y-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              Contraseñas (tú y el resto)
            </label>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Define la contraseña de cada persona. Se guarda en el servidor y se muestra aquí y en su perfil
              (ojo 👁).
            </p>
            <ul className="space-y-3">
              {users
                .filter((u) => u.status === 'approved' || u.status === 'rejected')
                .map((u) => {
                  const known = knownPasswords[u.id];
                  return (
                    <li key={u.id} className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate font-bold text-neutral-900">
                          {u.name}
                          {u.email ? (
                            <span className="font-normal text-neutral-500"> · {u.email}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-neutral-400">
                          {u.role === 'superadmin' ? 'Admin' : u.status === 'rejected' ? 'Rechazado' : 'OK'}
                        </span>
                      </div>

                      {known ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-emerald-900">Contraseña conocida</span>
                            <button
                              type="button"
                              onClick={() => setShowKnown((t) => ({ ...t, [u.id]: !t[u.id] }))}
                              className="p-1 rounded text-emerald-800"
                              aria-label={showKnown[u.id] ? 'Ocultar' : 'Ver'}
                            >
                              {showKnown[u.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-[15px] font-mono break-all text-neutral-900 tracking-wide">
                            {showKnown[u.id] ? known : '••••••••••••'}
                          </p>
                          <button
                            type="button"
                            onClick={() => void navigator.clipboard?.writeText(known)}
                            className="text-[10px] font-bold text-emerald-800 underline"
                          >
                            Copiar
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                          Aún no hay clave guardada en este móvil. Define una abajo para poder verla.
                        </p>
                      )}

                      {u.email && u.status === 'approved' && (
                        <div className="space-y-1.5">
                          <PasswordField
                            value={draftPasswords[u.id] || ''}
                            onChange={(v) => setDraftPasswords((d) => ({ ...d, [u.id]: v }))}
                            placeholder="Nueva contraseña para esta cuenta"
                            minLength={6}
                            autoComplete="off"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onAdminSetPassword(u.id, 'set')}
                              className="flex-1 py-2 rounded-xl bg-neutral-900 text-white text-[11px] font-bold disabled:opacity-50"
                            >
                              Guardar y poder verla
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onAdminSetPassword(u.id, 'random')}
                              className="px-2.5 py-2 rounded-xl border border-neutral-200 text-[10px] font-bold text-neutral-700 disabled:opacity-50"
                              title="Generar aleatoria"
                            >
                              Aleatoria
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
            {users.filter((u) => u.status === 'approved' || u.status === 'rejected').length === 0 && (
              <p className="text-[10px] text-neutral-500">No hay usuarios aprobados todavía.</p>
            )}
          </div>
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
          className={fieldInputClass}
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
          className={fieldInputClass}
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

      {msg && (
        <p
          className={`text-[12px] font-semibold rounded-xl p-2.5 leading-relaxed break-words border ${
            msgOk
              ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
              : 'text-rose-900 bg-rose-50 border-rose-200'
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
};
