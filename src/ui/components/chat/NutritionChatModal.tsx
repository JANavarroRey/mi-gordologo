import React, { useEffect, useState } from 'react';
import { X, Send, Sparkles, MessageCircle } from 'lucide-react';
import { geminiService } from '@/domain/services/geminiService';
import { backendService } from '@/domain/services/backendService';

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
  const [hasGemini, setHasGemini] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void backendService.status().then((res) => {
      if (cancelled) return;
      const on = Boolean(res.hasGemini);
      setHasGemini(on);
      setMessages([
        {
          role: 'assistant',
          text: on
            ? 'Soy El Gordólogo 🍋 Pregúntame lo que quieras sobre tu dieta de 1.500 kcal. Hablo claro y sin tecnicismos.'
            : 'Soy El Gordólogo 🍋 Te ayudo con las reglas de la dieta. Cuando el superadmin active la IA, las respuestas serán más completas.',
        },
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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
              <p className="text-[10px] text-neutral-500">{hasGemini ? 'IA Gemini activa' : 'Modo dieta (IA aún no activada)'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100" aria-label="Cerrar">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user' ? 'ml-auto bg-emerald-700 text-white' : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {m.text}
            </div>
          ))}
          {loading && <p className="text-xs text-neutral-400">El Gordólogo está pensando…</p>}
        </div>

        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void ask(q)}
              className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          className="p-3 border-t border-neutral-100 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu duda…"
            className="flex-1 text-sm p-2.5 rounded-xl border border-neutral-200 min-w-0"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2.5 rounded-xl bg-emerald-700 text-white disabled:opacity-50"
            aria-label="Enviar"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
