import React, { useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { fieldInputClass } from '@/ui/components/forms/PasswordField';

interface Props {
  hasGemini: boolean;
  busy: boolean;
  onSaveGemini: (apiKey: string) => Promise<boolean>;
}

export const AdminAiConfigCard: React.FC<Props> = ({ hasGemini, busy, onSaveGemini }) => {
  const [geminiKey, setGeminiKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSaveGemini(geminiKey);
    if (ok) setGeminiKey('');
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          Clave API IA Google (Gemini)
        </label>
        {hasGemini && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Configurada
          </span>
        )}
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Solo visible para ti como administrador. El resto de usuarios nunca ven ni gestionan esta clave.
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          placeholder={hasGemini ? 'Pegar nueva clave para sustituir…' : 'AIza… o AQ.…'}
          required
          autoComplete="off"
          spellCheck={false}
          className={`${fieldInputClass} font-mono`}
        />
        <button
          type="submit"
          disabled={busy}
          className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shrink-0"
        >
          Guardar
        </button>
      </div>
    </form>
  );
};
