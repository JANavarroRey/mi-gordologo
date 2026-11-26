import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Check, Trash2, RefreshCw } from 'lucide-react';
import type { AdminCredentialItem } from '@/domain/services/adminService';
import { PasswordField } from '@/ui/components/forms/PasswordField';

interface Props {
  credentials: AdminCredentialItem[];
  loading: boolean;
  busy: boolean;
  adminUserId: string;
  onSetPassword: (userId: string, password?: string) => Promise<void>;
  onDeleteUser: (userId: string, name: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Aprobado', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  rejected: { label: 'Rechazado', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const AdminCredentialsCard: React.FC<Props> = ({
  credentials,
  loading,
  busy,
  adminUserId,
  onSetPassword,
  onDeleteUser,
  onRefresh,
}) => {
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sorted = [...credentials].sort((a, b) => {
    if (a.userId === adminUserId || a.role === 'superadmin') return -1;
    if (b.userId === adminUserId || b.role === 'superadmin') return 1;
    return a.name.localeCompare(b.name, 'es');
  });

  const handleCopy = async (userId: string, pwd: string) => {
    try {
      await navigator.clipboard?.writeText(pwd);
      setCopiedId(userId);
      setTimeout(() => setCopiedId((cur) => (cur === userId ? null : cur)), 1600);
    } catch {
      // Clipboard no disponible
    }
  };

  const handleSave = async (userId: string, mode: 'set' | 'random') => {
    const chosen = mode === 'set' ? (drafts[userId] || '').trim() : undefined;
    await onSetPassword(userId, chosen);
    if (mode === 'set') {
      setDrafts((d) => ({ ...d, [userId]: '' }));
    }
    setVisibleMap((v) => ({ ...v, [userId]: true }));
  };

  return (
    <div className="space-y-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
          <KeyRound className="w-4 h-4 text-emerald-700" />
          Bóveda de contraseñas (tú y usuarios)
        </label>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void onRefresh()}
          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          title="Actualizar bóveda"
          aria-label="Actualizar bóveda"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Las claves se guardan cifradas en el servidor (AES-256-GCM) y nunca en el navegador. Solo tu cuenta de administrador puede consultarlas o cambiarlas.
      </p>

      {loading && credentials.length === 0 ? (
        <p className="text-[11px] text-neutral-500 py-2">Cargando contraseñas cifradas…</p>
      ) : sorted.length === 0 ? (
        <p className="text-[11px] text-neutral-500">No hay cuentas registradas todavía.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((item) => {
            const isSelfAdmin = item.userId === adminUserId || item.role === 'superadmin';
            const badge = isSelfAdmin
              ? { label: 'Tu cuenta Admin', cls: 'bg-neutral-900 text-white border-neutral-900' }
              : STATUS_BADGE[item.status] || STATUS_BADGE.pending;
            const isShown = Boolean(visibleMap[item.userId]);
            const draft = drafts[item.userId] || '';

            return (
              <li
                key={item.userId}
                className={`rounded-2xl border p-3 space-y-2.5 ${
                  isSelfAdmin
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-neutral-200 bg-neutral-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">
                      {item.email || 'Sin email vinculado'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {item.password ? (
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Contraseña guardada
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleMap((v) => ({ ...v, [item.userId]: !v[item.userId] }))
                          }
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          aria-label={isShown ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {isShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy(item.userId, item.password!)}
                          className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                          aria-label="Copiar contraseña"
                        >
                          {copiedId === item.userId ? (
                            <Check className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[15px] font-mono font-bold break-all text-neutral-900 tracking-wide">
                      {isShown ? item.password : '••••••••••••'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-2 leading-relaxed">
                    Sin clave en bóveda todavía (cuenta creada antes de este sistema). Se guardará automáticamente al iniciar sesión, o puedes fijar una abajo.
                  </p>
                )}

                {item.hasAuth && (
                  <div className="space-y-1.5">
                    <PasswordField
                      value={draft}
                      onChange={(v) => setDrafts((d) => ({ ...d, [item.userId]: v }))}
                      placeholder={
                        isSelfAdmin
                          ? 'Cambiar tu contraseña de admin (mín. 6)'
                          : 'Nueva contraseña para esta cuenta (mín. 6)'
                      }
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy || draft.trim().length < 6}
                        onClick={() => void handleSave(item.userId, 'set')}
                        className="flex-1 py-2 rounded-xl bg-neutral-900 text-white text-[11px] font-bold disabled:opacity-40"
                      >
                        Guardar contraseña
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSave(item.userId, 'random')}
                        className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-[11px] font-bold text-neutral-700 disabled:opacity-40"
                      >
                        Aleatoria
                      </button>
                      {!isSelfAdmin && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDeleteUser(item.userId, item.name)}
                          className="p-2 rounded-xl border border-rose-200 bg-white text-rose-700 disabled:opacity-40"
                          title="Eliminar cuenta"
                          aria-label={`Eliminar cuenta de ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
