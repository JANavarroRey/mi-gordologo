import React from 'react';
import { FileUp, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFile: (file: File) => Promise<void>;
  busy: boolean;
  message: string | null;
}

export const ImportMenuModal: React.FC<Props> = ({ isOpen, onClose, onFile, busy, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900">Adjuntar menú en PDF</h3>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
              La app lee comidas y cenas del PDF y sustituye las de este perfil. No aplica el límite de 1.500 kcal.
              Desayunos y meriendas se quedan como están.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 cursor-pointer">
          <FileUp className="w-6 h-6 text-emerald-700" />
          <span className="text-xs font-bold text-emerald-900">{busy ? 'Procesando…' : 'Elegir PDF'}</span>
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
        {message && <p className="text-[11px] text-neutral-600 mt-3 leading-relaxed">{message}</p>}
      </div>
    </div>
  );
};
