import React, { useState } from 'react';
import { X, Send, Sparkles, MessageCircle, KeyRound } from 'lucide-react';
import { geminiService } from '@/domain/services/geminiService';
import { storageService } from '@/domain/services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_QUESTIONS = [
  '¿Puedo tomar cerveza sin alcohol?',
  '¿Cuánta fruta es una ración?',
  '¿Qué hago si tengo un antojo dulce?',
  '¿Cuánta agua debo beber al día?',
];

export const NutritionChatModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const hasKey = Boolean(storageService.getGeminiApiKey());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: hasKey
        ? 'Soy El Gordólogo 🍋 Pregúntame lo que quieras sobre tu dieta de 1.500 kcal. Hablo claro y sin tecnicismos.'
        : 'Soy El Gordólogo 🍋 Puedo ayudarte ya con las dudas habituales. Para respuestas más completas, guarda tu clave Gemini gratis en Perfil.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const answer = await geminiService.askNutritionQuestion(q);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Ahora mismo no pude responder. Prueba de nuevo en un momento.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-extrabold text-neutral-900">Pregunta al Gordólogo</h2>
              <p className="text-[10px] text-neutral-500">
                {hasKey ? 'IA Gemini activa' : 'Modo offline · activa Gemini en Perfil'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100" aria-label="Cerrar">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {!hasKey && (
          <div className="mx-3 mt-3 flex items-start space-x-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
            <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-snug">
              Sin clave Gemini respondo con reglas de la dieta. En <strong>Perfil</strong> pega tu clave gratis de{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold">
                AI Studio
              </a>
              .
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto bg-emerald-600 text-white'
                  : 'mr-auto bg-neutral-100 text-neutral-800'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="mr-auto bg-neutral-100 rounded-2xl px-3 py-2 text-xs text-neutral-500 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>Pensando…</span>
            </div>
          )}
        </div>

        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="p-3 border-t border-neutral-100 flex space-x-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 text-sm p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 text-white disabled:opacity-50 min-h-[44px] min-w-[44px]"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
