import React from 'react';
import { CheckCircle2, FileUp, ShoppingBag, UtensilsCrossed, X } from 'lucide-react';
import { formatKcalLabel } from '@/domain/services/calorieEstimateService';
import type { MenuImportResult } from '@/domain/services/menuPersonalizeService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFile: (file: File) => Promise<void>;
  onGoMenu: () => void;
  onGoShopping: () => void;
  busy: boolean;
  error: string | null;
  success: MenuImportResult | null;
}

export const ImportMenuModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onFile,
  onGoMenu,
  onGoShopping,
  busy,
  error,
  success,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900">
              {success ? 'Menú del PDF cargado' : 'Adjuntar menú en PDF'}
            </h3>
            {!success && (
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                La app lee comidas y cenas del PDF y sustituye las de este perfil. No aplica el límite de 1.500 kcal.
                Desayunos y meriendas se quedan como están. La lista de la compra se regenera.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400" aria-label="Cerrar" disabled={busy}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <p className="text-sm font-bold text-emerald-950">Todo listo</p>
              <p className="text-[11px] text-emerald-900 leading-relaxed">{success.message}</p>
              <p className="text-xs font-bold text-emerald-800">
                Estimación del menú: ~{formatKcalLabel(success.estimatedDailyKcal)}/día
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onGoMenu}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Ver menú
              </button>
              <button
                type="button"
                onClick={onGoShopping}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-bold"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Ver lista
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 cursor-pointer">
              <FileUp className="w-6 h-6 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-900">{busy ? 'Procesando PDF…' : 'Elegir PDF'}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {error && <p className="text-[11px] text-rose-700 mt-3 leading-relaxed">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
};
