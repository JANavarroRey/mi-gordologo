import React, { useState, useEffect } from 'react';
import { Users, Calendar, Heart, Bell, Share2, UserPlus, CheckCircle2, ShieldCheck, LogOut, KeyRound, Scale } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { backendService } from '@/domain/services/backendService';
import { UserSelectionModal } from '@/ui/components/onboarding/UserSelectionModal';
import { NewUserWizardModal } from '@/ui/components/onboarding/NewUserWizardModal';
import { TutorialModal } from '@/ui/components/tutorial/TutorialModal';
import { SuperAdminPanel } from '@/ui/components/admin/SuperAdminPanel';
import { HospitalGuidelinesCard } from '@/ui/components/guidelines/HospitalGuidelinesCard';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export const ProfilePage: React.FC = () => {
  const [activeUser, setActiveUser] = useState<UserProfile>(() => storageService.getActiveProfile());
  const [servings, setServings] = useState(() => storageService.getServings());
  const [freeDay, setFreeDay] = useState(() => storageService.getFreeDay());
  const [freeDayEnabled, setFreeDayEnabled] = useState(() => storageService.isFreeDayEnabled());
  const [weighInDay, setWeighInDay] = useState(() => storageService.getWeighInDay());
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [ownPassword, setOwnPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });

  useEffect(() => {
    const syncFromStorage = () => {
      setActiveUser(storageService.getActiveProfile());
      setServings(storageService.getServings());
      setFreeDay(storageService.getFreeDay());
      setFreeDayEnabled(storageService.isFreeDayEnabled());
      setWeighInDay(storageService.getWeighInDay());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };
    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const handleToggleServings = (val: number) => {
    setServings(val);
    storageService.setServings(val);
    window.dispatchEvent(new Event('storage'));
  };

  const handleToggleFreeDayEnabled = (enabled: boolean) => {
    setFreeDayEnabled(enabled);
    storageService.setFreeDayEnabled(enabled);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSetFreeDay = (day: number) => {
    setFreeDay(day);
    storageService.setFreeDay(day);
    storageService.setFreeDayEnabled(true);
    setFreeDayEnabled(true);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSetWeighInDay = (day: number) => {
    setWeighInDay(day);
    storageService.setWeighInDay(day, activeUser.id);
    window.dispatchEvent(new Event('storage'));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    const res = await backendService.setUserPassword(activeUser.id, ownPassword);
    if (res.ok) {
      setOwnPassword('');
      setPwdMsg('Contraseña actualizada.');
    } else {
      setPwdMsg(res.error || 'No se pudo cambiar.');
    }
  };

  const handleRescale = () => {
    storageService.rescaleMenusToCalories(activeUser.id);
    setPwdMsg(`Cantidades del menú ajustadas a ${activeUser.targetCalories} kcal.`);
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = async () => {
    await backendService.logout();
    window.location.reload();
  };

  const handleRequestNotifications = async () => {
    setNotifMsg(null);

    // Android/Chrome: las notificaciones web requieren HTTPS + gesto de usuario
    if (!window.isSecureContext) {
      setNotifMsg('Las notificaciones solo funcionan en HTTPS (o localhost).');
      return;
    }
    if (!('Notification' in window)) {
      setNotifMsg('Este navegador no soporta notificaciones. Prueba Chrome y “Añadir a pantalla de inicio”.');
      return;
    }

    try {
      if (Notification.permission === 'denied') {
        setNotifMsg(
          'El permiso está bloqueado. En Chrome: ⋮ → Información del sitio → Notificaciones → Permitir, y vuelve a pulsar.'
        );
        setNotificationPermission('denied');
        return;
      }

      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);

      if (perm !== 'granted') {
        setNotifMsg('No se concedió el permiso. Si lo denegaste, actívalo en ajustes del sitio.');
        return;
      }

      const title = '⚖️ Mi Gordólogo';
      const body = `Avisos activados. Te recordaremos el pesaje los ${WEEKDAY_LABELS[weighInDay]}.`;
      const icon = assetUrl('logo.svg');

      // En Android PWA es más fiable mostrar vía Service Worker
      const reg = await navigator.serviceWorker?.ready.catch(() => null);
      if (reg?.showNotification) {
        await reg.showNotification(title, { body, icon, badge: icon });
      } else {
        new Notification(title, { body, icon });
      }
      setNotifMsg('¡Listo! Notificaciones activadas en este móvil.');
    } catch (err) {
      console.error(err);
      setNotifMsg(
        'No se pudo activar. Instala la app (Añadir a pantalla de inicio) y vuelve a intentarlo desde ahí.'
      );
    }
  };

  const handleTestWhatsAppPing = () => {
    const appUrl = `${window.location.origin}${window.location.pathname}#/seguimiento`;
    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][weighInDay];
    const text = `⚖️ *Recordatorio de Mi Gordólogo* para ${activeUser.name}: Hoy es ${dayName} y toca pesaje semanal en ayunas para anotar tu avance en la app 🍏 Entra aquí: ${appUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isPepeProfile = storageService.isSuperadmin(activeUser.id);

  return (
    <div className="space-y-4">
      {/* Tarjeta del Usuario Activo — compacta */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-700 text-white p-5 shadow-sm">
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm font-bold text-2xl flex items-center justify-center shrink-0">
            {activeUser.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold font-display leading-tight truncate">
              {activeUser.name}
            </h2>
            <p className="text-sm text-emerald-100 mt-0.5">
              {isPepeProfile
                ? 'Superadmin · configuración de la familia'
                : `${activeUser.targetCalories} kcal · ${activeUser.height} cm`}
            </p>
          </div>
        </div>
        <div className={`relative mt-4 grid gap-2 ${isPepeProfile ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button
            type="button"
            onClick={() => setShowUserModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white text-emerald-800 text-xs font-bold"
          >
            <Users className="w-3.5 h-3.5" />
            Cambiar perfil
          </button>
          {isPepeProfile && (
          <button
            type="button"
            onClick={() => setShowWizardModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo perfil
          </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTutorialModal(true)}
          className="relative mt-3 w-full text-center text-[11px] font-semibold text-emerald-100 hover:text-white underline-offset-2 hover:underline"
        >
          Ver guía rápida de la app
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-3">
        <div className="flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-sm text-neutral-900">Contraseña y menú de {activeUser.name}</h3>
        </div>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Menú propio ({activeUser.targetCalories} kcal). Los cambios de platos se guardan en el servidor para este perfil.
        </p>
        <form onSubmit={(e) => void handleChangePassword(e)} className="flex gap-2">
          <input
            type="password"
            value={ownPassword}
            onChange={(e) => setOwnPassword(e.target.value)}
            minLength={activeUser.id === 'pepe' ? 8 : 6}
            placeholder="Nueva contraseña"
            className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 min-w-0"
          />
          <button type="submit" className="px-3 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs shrink-0">
            Cambiar
          </button>
        </form>
        <button
          type="button"
          onClick={handleRescale}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-bold"
        >
          <Scale className="w-3.5 h-3.5" />
          Reescalar cantidades a {activeUser.targetCalories} kcal
        </button>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-neutral-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
        {pwdMsg && <p className="text-[11px] text-neutral-600">{pwdMsg}</p>}
      </div>

      {/* Raciones y Día Libre */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-4">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-neutral-900">Raciones por plato</h3>
          </div>
          <p className="text-xs text-neutral-500 mb-2.5 leading-relaxed">
            Calcula las cantidades de los menús y la lista de compra para una o dos personas (incluyendo a papá).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleToggleServings(1)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                servings === 1
                  ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-medium text-xs'
              }`}
            >
              <span className="block text-sm">👤</span>
              <span className="text-xs font-semibold mt-0.5 block">1 Ración (individual)</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleServings(2)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                servings === 2
                  ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-medium text-xs'
              }`}
            >
              <span className="block text-sm">👥</span>
              <span className="text-xs font-semibold mt-0.5 block">2 Personas (×2 raciones)</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-neutral-900">Día Libre de la Dieta</h3>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-700">
              <input
                type="checkbox"
                checked={freeDayEnabled}
                onChange={(e) => handleToggleFreeDayEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-emerald-600"
              />
              Activar
            </label>
          </div>
          <p className="text-xs text-neutral-500 mb-2.5 leading-relaxed">
            Por defecto <strong>no hay día libre</strong>: todos los días tienen menú (incluido el sábado).
            Actívalo solo si quieres un día sin dieta pautada.
          </p>
          {freeDayEnabled && (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 0, label: 'Lun' },
                  { id: 1, label: 'Mar' },
                  { id: 2, label: 'Mié' },
                  { id: 3, label: 'Jue' },
                  { id: 4, label: 'Vie' },
                  { id: 5, label: 'Sáb' },
                  { id: 6, label: 'Dom' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSetFreeDay(d.id)}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                      freeDay === d.id
                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    🎉 {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">Decisión personal, no clínica.</p>
            </>
          )}
        </div>
      </div>

      <HospitalGuidelinesCard />

      {/* Sistema de Alertas y Recordatorios Semanales */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-bold text-sm text-neutral-900">Día de Pesaje y Entrevista Semanal</h3>
            <p className="text-[11px] text-neutral-500">Pautado para pesarse en ayunas y recibir el parte de El Gordólogo</p>
          </div>
        </div>

        {/* Selector del día de la semana */}
        <div>
          <label className="block text-xs font-bold text-neutral-700 mb-2">
            Elige qué día te pesas cada semana:
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {[
              { id: 1, label: 'Lunes' },
              { id: 2, label: 'Martes' },
              { id: 3, label: 'Miércoles' },
              { id: 4, label: 'Jueves' },
              { id: 5, label: 'Viernes' },
              { id: 6, label: 'Sábado' },
              { id: 0, label: 'Domingo' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSetWeighInDay(d.id)}
                className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all text-center ${
                  weighInDay === d.id
                    ? 'bg-emerald-700 border-emerald-800 text-white font-bold shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2 leading-tight">
            💡 Ahora tienes configurado el <strong>{WEEKDAY_LABELS[weighInDay]}</strong> por la mañana en ayunas.
            El hospital suele recomendar jueves; puedes cambiarlo cuando quieras.
          </p>
        </div>

        {/* Acciones directas de recordatorio */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-neutral-800">Estado de avisos en este móvil:</span>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Activados</span>
              </span>
            ) : notificationPermission === 'denied' ? (
              <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                Bloqueados
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Sin activar
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>{notificationPermission === 'granted' ? 'Probar Aviso en Pantalla' : 'Activar Avisos en este Móvil'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestWhatsAppPing}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>Avisar por WhatsApp</span>
            </button>
          </div>

          {notifMsg && (
            <p
              className={`text-[11px] leading-relaxed p-2.5 rounded-xl border ${
                notifMsg.startsWith('¡Listo')
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              {notifMsg}
            </p>
          )}

          <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-start space-x-2 text-[11px] text-emerald-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p>
              <strong>Privado en tu móvil:</strong> los avisos son locales (sin servidor de push). En Android usa Chrome → menú →
              &quot;Añadir a pantalla de inicio&quot; y activa el permiso desde ahí. Si aparece bloqueado, desbloquéalo en Información del sitio.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjeta Médica Informativa */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-200 space-y-2">
        <div className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-rose-500" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-700">Pauta Médica de Origen</h3>
        </div>
        <div className="bg-neutral-50 rounded-2xl p-3 text-xs text-neutral-600 space-y-1">
          <p>🏥 <strong>Hospital Morales Meseguer (Murcia)</strong></p>
          <p>🥗 Dieta pautada: <strong>1.500 kcal / día</strong> en 5 tomas</p>
          <p>🎯 Meta: Reducción de masa grasa preservando masa muscular</p>
        </div>
      </div>

      {isPepeProfile && <SuperAdminPanel />}

      {/* Modales */}
      <UserSelectionModal
        isOpen={showUserModal}
        canDismiss={true}
        onClose={() => setShowUserModal(false)}
        onSelectUser={(u) => {
          setActiveUser(u);
          setShowUserModal(false);
          setServings(storageService.getServings(u.id));
          window.dispatchEvent(new Event('storage'));
        }}
      />

      <NewUserWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onUserCreated={(newProfile) => {
          setActiveUser(newProfile);
          window.dispatchEvent(new Event('storage'));
        }}
      />

      <TutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />
    </div>
  );
};

export default ProfilePage;
