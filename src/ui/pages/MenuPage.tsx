import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, Share2, Printer, Check, X, RefreshCw, Calendar, Table, ChevronRight, Mail } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { geminiService } from '@/domain/services/geminiService';
import { MEAL_LABELS } from '@/domain/models/types';
import type { MealType, WeekMenu, DayMenu } from '@/domain/models/types';
import { HospitalGuidelinesCard } from '@/ui/components/guidelines/HospitalGuidelinesCard';
import { assetUrl } from '@/shared/assets';

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  midMorning: '☀️',
  lunch: '🍽️',
  snack: '🍵',
  dinner: '🌙',
  recena: '🛏️',
};

const DAY_ABBR = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Opciones de cambio rápido por momento del día (100% contextuales)
const CONTEXTUAL_AI_OPTIONS: Record<MealType, { label: string; prompt: string }[]> = {
  breakfast: [
    { label: '🥣 Yogur con fruta y tostada', prompt: 'Cambiar por yogur desnatado con fruta y tostada integral' },
    { label: '🧀 Queso fresco con tostada', prompt: 'Cambiar por queso fresco de Burgos desnatado con tostada' },
    { label: '☕ Café con leche y tostada con aceite', prompt: 'Cambiar por leche desnatada con café y tostada con aceite de oliva' },
    { label: '🍎 Fruta fresca variada', prompt: 'Cambiar por ración de fruta fresca variada con infusión' },
  ],
  midMorning: [
    { label: '🍎 Fruta de temporada', prompt: 'Cambiar por fruta fresca de temporada' },
    { label: '🥣 Yogur desnatado', prompt: 'Cambiar por yogur desnatado sin azúcar' },
    { label: '🥜 Infusión con nueces', prompt: 'Cambiar por infusión con 2 nueces naturales' },
    { label: '🥛 Vaso de leche desnatada', prompt: 'Cambiar por vaso de leche desnatada' },
  ],
  snack: [
    { label: '🍎 Fruta fresca', prompt: 'Cambiar por fruta fresca de temporada' },
    { label: '🥣 Yogur natural 0%', prompt: 'Cambiar por yogur desnatado o kéfir' },
    { label: '🥜 Infusión con nueces', prompt: 'Cambiar por infusión con 2 nueces' },
    { label: '🍉 Fruta rica en agua (melón/sandía)', prompt: 'Cambiar por 300g de melón o sandía' },
  ],
  lunch: [
    { label: '🍗 Pollo a la plancha', prompt: 'Cambiar por pechuga de pollo a la plancha con verduras' },
    { label: '🐟 Pescado blanco al vapor', prompt: 'Cambiar por merluza o dorada al vapor con patatas' },
    { label: '🥗 Ensalada Murciana', prompt: 'Cambiar por ensalada murciana tradicional' },
    { label: '🍳 Tortilla con ensalada', prompt: 'Cambiar por tortilla francesa con ensalada variada' },
    { label: '🍲 Lentejas estofadas', prompt: 'Cambiar por lentejas caseras estofadas' },
    { label: '🥦 Hervido con pescado', prompt: 'Cambiar por hervido de verduras con pescado blanco' },
  ],
  dinner: [
    { label: '🐟 Pescado blanco plancha', prompt: 'Cambiar por pescado blanco a la plancha con ensalada' },
    { label: '🥦 Crema de calabacín', prompt: 'Cambiar por crema suave de calabacín con pescado' },
    { label: '🍳 Tortilla con ensalada', prompt: 'Cambiar por tortilla francesa con ensalada' },
    { label: '🍗 Conejo o pavo al horno', prompt: 'Cambiar por pechuga de pavo o conejo al horno' },
    { label: '🥗 Ensalada templada', prompt: 'Cambiar por ensalada templada ligera' },
    { label: '🍲 Sopa de pescado ligera', prompt: 'Cambiar por sopa de caldo desgrasado con pescado' },
  ],
  recena: [
    { label: '🥣 Yogur desnatado', prompt: 'Cambiar por yogur desnatado sin azúcar' },
    { label: '🥛 ½ vaso leche desnatada tibia', prompt: 'Cambiar por medio vaso de leche tibia' },
    { label: '🍵 Infusión relajante', prompt: 'Cambiar por manzanilla o infusión sin azúcar' },
  ],
};

