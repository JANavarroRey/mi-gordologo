import React, { useState, useEffect } from 'react';
import { Scale, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '@/domain/services/storageService';

export const WeeklyWeighInAlert: React.FC = () => {
  const [alertInfo, setAlertInfo] = useState<{ needed: boolean; daysSinceLast: number; lastDate: string | null }>({
    needed: false,
    daysSinceLast: 0,
    lastDate: null,
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = storageService.needsWeeklyWeighIn();
    setAlertInfo(check);
  }, []);

  if (!alertInfo.needed || isDismissed) return null;

  const activeUser = storageService.getActiveProfile();

  const handleDismiss = () => {
    setIsDismissed(true);
    storageService.dismissWeighInAlert(activeUser.id);
  };

  const handleGoToTracking = () => {
    handleDismiss();
    navigate('/seguimiento');
  };

  return (
    <div className="bg-emerald-800 text-white rounded-2xl px-3.5 py-2.5 shadow-sm mb-3 border border-emerald-700/60 animate-in fade-in flex items-center justify-between gap-2">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className="p-1.5 rounded-xl bg-emerald-700/80 text-emerald-200 shrink-0">
          <Scale className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight truncate">
            ¡Hoy toca pesaje! ({activeUser.name.split(' ')[0]})
          </p>
          <p className="text-[10px] text-emerald-200 leading-tight">
            Pésate en ayunas para el parte semanal con El Gordólogo 🍋
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={handleGoToTracking}
          className="px-2.5 py-1 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-[11px] font-bold transition-colors shadow-2xs"
        >
          Anotar
        </button>
        <button
          onClick={handleDismiss}
          className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50"
          title="Descartar por hoy"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
