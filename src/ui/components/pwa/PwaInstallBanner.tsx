import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'migordologo_install_dismissed';

export const PwaInstallBanner: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  return (
    <div className="mb-3 rounded-2xl bg-emerald-700 text-white p-3.5 shadow-sm flex items-start space-x-3">
      <Download className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">Instalar Mi Gordólogo</p>
        <p className="text-[11px] text-emerald-100 mt-0.5 leading-snug">
          Añádelo a la pantalla de inicio como una app. Funciona sin abrir el navegador.
        </p>
        <div className="flex space-x-2 mt-2">
          <button
            type="button"
            onClick={install}
            className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-bold"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-3 py-1.5 rounded-xl text-emerald-100 text-xs font-semibold hover:bg-emerald-600"
          >
            Ahora no
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} className="p-1 text-emerald-200 hover:text-white" aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
