import React, { useState } from 'react';
import { X, Check, UserPlus } from 'lucide-react';
import { backendService } from '@/domain/services/backendService';
import { adminService } from '@/domain/services/adminService';
import { authSyncService } from '@/domain/services/authSyncService';
import { storageService } from '@/domain/services/storageService';
import { getHospitalMenuSeed } from '@/data/hospitalMenuSeed';
import { computeTargetCalories, scaleWeekMenus } from '@/domain/services/menuScaleService';
import type { BodyMeasurement, UserProfile } from '@/domain/models/types';
import { PasswordField, fieldInputClass } from '@/ui/components/forms/PasswordField';

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
  const [weighInDay, setWeighInDay] = useState(4);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !backendService.isVerifiedAdmin()) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!email.trim().includes('@')) {
      setError('Indica un email válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setError(null);

    const parsedAge = parseInt(age, 10) || 40;
    const parsedHeight = parseInt(height, 10) || 175;
    const parsedWeight = parseFloat(weight) || 75;
    const targetCalories = computeTargetCalories({
      age: parsedAge,
      height: parsedHeight,
      weight: parsedWeight,
      gender,
      activityLevel,
      goal,
    });
    const genderOffset = gender === 'female' ? -161 : 5;
    const bmr = Math.round(10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge + genderOffset);
    const newId = `usr_${Date.now()}`;
    const weeks = scaleWeekMenus(getHospitalMenuSeed(), 1500);
    const measurements: BodyMeasurement[] =
      parsedWeight > 0
        ? [
            {
              id: `m_${Date.now()}`,
              userId: newId,
              date: new Date().toISOString().split('T')[0],
              weight: parsedWeight,
              bmi: parseFloat(
                (parsedWeight / ((parsedHeight / 100) * (parsedHeight / 100))).toFixed(1)
              ),
              fatMass: null,
              fatPercent: null,
              freeFatMass: null,
              leanMass: null,
              skeletalMuscle: null,
              totalWater: null,
              waterPercent: null,
              boneMinerals: null,
              proteins: null,
              visceralFat: null,
              metabolicRate: null,
              metabolicAge: parsedAge,
              basalMetabolism: bmr,
            },
          ]
        : [];

    // Primero persistimos en servidor (sin contaminar localStorage si falla)
    const res = await adminService.createUser({
      id: newId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      age: parsedAge,
      height: parsedHeight,
      targetCalories,
      gender,
      activityLevel,
      goal,
      weighInDay,
      weeks,
      measurements,
    });

    if (!res.ok || !res.user) {
      setError(res.error || 'No se pudo crear el perfil en el servidor.');
      setBusy(false);
      return;
    }

    await adminService.openAsUser(res.user.id);
    await authSyncService.syncAfterAuth();
    const active = storageService.getActiveProfile();

    setName('');
    setAge('');
    setHeight('');
    setWeight('');
    setEmail('');
    setPassword('');
    onUserCreated(active);
    onClose();
    setBusy(false);
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
              <p className="text-[11px] text-neutral-500">Alta directa aprobada por administrador</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Nombre *</label>
            <input
              type="text"
              required
              placeholder="Ej: Carmen, Antonio…"
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

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Sexo biológico (para fórmula metabólica)
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
                Mujer
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
                Hombre
              </button>
            </div>
          </div>

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
                  {lvl === 'sedentary' ? 'Sedentario' : lvl === 'moderate' ? 'Moderado' : 'Activo'}
                </button>
              ))}
            </div>
          </div>

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
                Perder Grasa
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
                Mantener Salud
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Día de pesaje semanal
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {[
                { id: 1, label: 'L' },
                { id: 2, label: 'M' },
                { id: 3, label: 'X' },
                { id: 4, label: 'J' },
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
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Email (acceso)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldInputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Contraseña (mín. 6)</label>
            <PasswordField
              value={password}
              onChange={setPassword}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Se crea ya aprobado y su contraseña queda cifrada en tu bóveda de administrador.
            </p>
          </div>

          {error && (
            <p className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2">
              {error}
            </p>
          )}

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
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 shadow-sm flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{busy ? 'Guardando…' : 'Guardar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
