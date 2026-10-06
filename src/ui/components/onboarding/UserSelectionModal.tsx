import React, { useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { NewUserWizardModal } from './NewUserWizardModal';
import { assetUrl } from '@/shared/assets';
import type { UserProfile } from '@/domain/models/types';

interface Props {
  isOpen: boolean;
  onSelectUser: (user: UserProfile) => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const UserSelectionModal: React.FC<Props> = ({
  isOpen,
  onSelectUser,
  canDismiss = false,
  onClose,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => storageService.getProfiles());
  const [showWizard, setShowWizard] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (user: UserProfile) => {
    storageService.setActiveUserId(user.id);
    onSelectUser(user);
    if (onClose) onClose();
  };

  const handleCreatedFromWizard = (newProfile: UserProfile) => {
    setProfiles(storageService.getProfiles());
    handleSelect(newProfile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-neutral-100 max-h-[90vh] overflow-y-auto">
        {/* Cabecera con Logo V3 integrado */}
        <div className="text-center mb-5">
          <img
            src={assetUrl('logo.jpg')}
            alt="Mi Gordólogo"
            className="h-24 w-auto mx-auto object-contain mb-2"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="h-0.5 w-10 bg-emerald-200 mx-auto my-2 rounded-full" />
          <p className="text-xs font-medium text-neutral-600">
            ¿Quién va a usar la aplicación hoy?
          </p>
        </div>

        {/* Lista de perfiles */}
        <div className="space-y-2 mb-4">
          {profiles.map((p) => {
            const isMaria = p.id === 'maria_ignacia';
            const isPepe = p.id === 'pepe';
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${
                  isMaria
                    ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500 shadow-2xs'
                    : isPepe
                    ? 'bg-neutral-800 border-neutral-700 hover:border-neutral-500 text-white'
                    : 'bg-neutral-50/80 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                      isMaria ? 'bg-emerald-700 text-white' : isPepe ? 'bg-white text-neutral-900' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm transition-colors ${isPepe ? 'text-white' : 'text-neutral-900 group-hover:text-emerald-700'}`}>
                      {p.name}
                    </h4>
                    <p className={`text-[11px] ${isPepe ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {isMaria
                        ? 'Plan Morales Meseguer (1.500 kcal)'
                        : isPepe
                        ? 'Superadmin'
                        : `${p.age} años · Objetivo: ${p.targetCalories} kcal`}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}

          {storageService.isSuperadmin() && (
          <button
            onClick={() => setShowWizard(true)}
            className="w-full flex items-center justify-center space-x-2 p-3 rounded-2xl border border-dashed border-neutral-300 text-neutral-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/40 text-xs font-semibold transition-all mt-2"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Crear nuevo usuario con cuestionario</span>
          </button>
          )}
        </div>

        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-neutral-400 hover:text-neutral-600 py-1"
          >
            Cerrar sin cambiar
          </button>
        )}
      </div>

      {/* Asistente de Toma de Datos para Nuevo Usuario */}
      <NewUserWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onUserCreated={handleCreatedFromWizard}
      />
    </div>
  );
};
