import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, ChevronRight, Award, Flame, Droplets, Footprints } from 'lucide-react';
import type { UserProfile, BodyMeasurement } from '@/domain/models/types';

interface WeeklyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  latestMeasurement?: BodyMeasurement;
  previousMeasurement?: BodyMeasurement;
  onCompleted?: () => void;
}

export const WeeklyCheckInModal: React.FC<WeeklyCheckInModalProps> = ({
  isOpen,
  onClose,
  user,
  latestMeasurement,
  previousMeasurement,
  onCompleted,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Respuestas del cuestionario
  const [adherence, setAdherence] = useState<string>('');
  const [cravings, setCravings] = useState<string>('');
  const [water, setWater] = useState<string>('');
  const [activity, setActivity] = useState<string>('');

  if (!isOpen) return null;

  // Cálculos de variación
  const weightChange = latestMeasurement && previousMeasurement
    ? parseFloat((latestMeasurement.weight - previousMeasurement.weight).toFixed(1))
    : null;

  const currentWeight = latestMeasurement ? latestMeasurement.weight : null;
  const heightM = user.height / 100;
  const currentBmi = currentWeight ? parseFloat((currentWeight / (heightM * heightM)).toFixed(1)) : null;

  // Generación inteligente del dictamen
  const generateDictamen = () => {
    const isWeightDown = weightChange !== null && weightChange < 0;
    const isWeightUp = weightChange !== null && weightChange > 0;
    const isWeightSame = weightChange !== null && weightChange === 0;

    let headline = '';
    let body = '';
    let consejo = '';

    if (isWeightDown) {
      const lostAbs = Math.abs(weightChange!);
      headline = `🎉 ¡Olé ese progreso! Has bajado ${lostAbs} kg`;
      body = `El esfuerzo con las 1.500 kcal y el plan del Morales Meseguer da sus frutos. Has pasado a ${currentWeight} kg (IMC ${currentBmi}). Tu organismo está quemando reservas de grasa de forma controlada y segura.`;
    } else if (isWeightUp) {
      headline = `⚖️ Pequeña subida puntual (+${weightChange} kg) — ¡Sin culpa ni agobio!`;
      body = `En una dieta médica, el peso corporal fluctúa por retención de líquidos, tránsito digestivo o hidratación celular. Pesas ${currentWeight} kg. Lo importante es mantener la constancia en el menú de las 8 semanas.`;
    } else if (isWeightSame) {
      headline = `🛡️ Peso consolidado (${currentWeight} kg) — La base para el siguiente empujón`;
      body = `Mantener el peso sin rebotes es una victoria metabólica en personas de más de 65 años. Tu cuerpo está fijando la masa muscular y adaptando su metabolismo basal.`;
    } else {
      headline = `🍋 ¡Bienvenida a tu primera revisión médica con El Gordólogo!`;
      body = `Hemos registrado tu peso base de ${currentWeight || 77.8} kg. A partir de hoy, cada jueves monitorizaremos tu progreso semana a semana.`;
    }

    // Consejos basados en las respuestas débiles
    if (water.includes('Poco')) {
      consejo = '💧 Prioridad para esta semana: Bebe al menos 1,5 litros diarios (agua con rodajas de limón o infusiones sin azúcar). Ayudará a tus riñones y calmará el falso apetito.';
    } else if (adherence.includes('complicados') || adherence.includes('No he podido')) {
      consejo = '🍲 Para la semana que entra: Recuerda que puedes usar el botón "Ajustar" para cambiar platos que no te apetezcan por pollo, merluza o ensalada murciana en 1 segundo.';
    } else if (cravings.includes('picoteado')) {
      consejo = '🍎 Truco del Gordólogo contra el picoteo: Ten siempre a mano palitos de pepino, gelatina 0% o un yogur desnatado. Y no olvides la recena antes de dormir.';
    } else if (activity.includes('casi no') || activity.includes('No he podido')) {
      consejo = '🚶 Reto suave: 2 paseos cortos + 1 sesión de fuerza suave en casa (sentadillas al respaldo de una silla). Si te va la bici, 20–30 min también cuenta.';
    } else if (activity.includes('Fuerza') || activity.includes('bici')) {
      consejo = '💪🚴 Buen combo. Mantén esos 2+2 y cuida la recuperación: proteína en comida/cena y 1,5 L de agua.';
    } else {
      consejo = '🌟 Vas por el camino excelente. Sigue con el menú pautado de la semana y disfruta de tus comidas sin prisa (mínimo 20 minutos por ingesta).';
    }

    return { headline, body, consejo };
  };

  const dictamen = generateDictamen();

  const handleFinish = () => {
    // Guardar el registro de la entrevista en storageService
    const reviewData = {
      date: new Date().toISOString(),
      adherence,
      cravings,
      water,
      activity,
      dictamen,
    };
    localStorage.setItem(`migordologo_weekly_review_${user.id}_${new Date().toISOString().split('T')[0]}`, JSON.stringify(reviewData));
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">👨‍⚕️</span>
            <div>
              <h3 className="font-extrabold text-sm font-display leading-tight">
                Parte Semanal con El Gordólogo
              </h3>
              <p className="text-[11px] text-emerald-100">
                Paso {step} de 5 · Revisión médica de los Jueves
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-neutral-100 h-1.5">
          <div
            className="bg-emerald-600 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Contenido según el paso */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* PASO 1: ADHERENCIA */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800">
                <Flame className="w-5 h-5" />
                <h4 className="font-bold text-sm text-neutral-900">
                  ¿Cómo ha ido el menú del hospital esta semana?
                </h4>
              </div>
              <p className="text-xs text-neutral-500">
                Sé sincera, aquí no juzgamos a nadie; solo ajustamos el rumbo:
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { id: 'perfect', label: '✅ He seguido el menú todos los días a rajatabla' },
                  { id: 'mostly', label: '🤏 Lo he seguido casi siempre (algún desliz pequeño)' },
                  { id: 'mixed', label: '😬 He tenido varios días complicados de seguir' },
                  { id: 'hard', label: '❌ Esta semana no he podido seguir el plan' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAdherence(opt.label);
                      setStep(2);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      adherence === opt.label
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                        : 'border-neutral-200 hover:border-emerald-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: ANTOJOS */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-bold text-sm text-neutral-900">
                  ¿Has tenido tentaciones o picoteo entre horas?
                </h4>
              </div>
              <p className="text-xs text-neutral-500">
                El protocolo incluye 5 tomas + recena precisamente para evitar pasar hambre:
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { id: 'none', label: '💪 No, he estado saciada y tranquila toda la semana' },
                  { id: 'resisted', label: '🦸 Sí tuve ganas, pero aguanté o tomé fruta/infusión' },
                  { id: 'some', label: '🍫 Caí en algún dulce o picoteo puntual' },
                  { id: 'frequent', label: '🍪 He picoteado entre horas varios días' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setCravings(opt.label);
                      setStep(3);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      cravings === opt.label
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs'
                        : 'border-neutral-200 hover:border-emerald-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 3: AGUA */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-cyan-800">
                <Droplets className="w-5 h-5" />
                <h4 className="font-bold text-sm text-neutral-900">
                  ¿Has bebido suficiente líquido (al menos 1,5 L/día)?
                </h4>
              </div>
              <p className="text-xs text-neutral-500">
                El agua es clave para no retener líquidos y ayudar al riñón:
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { id: 'good', label: '💧 Sí, cumplo con el agua y las infusiones sin problema' },
                  { id: 'regular', label: '🚰 La mayoría de días, aunque algunos me quedo corta' },
                  { id: 'low', label: '😅 Poco, me cuesta acordarme de beber' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setWater(opt.label);
                      setStep(4);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      water === opt.label
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-950 shadow-xs'
                        : 'border-neutral-200 hover:border-cyan-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 4: ACTIVIDAD FÍSICA */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-amber-800">
                <Footprints className="w-5 h-5" />
                <h4 className="font-bold text-sm text-neutral-900">
                  ¿Qué actividad física has hecho esta semana?
                </h4>
              </div>
              <p className="text-xs text-neutral-500">
                Elige la opción que más se acerque (fuerza, bici, paseo u otra):
              </p>
              <div className="space-y-2 pt-1">
                {[
                  { id: 'strength_bike', label: '💪🚴 Fuerza 2 días + bici 2 días (o similar combinado)' },
                  { id: 'walk', label: '🚶 He caminado activamente 3 o más días' },
                  { id: 'mixed', label: '🏃 Mezcla: paseo + algo de fuerza, bici o natación' },
                  { id: 'light', label: '🪴 Movimiento suave 1–2 días (paseo corto, estiramientos)' },
                  { id: 'none', label: '🛋️ Esta semana casi no he podido moverme' },
                  { id: 'other', label: '✍️ Otro (yoga, pilates, natación, baile…)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setActivity(opt.label);
                      setStep(5);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      activity === opt.label
                        ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs'
                        : 'border-neutral-200 hover:border-amber-300 hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 5: DICTAMEN FINAL DEL GORDÓLOGO */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-3xl">🍋</span>
                <h4 className="font-extrabold text-sm text-emerald-950 mt-1 font-display">
                  {dictamen.headline}
                </h4>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed space-y-2">
                <p>{dictamen.body}</p>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/70 text-amber-900 font-medium text-xs flex items-start space-x-2">
                  <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{dictamen.consejo}</span>
                </div>
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block">Peso Actual</span>
                  <span className="text-base font-extrabold text-neutral-900">{currentWeight ? `${currentWeight} kg` : '—'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block">Índice Masa (IMC)</span>
                  <span className="text-base font-extrabold text-emerald-700">{currentBmi || '—'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar Dictamen y Continuar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
