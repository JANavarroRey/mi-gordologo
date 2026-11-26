import React, { useCallback, useEffect, useState } from 'react';
import { Shield, Link2 } from 'lucide-react';
import { backendService, type RemoteUser } from '@/domain/services/backendService';
import { adminService, type AdminCredentialItem } from '@/domain/services/adminService';
import { storageService } from '@/domain/services/storageService';
import { authSyncService } from '@/domain/services/authSyncService';
import { fieldInputClass } from '@/ui/components/forms/PasswordField';
import { AdminAiConfigCard } from './AdminAiConfigCard';
import { AdminMailConfigCard } from './AdminMailConfigCard';
import { AdminPendingUsersCard } from './AdminPendingUsersCard';
import { AdminCredentialsCard } from './AdminCredentialsCard';

export const SuperAdminPanel: React.FC = () => {
  const isVerifiedAdmin = backendService.isVerifiedAdmin();
  const adminUserId = backendService.getAuthUserId();

  const [hasGemini, setHasGemini] = useState(false);
  const [hasMailSmtp, setHasMailSmtp] = useState(false);
  const [mailSmtpUser, setMailSmtpUser] = useState<string | null>(null);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [credentials, setCredentials] = useState<AdminCredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [linkUserId, setLinkUserId] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);

  const flash = (text: string, ok = true) => {
    setMsg(text);
    setMsgOk(ok);
  };

  const loadAdminData = useCallback(async () => {
    const [statusRes, credRes] = await Promise.all([
      adminService.getAdminStatus(),
      adminService.getAdminCredentials(),
    ]);
    return { statusRes, credRes };
  }, []);

  const applyAdminData = useCallback(
    (
      statusRes: Awaited<ReturnType<typeof adminService.getAdminStatus>>,
      credRes: Awaited<ReturnType<typeof adminService.getAdminCredentials>>
    ) => {
      if (statusRes.ok) {
        setHasGemini(Boolean(statusRes.hasGemini));
        setHasMailSmtp(Boolean(statusRes.hasMailSmtp));
        setMailSmtpUser(statusRes.mailSmtpUser || null);
        const list = statusRes.users || [];
        setUsers(list);
        backendService.setPendingCount(statusRes.pendingCount || 0);
        window.dispatchEvent(new Event('storage'));
      } else {
        flash(statusRes.error || 'No se pudo cargar el estado de administración.', false);
      }

      if (credRes.ok && credRes.credentials) {
        setCredentials(credRes.credentials);
      }
      setLoading(false);
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!backendService.isVerifiedAdmin()) return;
    setLoading(true);
    const { statusRes, credRes } = await loadAdminData();
    applyAdminData(statusRes, credRes);
  }, [applyAdminData, loadAdminData]);

  useEffect(() => {
    if (!isVerifiedAdmin) return;
    let cancelled = false;
    void loadAdminData().then(({ statusRes, credRes }) => {
      if (!cancelled) applyAdminData(statusRes, credRes);
    });
    // Al desmontar el panel limpiamos las contraseñas en memoria
    return () => {
      cancelled = true;
      setCredentials([]);
    };
  }, [isVerifiedAdmin, loadAdminData, applyAdminData]);

  if (!isVerifiedAdmin) return null;

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const rejectedUsers = users.filter((u) => u.status === 'rejected');
  const approvedUsers = users.filter((u) => u.status === 'approved');

  const onSaveGemini = async (apiKey: string): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    const res = await adminService.setGeminiKey(apiKey);
    if (res.ok) {
      flash('Clave de IA Google guardada en el servidor.');
      await refresh();
      setBusy(false);
      return true;
    }
    flash(res.error || 'No se pudo guardar la clave.', false);
    setBusy(false);
    return false;
  };

  const onSaveMailSmtp = async (smtpUser: string, smtpPass: string): Promise<boolean> => {
    setBusy(true);
    setMsg(null);
    const res = await adminService.setMailSmtp(smtpUser, smtpPass);
    if (res.ok) {
      flash('Configuración de Gmail SMTP guardada y cifrada correctamente.');
      await refresh();
      setBusy(false);
      return true;
    }
    flash(res.error || 'No se pudo guardar el correo SMTP.', false);
    setBusy(false);
    return false;
  };

  const onTestMailSmtp = async (toEmail: string) => {
    setBusy(true);
    setMsg(null);
    const res = await adminService.testMailSmtp(toEmail);
    if (res.ok) {
      flash(res.message || `Correo de prueba enviado a ${toEmail}.`);
    } else {
      flash(res.error || 'Falló el envío de prueba.', false);
    }
    setBusy(false);
  };

  const onSetStatus = async (userId: string, next: 'approved' | 'rejected') => {
    setBusy(true);
    setMsg(null);
    const res = await adminService.setUserStatus(userId, next);
    if (res.ok) {
      flash(
        next === 'approved'
          ? 'Usuario aprobado. Ya puede entrar en la app (y se le avisó por correo si SMTP está activo).'
          : 'Solicitud rechazada.'
      );
      await refresh();
    } else {
      flash(res.error || 'No se pudo actualizar el estado.', false);
    }
    setBusy(false);
  };

  const onDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de ${name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await adminService.deleteUser(userId);
    if (res.ok) {
      flash(`Cuenta de ${name} eliminada.`);
      await refresh();
    } else {
      flash(res.error || 'No se pudo eliminar el usuario.', false);
    }
    setBusy(false);
  };

  const onSetPassword = async (userId: string, password?: string) => {
    setBusy(true);
    setMsg(null);
    const res = await adminService.setUserPassword(userId, password);
    if (res.ok) {
      flash(
        password
          ? `Contraseña de ${res.user?.name || 'usuario'} actualizada y cifrada en bóveda.`
          : `Contraseña aleatoria generada para ${res.user?.name || 'usuario'}.`
      );
      await refresh();
    } else {
      flash(res.error || 'No se pudo actualizar la contraseña.', false);
    }
    setBusy(false);
  };

  const onLinkMenus = async () => {
    if (!linkUserId) {
      flash('Elige qué perfil compartirá el menú de otro.', false);
      return;
    }
    setBusy(true);
    setMsg(null);
    storageService.setLinkedMenuUser(linkUserId, linkTargetId || null);
    const res = await backendService.updateProfile({
      userId: linkUserId,
      settings: { linkedMenuUserId: linkTargetId || null },
    });
    if (res.ok) {
      const fromName = approvedUsers.find((u) => u.id === linkUserId)?.name || linkUserId;
      const toName = approvedUsers.find((u) => u.id === linkTargetId)?.name || '';
      flash(
        linkTargetId
          ? `${fromName} usará el mismo menú que ${toName}.`
          : `${fromName} vuelve a tener menú propio.`
      );
      window.dispatchEvent(new Event('storage'));
    } else {
      flash(res.error || 'No se pudo guardar el vínculo.', false);
    }
    setBusy(false);
  };

  const onResetMenus = async () => {
    if (!window.confirm('¿Restaurar el menú hospitalario de 1.500 kcal en todos los perfiles?')) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await authSyncService.resetAllMenusToHospitalSeed();
      flash('Todos los perfiles vuelven al menú hospitalario de 1.500 kcal (8 semanas).');
    } catch {
      flash('No se pudieron restaurar los menús.', false);
    }
    setBusy(false);
  };

  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border-2 border-emerald-200 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800">
            <Shield className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-neutral-900">Panel de Administración</h3>
            <p className="text-[10px] text-neutral-500">
              Solo visible para jose.navarrorey@gmail.com
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          {approvedUsers.length} activo{approvedUsers.length === 1 ? '' : 's'}
        </span>
      </div>

      {msg && (
        <p
          className={`text-xs font-semibold rounded-xl p-2.5 leading-relaxed break-words border ${
            msgOk
              ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
              : 'text-rose-900 bg-rose-50 border-rose-200'
          }`}
        >
          {msg}
        </p>
      )}

      <AdminPendingUsersCard
        pending={pendingUsers}
        rejected={rejectedUsers}
        busy={busy}
        onSetStatus={onSetStatus}
        onDeleteUser={onDeleteUser}
      />

      <AdminCredentialsCard
        credentials={credentials}
        loading={loading}
        busy={busy}
        adminUserId={adminUserId}
        onSetPassword={onSetPassword}
        onDeleteUser={onDeleteUser}
        onRefresh={refresh}
      />

      <AdminMailConfigCard
        hasMailSmtp={hasMailSmtp}
        mailSmtpUser={mailSmtpUser}
        busy={busy}
        onSaveMailSmtp={onSaveMailSmtp}
        onTestMailSmtp={onTestMailSmtp}
      />

      <div className="pt-3 border-t border-neutral-100">
        <AdminAiConfigCard hasGemini={hasGemini} busy={busy} onSaveGemini={onSaveGemini} />
      </div>

      <div className="space-y-2 pt-3 border-t border-neutral-100">
        <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
          <Link2 className="w-4 h-4 text-emerald-700" />
          Vincular menús entre perfiles
        </label>
        <select
          value={linkUserId}
          onChange={(e) => setLinkUserId(e.target.value)}
          className={fieldInputClass}
        >
          <option value="">Quién comparte menú…</option>
          {approvedUsers
            .filter((p) => p.id !== adminUserId)
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
          {approvedUsers
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
          onClick={() => void onLinkMenus()}
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
    </div>
  );
};
