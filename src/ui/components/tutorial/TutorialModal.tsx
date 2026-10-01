import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Sparkles, UtensilsCrossed, Scale, Users, ShoppingCart, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    icon: <UtensilsCrossed className="w-8 h-8 text-emerald-700" />,
    badge: 'Paso 1 · Tu Menú Diario',
    title: '¿Qué me toca comer hoy?',
    shortDesc: 'La app se abre sola en el día de hoy con tus 5 tomas',
    detail:
      'Al abrir la app verás marcada la pestaña "HOY" con tus platos pautados por el Hospital Morales Meseguer: Desayuno, Media mañana, Comida, Merienda, Cena y tu Recena antes de dormir.',
    tip: 'Consejo: Si quieres consultar otros días, toca en L, M, X, J, V, S, D. Para volver al momento actual, pulsa el botón "Ir a Hoy".',
  },
  {
    icon: <Sparkles className="w-8 h-8 text-amber-600" />,
    badge: 'Paso 2 · Ajustes a tu Gusto',
    title: '¿Algo no te apetece? Cámbialo en 1 toque',
    shortDesc: 'Pulsa el botón "Ajustar" al lado del plato',
    detail:
      'Si un día no te apetece el pescado o prefieres pollo, pulsa "Ajustar". Tendrás opciones rápidas aprobadas por el hospital (pollo a la plancha, merluza al vapor, ensalada murciana...) o puedes escribir lo que quieras para que El Gordólogo lo adapte a tus 1.500 kcal.',
    tip: 'Consejo: En el desayuno y merienda verás opciones específicas como yogur con fruta o tostada con aceite.',
  },
  {
    icon: <Scale className="w-8 h-8 text-emerald-800" />,
    badge: 'Paso 3 · Jueves de Báscula',
    title: 'Pesaje y Entrevista con El Gordólogo',
    shortDesc: 'Cada jueves por la mañana en ayunas',
    detail:
      'Los jueves por la mañana, pésate en la báscula y anota tu peso en "Seguimiento". Se abrirá una pequeña entrevista de 4 preguntas rápidas para ver cómo ha ido la semana y El Gordólogo te dará su parte médico con consejos para seguir bajando.',
    tip: 'Consejo: Pésate siempre en ayunas y con ropa ligera para que las cifras sean exactas semana a semana.',
  },
  {
    icon: <Users className="w-8 h-8 text-teal-700" />,
    badge: 'Paso 4 · Raciones Familiares',
    title: 'Cocinar para 1 o para 2 personas',
    shortDesc: 'Las cantidades se duplican matemáticamente de verdad',
    detail:
      'En la parte superior puedes elegir entre "1 Ración" (solo para ti) o "2 Raciones" (para cocinar también para papá). Al tocarlo, todos los gramos de legumbres, carne, patata y pescado se multiplican automáticamente para no hacer cálculos mentales.',
    tip: 'Consejo: También puedes buscar el plato en Cookidoo tocando el botón "Ver en Cookidoo" para cocinarlo en la Thermomix.',
  },
  {
    icon: <ShoppingCart className="w-8 h-8 text-emerald-700" />,
    badge: 'Paso 5 · En el Súper',
    title: 'Lista de la Compra y WhatsApp',
    shortDesc: 'Tacha con el dedo o mándasela a la familia',
    detail:
      'En la pestaña "Lista" tienes todos los ingredientes de la semana organizados por pasillos (Frutas, Carnes, Pescados...). Toca cada alimento para tacharlo según lo metes al carro, o pulsa "Enviar por WhatsApp" para que alguien te lo compre sin errores.',
    tip: 'Consejo: Puedes añadir productos extra que necesites en casa con el botón "Añadir a la lista".',
  },
  {
    icon: <Printer className="w-8 h-8 text-neutral-800" />,
    badge: 'Paso 6 · Imprimir para la Nevera',
    title: 'Tabla Semanal Completa en 1 Folio',
    shortDesc: 'Imprime la semana entera para tenerla a la vista',
    detail:
      'Si prefieres ver la semana de un vistazo, pulsa el icono de tabla junto a los días. Podrás consultar los 7 días juntos o darle a "Imprimir" para pegarlo en la puerta de la nevera. Está optimizado para entrar en una única hoja A4 limpia sin adornos molestos.',
    tip: 'Consejo: El menú rota a lo largo de 8 semanas completas para no aburrirte nunca de comer lo mismo.',
  },
];

export const TutorialModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabecera */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
              Guía Fácil · Mi Gordólogo 🍋
            </span>
            <h3 className="font-extrabold text-base font-display leading-tight">
              Aprende a usar tu app en 1 minuto
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso moderna y continua */}
        <div className="w-full bg-neutral-100 h-1.5 flex">
          {TUTORIAL_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                idx <= currentStepIndex ? 'bg-emerald-600' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {/* Contenido del paso actual */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {currentStep.badge}
            </span>
            <span className="text-xs font-semibold text-neutral-400">
              {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
            </span>
          </div>

          <div className="flex items-start space-x-3 pt-1">
            <div className="p-2.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 shrink-0">
              {currentStep.icon}
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-900 font-display leading-snug">
                {currentStep.title}
              </h4>
              <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                {currentStep.shortDesc}
              </p>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/70 text-xs sm:text-sm text-neutral-700 leading-relaxed">
            {currentStep.detail}
          </div>

          <div className="bg-amber-50/90 rounded-2xl p-3.5 border border-amber-200/70 text-xs text-amber-900 leading-relaxed flex items-start space-x-2.5">
            <span className="text-base shrink-0 select-none">💡</span>
            <span className="font-medium">{currentStep.tip}</span>
          </div>
        </div>

        {/* Indicador de píldoras estilizadas */}
        <div className="flex justify-center space-x-1.5 py-2 px-4">
          {TUTORIAL_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStepIndex === idx
                  ? 'w-8 bg-emerald-700 shadow-2xs'
                  : 'w-2 bg-neutral-200 hover:bg-neutral-300'
              }`}
              title={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        {/* Botones de navegación con tamaños accesibles */}
        <div className="flex space-x-2 p-4 pt-2 border-t border-neutral-100 bg-neutral-50/50">
          {!isFirst ? (
            <button
              onClick={() => setCurrentStepIndex((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-white flex items-center space-x-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-500 hover:bg-white transition-colors"
            >
              Saltar
            </button>
          )}

          {!isLast ? (
            <button
              onClick={() => setCurrentStepIndex((prev) => prev + 1)}
              className="flex-1 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-xs transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>¡Entendido! Empezar a usar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
