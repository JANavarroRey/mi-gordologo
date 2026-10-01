import React, { useState } from 'react';
import { X, Check, Users, UserPlus } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import type { UserProfile } from '@/domain/models/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: UserProfile) => void;
}

export const NewUserWizardModal: React.FC<Props> = ({ isOpen, onClose, onUserCreated }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'moderate' | 'active'>('moderate');
  const [goal, setGoal] = useState<'lose_weight' | 'maintain'>('lose_weight');
  const [shareMenuWithMaria, setShareMenuWithMaria] = useState(false);
  const [weighInDay, setWeighInDay] = useState(4); // Jueves por defecto

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = storageService.createNewProfileWithIntake({
      name: name.trim(),
      age: parseInt(age, 10) || 40,
      height: parseInt(height, 10) || 175,
      weight: parseFloat(weight) || 75,
      gender,
      activityLevel,
      goal,
      linkedMenuUserId: shareMenuWithMaria ? 'maria_ignacia' : null,
      weighInDay,
    });

    onUserCreated(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-neutral-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-primary-100 text-primary-800">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base font-display text-neutral-900 leading-tight">
                Crear Nuevo Perfil
              </h3>
              <p className="text-[11px] text-neutral-500">Toma de datos y personalización</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nombre y Edad */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              placeholder="Ej: José Antonio, Carmen..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Edad</label>
              <input
                type="number"
                placeholder="40"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Altura (cm)</label>
              <input
                type="number"
                placeholder="175"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="75"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 font-bold"
              />
            </div>
          </div>

          {/* Sexo biológico para cálculo de gasto metabólico */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Sexo biológico (para fórmula metabólica exacta)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  gender === 'female'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs font-bold'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                }`}
              >
                👩 Mujer (-161 kcal)
              </button>
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  gender === 'male'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs font-bold'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                }`}
              >
                👨 Hombre (+5 kcal)
              </button>
            </div>
          </div>

          {/* Nivel de actividad */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">Actividad física diaria</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['sedentary', 'moderate', 'active'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setActivityLevel(lvl)}
                  className={`py-1.5 px-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    activityLevel === lvl
                      ? 'bg-primary-50 border-primary-500 text-primary-800 shadow-xs'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                  }`}
                >
                  {lvl === 'sedentary' ? '🚶 Sedentario' : lvl === 'moderate' ? '🏃 Moderado' : '⚡ Activo'}
                </button>
              ))}
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">Objetivo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGoal('lose_weight')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  goal === 'lose_weight'
                    ? 'bg-primary-50 border-primary-500 text-primary-800 shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                }`}
              >
                📉 Perder Grasa
              </button>
              <button
                type="button"
                onClick={() => setGoal('maintain')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  goal === 'maintain'
                    ? 'bg-primary-50 border-primary-500 text-primary-800 shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'
                }`}
              >
                ⚖️ Mantener Salud
              </button>
            </div>
          </div>

          {/* Día de pesaje preferido */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Día de pesaje y entrevista semanal
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {[
                { id: 1, label: 'L' },
                { id: 2, label: 'M' },
                { id: 3, label: 'X' },
                { id: 4, label: 'J ⭐' },
                { id: 5, label: 'V' },
                { id: 6, label: 'S' },
                { id: 0, label: 'D' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setWeighInDay(d.id)}
                  className={`py-1.5 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                    weighInDay === d.id
                      ? 'bg-emerald-700 border-emerald-800 text-white font-bold shadow-xs'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Recomendado: <strong>Jueves por la mañana</strong>.</p>
          </div>

          {/* VINCULACIÓN DE MENÚ (COMPARTIR MENÚ FAMILIAR) */}
          <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-200/80 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">
                  ¿Compartir Menú con María Ignacia?
                </span>
              </div>
              <input
                type="checkbox"
                checked={shareMenuWithMaria}
                onChange={(e) => setShareMenuWithMaria(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 mt-0.5 cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-emerald-800 leading-relaxed">
              {shareMenuWithMaria ? (
                <span>
                  ✓ <strong>Cocinaréis lo mismo:</strong> Verás y editarás los mismos platos que María Ignacia. Tu seguimiento de peso será <strong>privado</strong>.
                </span>
              ) : (
                <span>
                  ✓ <strong>Menú propio:</strong> tendrás tu plan independiente (recomendado si tus calorías o necesidades son distintas).
                </span>
              )}
            </p>
          </div>

          <div className="flex space-x-2 pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 shadow-sm flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Perfil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
