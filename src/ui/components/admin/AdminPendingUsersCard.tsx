import React from 'react';
import { UserCheck, UserX, Trash2, RotateCcw } from 'lucide-react';
import type { RemoteUser } from '@/domain/services/backendService';

interface Props {
  pending: RemoteUser[];
  rejected: RemoteUser[];
  busy: boolean;
  onSetStatus: (userId: string, status: 'approved' | 'rejected') => Promise<void>;
  onDeleteUser: (userId: string, name: string) => Promise<void>;
}

export const AdminPendingUsersCard: React.FC<Props> = ({
  pending,
  rejected,
  busy,
  onSetStatus,
  onDeleteUser,
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
          <UserCheck className="w-4 h-4 text-emerald-700" />
          Solicitudes de acceso
        </label>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            {pending.length} pendiente{pending.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="text-[11px] text-neutral-500">
          No hay solicitudes pendientes. Cuando alguien se registre desde la URL aparecerá aquí y recibirás un aviso por email.
        </p>
      ) : (
        <ul className="space-y-2">
          {pending.map((u) => (
            <li
              key={u.id}
              className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3 space-y-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">{u.name}</p>
                <p className="text-[11px] text-neutral-600 truncate">{u.email || u.id}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSetStatus(u.id, 'approved')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Aprobar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSetStatus(u.id, 'rejected')}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-rose-200 bg-white text-rose-800 text-[11px] font-bold disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejected.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-bold text-neutral-600">Cuentas rechazadas ({rejected.length})</p>
          <ul className="space-y-2">
            {rejected.map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{u.email || u.id}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onSetStatus(u.id, 'approved')}
                    title="Aprobar cuenta"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onDeleteUser(u.id, u.name)}
                    title="Eliminar cuenta definitivamente"
                    className="p-2 rounded-xl border border-rose-200 bg-white text-rose-700 disabled:opacity-50"
                    aria-label={`Eliminar ${u.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
