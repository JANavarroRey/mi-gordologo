import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { FoodIntake } from '@/domain/models/types';

interface Props {
  isOpen: boolean;
  personName: string;
  onClose: () => void;
  onComplete: (intake: FoodIntake) => void;
  busy?: boolean;
  error?: string | null;
}

const MEAL_OPTS = [
  { id: 'breakfast', label: 'Desayuno' },
  { id: 'midMorning', label: 'Media mañana' },
  { id: 'lunch', label: 'Comida' },
  { id: 'snack', label: 'Merienda' },
  { id: 'dinner', label: 'Cena' },
  { id: 'recena', label: 'Recena' },
];

const LIKE_OPTS = ['Pescado', 'Carne', 'Legumbres', 'Huevos', 'Verduras', 'Pasta/arroz', 'Guisos', 'Plancha', 'Ensaladas', 'Lácteos'];

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export const HabitsQuestionnaireModal: React.FC<Props> = ({
  isOpen,
  personName,
  onClose,
  onComplete,
  busy = false,
  error = null,
}) => {
  const [mealsEaten, setMealsEaten] = useState<string[]>(['breakfast', 'lunch', 'dinner']);
  const [sport, setSport] = useState<FoodIntake['sport']>('walk');
  const [sportDays, setSportDays] = useState(3);
  const [likes, setLikes] = useState<string[]>(['Verduras', 'Pescado']);
  const [dislikes, setDislikes] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    onComplete({
      completedAt: new Date().toISOString(),
      mealsEaten,
      sport,
      sportDays,
      likes,
      dislikes: dislikes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      allergies: allergies.trim(),
      notes: notes.trim(),
      importedFromPdf: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-neutral-900">Hábitos de {personName}</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Para adaptar comidas y cenas. No se aplica al menú hospitalario de María.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-neutral-400" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <p className="text-xs font-bold text-neutral-700 mb-1.5">¿Qué tomas casi todos los días?</p>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_OPTS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealsEaten((prev) => toggle(prev, m.id))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    mealsEaten.includes(m.id)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-700 mb-1.5">Deporte</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                ['none', 'Nada'],
                ['walk', 'Andar'],
                ['gym', 'Gimnasio'],
                ['other', 'Otro'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSport(id)}
                  className={`py-2 rounded-xl text-[11px] font-semibold border ${
                    sport === id ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {sport !== 'none' && (
              <label className="block mt-2 text-[11px] text-neutral-600">
                Días por semana
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={sportDays}
                  onChange={(e) => setSportDays(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full text-xs p-2 rounded-xl border border-neutral-200"
                />
              </label>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-700 mb-1.5">Te gusta (puedes marcar varios)</p>
            <div className="flex flex-wrap gap-1.5">
              {LIKE_OPTS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLikes((prev) => toggle(prev, m))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    likes.includes(m) ? 'bg-emerald-50 text-emerald-900 border-emerald-400' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">No te apetece / evitas (separado por comas)</label>
            <input
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="Ej: hígado, muy picante, marisco"
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Alergias o intolerancias</label>
            <input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ninguna, o p. ej. lactosa"
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Notas (horarios, cocina, Thermomix…)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
            />
          </div>

          {error && <p className="text-[11px] text-rose-700 leading-relaxed">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-2xl bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {busy ? 'Adaptando comidas y cenas…' : 'Adaptar mi menú'}
          </button>
        </form>
      </div>
    </div>
  );
};