export const MenuPage: React.FC = () => {
  const [weeks, setWeeks] = useState<WeekMenu[]>([]);

  // Control temporal: abrir por defecto en el día de la semana y semana del plan actuales
  const todayDayIndex = storageService.getCurrentDayIndex();
  const currentWeekIndex = storageService.getCurrentWeekIndex();

  const [activeWeekIndex, setActiveWeekIndex] = useState(() => storageService.getCurrentWeekIndex());
  const [activeDayIndex, setActiveDayIndex] = useState(() => storageService.getCurrentDayIndex());
  const [servings, setServings] = useState(storageService.getServings());
  const [viewMode, setViewMode] = useState<'daily' | 'table'>('daily');

  // Modal de IA / Edición
  const [editingMealType, setEditingMealType] = useState<MealType | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleSync = () => {
      setWeeks(storageService.getMenus());
      setServings(storageService.getServings());
    };
    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, []);

  if (weeks.length === 0) {
    return <div className="text-center py-12 text-neutral-500">Cargando menús...</div>;
  }

  const activeWeek = weeks[activeWeekIndex] || weeks[0];
  const activeDay = activeWeek.days[activeDayIndex] || activeWeek.days[0];
  const activeProfile = storageService.getActiveProfile();
  const isViewingToday = activeWeekIndex === currentWeekIndex && activeDayIndex === todayDayIndex;

  // Multiplicador numérico real de cantidades según raciones
  const formatQuantity = (qty: string | null): string => {
    if (!qty) return '';
    if (servings === 1) return qty;

    // Duplicar numéricamente todas las cantidades detectadas
    return qty.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
      const num = parseFloat(match.replace(',', '.'));
      if (isNaN(num)) return match;
      const multiplied = num * servings;
      return Number.isInteger(multiplied)
        ? multiplied.toString()
        : multiplied.toFixed(1).replace('.', ',');
    });
  };

  const handleOpenAiModal = (type: MealType) => {
    setEditingMealType(type);
    setAiPrompt('');
    setAiFeedback(null);
  };

  const handleApplyAiAdjustment = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || aiPrompt).trim();
    if (!editingMealType || !promptToUse) return;
    setIsAiLoading(true);
    setAiFeedback(null);

    const currentMeal = activeDay.meals[editingMealType];
    const res = await geminiService.requestMealAdjustment(editingMealType, currentMeal, promptToUse);

    if (res.updatedMeal) {
      const updatedDay: DayMenu = {
        ...activeDay,
        meals: {
          ...activeDay.meals,
          [editingMealType]: res.updatedMeal,
        },
      };

      storageService.updateDayMenu(activeWeekIndex, activeDayIndex, updatedDay);
      const updatedWeeks = [...weeks];
      const daysCopy = [...updatedWeeks[activeWeekIndex].days];
      daysCopy[activeDayIndex] = updatedDay;
      updatedWeeks[activeWeekIndex] = { ...updatedWeeks[activeWeekIndex], days: daysCopy };
      setWeeks(updatedWeeks);

      setAiFeedback(res.message);
      // Auto-cierre con transición para ver el plato actualizado de inmediato
      setTimeout(() => {
        setEditingMealType(null);
        setAiFeedback(null);
        setAiPrompt('');
      }, 750);
    } else {
      setAiFeedback(res.message || 'Ajuste completado.');
    }

    setIsAiLoading(false);
  };

  const handlePrint = () => {
    setViewMode('table');
    // Pequeña espera para montar la tabla y forzar orientación horizontal en el diálogo
    window.setTimeout(() => {
      document.body.classList.add('printing-menu');
      window.print();
      window.setTimeout(() => document.body.classList.remove('printing-menu'), 500);
    }, 200);
  };

  const buildDayShareText = () => {
    let text = `🍽️ MENÚ DEL DÍA — ${activeDay.dayLabel.toUpperCase()}\n`;
    text += `👤 ${activeProfile.name} (${servings} ${servings === 1 ? 'ración' : 'raciones'})\n\n`;
    if (activeDay.isFreeDay) {
      text += `🎉 ¡DÍA LIBRE! Hoy toca disfrutar sin contar calorías.\n`;
    } else {
      (Object.keys(MEAL_LABELS) as MealType[]).forEach((type) => {
        const m = activeDay.meals[type];
        if (m && m.items.length > 0) {
          text += `${MEAL_EMOJIS[type]} ${MEAL_LABELS[type]}: `;
          text += m.items.map((i) => `${i.name}${i.quantity ? ` (${formatQuantity(i.quantity)})` : ''}`).join(', ');
          text += '\n\n';
        }
      });
    }
    text += `💧 Recuerda beber al menos 1,5L de agua.\nMi Gordólogo · Adelgaza sin comer`;
    return text;
  };

  const handleShareDayEmail = () => {
    const subject = encodeURIComponent(`Menú ${activeDay.dayLabel} — Mi Gordólogo`);
    const body = encodeURIComponent(buildDayShareText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareDayWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildDayShareText())}`, '_blank');
  };

  const handleShareWeekWhatsApp = () => {
    let text = `📋 MENÚ SEMANAL COMPLETO — SEMANA ${activeWeek.weekNumber}\n`;
    text += `👤 ${activeProfile.name} (${servings} ${servings === 1 ? 'ración' : 'raciones'})\n\n`;
    activeWeek.days.forEach((d) => {
      text += `━━━━━━━━━━━━━━━\n`;
      text += `📅 ${d.dayLabel.toUpperCase()} ${d.isFreeDay ? '🎉 (LIBRE)' : ''}\n`;
      if (d.isFreeDay) {
        text += `¡Comida y cena libres!\n\n`;
      } else {
        const lunch = d.meals.lunch;
        const dinner = d.meals.dinner;
        text += `🍲 Comida: ${lunch.recipeName || lunch.items.map((i) => i.name).join(', ')}\n`;
        text += `🌙 Cena: ${dinner.recipeName || dinner.items.map((i) => i.name).join(', ')}\n\n`;
      }
    });
    text += `Mi Gordólogo · Adelgaza sin comer`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-3.5">
      {/* Selector de Raciones */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-neutral-200/80 shadow-xs print:hidden">
        <span className="text-xs font-semibold text-neutral-600">Cantidades para:</span>
        <div className="flex bg-neutral-100 p-0.5 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setServings(1);
              storageService.setServings(1);
              window.dispatchEvent(new Event('storage'));
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              servings === 1
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            👤 1 Ración
          </button>
          <button
            type="button"
            onClick={() => {
              setServings(2);
              storageService.setServings(2);
              window.dispatchEvent(new Event('storage'));
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              servings === 2
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            👥 2 Raciones
          </button>
        </div>
      </div>

      {/* Selector de Semanas y Conmutador de Vista */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-neutral-200/80 space-y-2.5 print:hidden">
        <div className="flex items-center justify-between">
          {/* Selector de 8 semanas con scroll horizontal fluido */}
          <div className="flex space-x-1 flex-1 mr-2 overflow-x-auto py-0.5 scrollbar-none">
            {weeks.map((week, idx) => {
              const isCurrentCycleWeek = idx === currentWeekIndex;
              return (
                <button
                  key={`week-${week.weekNumber}`}
                  onClick={() => setActiveWeekIndex(idx)}
                  className={`py-1.5 px-2.5 text-center rounded-xl font-bold text-xs transition-all shrink-0 flex items-center space-x-1 ${
                    activeWeekIndex === idx
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span>Sem {week.weekNumber}</span>
                  {isCurrentCycleWeek && (
                    <span className={`w-1.5 h-1.5 rounded-full ${activeWeekIndex === idx ? 'bg-emerald-200' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Toggle Vista Diaria vs Tabla Semanal */}
          <div className="flex bg-neutral-100 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('daily')}
              title="Ver día a día"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'daily' ? 'bg-white text-emerald-800 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Ver tabla semanal completa"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-white text-emerald-800 shadow-xs' : 'text-neutral-500'
              }`}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selector de Días (solo en vista diaria) */}
        {viewMode === 'daily' && (
          <div className="grid grid-cols-7 gap-1 pt-1.5 border-t border-neutral-100">
            {activeWeek.days.map((day, idx) => {
              const isSelected = activeDayIndex === idx;
              const isToday = idx === todayDayIndex && activeWeekIndex === currentWeekIndex;

              return (
                <button
                  key={`day-${idx}`}
                  onClick={() => setActiveDayIndex(idx)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-xs ring-2 ring-emerald-300'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className="text-xs">{DAY_ABBR[idx]}</span>
                  {isToday ? (
                    <span className={`text-[9px] font-extrabold uppercase tracking-tight ${isSelected ? 'text-emerald-100' : 'text-emerald-700'}`}>
                      Hoy
                    </span>
                  ) : day.isFreeDay ? (
                    <span className="text-[10px] mt-0.5">🎉</span>
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-emerald-300 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: DÍA A DÍA (DETALLE DE LAS 5 COMIDAS) */}
      {/* ======================================================== */}
      {viewMode === 'daily' && (
        <div className="space-y-3.5 print:hidden">
          {/* Título del Día y Acciones */}
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold font-display text-neutral-900 flex items-center">
                  {activeDay.dayLabel}
                  {activeDay.isFreeDay && <span className="ml-2 text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">🎉 Día Libre</span>}
                </h2>
                {!isViewingToday && (
                  <button
                    onClick={() => {
                      setActiveWeekIndex(currentWeekIndex);
                      setActiveDayIndex(todayDayIndex);
                    }}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    Ir a Hoy
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                Semana {activeWeek.weekNumber} · Menú 1.500 kcal
              </p>
            </div>

            <div className="flex space-x-1.5">
              <button
                onClick={handleShareDayWhatsApp}
                title="Compartir día por WhatsApp"
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleShareDayEmail}
                title="Enviar por email"
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center justify-center"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                title="Imprimir / PDF"
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors flex items-center justify-center"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner Día Libre si aplica */}
          {activeDay.isFreeDay && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/80 shadow-xs text-center space-y-2">
              <span className="text-4xl block">🥳</span>
              <h3 className="font-bold text-amber-900 text-base">¡Día libre de la dieta!</h3>
              <p className="text-sm text-amber-800 leading-relaxed max-w-sm mx-auto">
                Hoy no hay menú hospitalario. Disfruta con la familia sin contar calorías.
                Mañana retomamos el menú de 1.500 kcal.
              </p>
              <p className="text-[11px] text-amber-700/80 italic">
                Decisión personal (no forma parte del protocolo clínico).
              </p>
            </div>
          )}

          {/* Cards de comidas — ocultas en día libre */}
          {!activeDay.isFreeDay && (
          <div className="space-y-3">
            <HospitalGuidelinesCard />
            {(Object.keys(MEAL_LABELS) as MealType[]).map((mealType) => {
              const meal = activeDay.meals[mealType];
              if (!meal) return null;

              return (
                <div
                  key={mealType}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-neutral-200/80 hover:border-neutral-300 transition-all"
                >
                  {/* Cabecera de la comida */}
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{MEAL_EMOJIS[mealType]}</span>
                      <div>
                        <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                          {MEAL_LABELS[mealType]}
                        </h3>
                        {meal.recipeName && (
                          <p className="text-xs font-semibold text-emerald-800">{meal.recipeName}</p>
                        )}
                      </div>
                    </div>

                    {/* Botón Ajustar estandarizado */}
                    <button
                      onClick={() => handleOpenAiModal(mealType)}
                      className="h-7 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200/60 flex items-center space-x-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      <span>Ajustar</span>
                    </button>
                  </div>

                  {/* Lista limpia con bullet points y cantidades reales */}
                  <ul className="space-y-1.5 py-1">
                    {meal.items.map((item, idx) => (
                      <li key={idx} className="flex items-baseline justify-between text-xs sm:text-sm py-1 border-b border-neutral-100/60 last:border-none">
                        <div className="flex items-start space-x-2 pr-2">
                          <span className="text-emerald-600 font-bold select-none">•</span>
                          <span className="text-neutral-800 font-medium leading-snug">{item.name}</span>
                        </div>
                        {item.quantity && (
                          <span className="shrink-0 font-semibold text-emerald-800 text-xs px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/50">
                            {formatQuantity(item.quantity)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Enlace directo a Cookidoo sin copy redundante */}
                  {(meal.recipeUrl || meal.recipeName) && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-100 flex justify-end">
                      <a
                        href={
                          meal.recipeUrl && !meal.recipeUrl.includes('/recipes/recipe/es-ES/r')
                            ? meal.recipeUrl
                            : `https://cookidoo.es/search/es-ES?query=${encodeURIComponent(meal.recipeName || meal.items[0]?.name || '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200/60 transition-colors"
                      >
                        <span>Ver en Cookidoo</span>
                        <ExternalLink className="w-3 h-3 ml-1 text-emerald-600" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: TABLA MATRIZ SEMANAL COMPLETA (DE UN VISTAZO) */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="space-y-3 animate-in fade-in print-menu-root">
          {/* Barra compacta (solo pantalla) */}
          <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between print:hidden">
            <div className="flex items-center space-x-2 min-w-0">
              <img src={assetUrl('logo.jpg')} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-neutral-900 font-display truncate">
                  Semana {activeWeek.weekNumber}
                </h2>
                <p className="text-[10px] text-neutral-500 truncate">
                  {activeProfile.name} · {servings === 1 ? '1 ración' : '2 raciones'}
                </p>
              </div>
            </div>
            <div className="flex space-x-1.5 shrink-0">
              <button
                onClick={handleShareWeekWhatsApp}
                title="Compartir semana por WhatsApp"
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center space-x-1 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={handlePrint}
                title="Imprimir / PDF horizontal"
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800 text-white hover:bg-neutral-900 text-xs font-bold flex items-center space-x-1 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:m-0 print:rounded-none">
            {/* Cabecera mínima solo impresión */}
            <div className="hidden print:flex items-center justify-between border-b border-neutral-800 pb-1 mb-1 text-[10px] text-neutral-900">
              <div className="font-extrabold">
                Mi Gordólogo — Semana {activeWeek.weekNumber}
              </div>
              <div className="text-neutral-600">
                {activeProfile.name} · {servings === 1 ? '1 ración' : '2 raciones'}
              </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse print:text-[8pt] print:leading-snug">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-950 font-bold border-b border-neutral-200 text-[11px] print:bg-neutral-100 print:text-[8pt]">
                    <th className="p-2 print:p-0.5 border-r border-neutral-200 w-16 print:w-14">Día</th>
                    <th className="p-2 print:p-0.5 border-r border-neutral-200">Desayuno</th>
                    <th className="p-2 print:p-0.5 border-r border-neutral-200">Comida</th>
                    <th className="p-2 print:p-0.5">Cena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-neutral-800">
                  {activeWeek.days.map((day, idx) => {
                    if (day.isFreeDay) {
                      return (
                        <tr key={idx} className="bg-amber-50/80">
                          <td className="p-2 print:p-0.5 font-bold border-r border-neutral-200 align-top text-amber-950">
                            {day.dayLabel}
                            <span className="block text-[10px] print:text-[7pt]">🎉 Libre</span>
                          </td>
                          <td colSpan={3} className="p-2 print:p-0.5 text-amber-900 align-middle text-[11px] print:text-[8pt]">
                            Día libre — sin menú pautado
                          </td>
                        </tr>
                      );
                    }

                    const lunch = day.meals.lunch;
                    const dinner = day.meals.dinner;
                    const breakfast = day.meals.breakfast;
                    const breakfastShort = breakfast.items
                      .slice(0, 2)
                      .map((i) => i.name)
                      .join(' · ');

                    return (
                      <tr key={idx} className={`print:break-inside-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}`}>
                        <td className="p-2 print:p-0.5 font-extrabold text-neutral-900 border-r border-neutral-200 align-top text-xs print:text-[8pt]">
                          {day.dayLabel}
                          <button
                            onClick={() => {
                              setActiveDayIndex(idx);
                              setViewMode('daily');
                            }}
                            className="mt-0.5 text-[10px] text-emerald-700 hover:underline font-bold print:hidden block"
                          >
                            Detalle →
                          </button>
                        </td>

                        <td className="p-2 print:p-0.5 border-r border-neutral-200 align-top text-[11px] print:text-[7.5pt] text-neutral-700">
                          <span className="print:hidden space-y-0.5 block">
                            {breakfast.items.map((i, iIdx) => (
                              <div key={iIdx}>
                                • {i.name}{' '}
                                {i.quantity ? (
                                  <span className="text-emerald-800 font-semibold">({formatQuantity(i.quantity)})</span>
                                ) : (
                                  ''
                                )}
                              </div>
                            ))}
                          </span>
                          <span className="hidden print:inline">{breakfastShort}</span>
                        </td>

                        <td className="p-2 print:p-0.5 border-r border-neutral-200 align-top text-[11px] print:text-[8pt]">
                          <div className="font-bold text-emerald-950 print:text-[8pt]">
                            {lunch.recipeName || 'Comida'}
                          </div>
                          <div className="space-y-0.5 text-neutral-700 print:hidden">
                            {lunch.items.map((i, iIdx) => (
                              <div key={iIdx}>
                                • {i.name}{' '}
                                {i.quantity ? (
                                  <span className="font-semibold text-emerald-800">({formatQuantity(i.quantity)})</span>
                                ) : (
                                  ''
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="p-2 print:p-0.5 align-top text-[11px] print:text-[8pt]">
                          <div className="font-bold text-emerald-950 print:text-[8pt]">
                            {dinner.recipeName || 'Cena'}
                          </div>
                          <div className="space-y-0.5 text-neutral-700 print:hidden">
                            {dinner.items.map((i, iIdx) => (
                              <div key={iIdx}>
                                • {i.name}{' '}
                                {i.quantity ? (
                                  <span className="font-semibold text-emerald-800">({formatQuantity(i.quantity)})</span>
                                ) : (
                                  ''
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Dialog de Ajuste con IA Inteligente */}
      {editingMealType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-neutral-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-neutral-900">
                  Ajustar {MEAL_LABELS[editingMealType]}
                </h3>
              </div>
              <button
                onClick={() => setEditingMealType(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-3">
              Elige un cambio directo o escribe lo que te apetezca. Adaptado a tus 1.500 kcal:
            </p>

            {/* Alternativas Clínicas Rápidas en 1 Toque */}
            <div className="mb-3 space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Cambio rápido en 1 toque:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {editingMealType && CONTEXTUAL_AI_OPTIONS[editingMealType]?.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={isAiLoading}
                    onClick={() => handleApplyAiAdjustment(item.prompt)}
                    className="text-left text-xs font-semibold p-2 rounded-xl bg-neutral-50 hover:bg-emerald-50 hover:text-emerald-900 border border-neutral-200 hover:border-emerald-300 transition-all flex items-center justify-between disabled:opacity-50"
                  >
                    <span className="truncate mr-1">{item.label}</span>
                    <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Petición libre del usuario */}
            <div className="pt-2 border-t border-neutral-100">
              <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                O escribe tu petición libre:
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ej: No me gustan las judías verdes, ponme calabacín a la plancha..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2 font-medium"
              />
            </div>

            {/* Feedback / Respuesta */}
            {aiFeedback && (
              <div className="p-2.5 mb-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs border border-emerald-200 font-medium">
                {aiFeedback}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingMealType(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handleApplyAiAdjustment()}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center space-x-1.5 shadow-xs"
              >
                {isAiLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ajustando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Aplicar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
