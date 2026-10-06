import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, MessageCircle } from 'lucide-react';
import { geminiService } from '@/domain/services/geminiService';
import { backendService } from '@/domain/services/backendService';
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
  const [hasGemini, setHasGemini] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void backendService.status().then((res) => {
      if (cancelled) return;
      const on = Boolean(res.hasGemini);
      const kcal = storageService.getActiveProfile().targetCalories || 1500;
      setHasGemini(on);
      setMessages([
        {
          role: 'assistant',
          text: on
            ? `El Gordólogo. Pregunta lo que quieras sobre tu dieta de ${kcal} kcal: claro, sin tecnicismos y sin teatro.`
            : `El Gordólogo. Te oriento con las reglas de la dieta (${kcal} kcal). Cuando esté la IA, las respuestas serán más precisas.`,
        },
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const sync = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardPad(covered);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, loading, keyboardPad]);

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
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ paddingBottom: keyboardPad }}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[min(92dvh,720px)] max-h-[92dvh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
          {loading && <p className="text-xs text-neutral-400">Un momento…</p>}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
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
          className="p-3 border-t border-neutral-100 flex gap-2 shrink-0 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              window.setTimeout(() => inputRef.current?.scrollIntoView({ block: 'nearest' }), 300);
            }}
            placeholder="Escribe tu duda…"
            enterKeyHint="send"
            autoComplete="off"
            className="flex-1 text-base text-neutral-900 bg-white caret-emerald-700 p-2.5 rounded-xl border border-neutral-200 min-w-0"
            style={{ WebkitTextFillColor: '#171717', fontSize: 16 }}
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
