import React, { useState, useEffect, useMemo } from 'react';
import { Check, Plus, Trash2, Share2, ShoppingBag } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { buildShoppingListFromWeek, scaleQuantity } from '@/domain/services/shoppingListService';
import type { ShoppingCategory } from '@/domain/models/types';

const CATEGORY_META: Record<ShoppingCategory, { title: string; emoji: string }> = {
  frutas: { title: 'Frutas', emoji: '🍎' },
  verduras: { title: 'Verduras y Hortalizas', emoji: '🥦' },
  pescados: { title: 'Pescados y Mariscos', emoji: '🐟' },
  carnes: { title: 'Carnes y Huevos', emoji: '🍗' },
  lacteos: { title: 'Lácteos desnatados', emoji: '🥛' },
  legumbres: { title: 'Legumbres', emoji: '🍲' },
  cereales: { title: 'Cereales y Pan', emoji: '🌾' },
  conservas: { title: 'Conservas al natural', emoji: '🥫' },
  condimentos: { title: 'Despensa y Aceite', emoji: '🫒' },
  otros: { title: 'Otros', emoji: '🛒' },
};

const WEEK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const ShoppingPage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState(() => storageService.getCurrentWeekIndex() + 1);
  const [servings, setServings] = useState(storageService.getServings());
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<{ id: string; name: string }[]>([]);
  const [newCustomText, setNewCustomText] = useState('');

  const menus = useMemo(() => storageService.getMenus(), [selectedWeek]);

  const currentPresetItems = useMemo(() => {
    const week = menus[selectedWeek - 1];
    if (!week) return [];
    return buildShoppingListFromWeek(week);
  }, [menus, selectedWeek]);

  useEffect(() => {
    setServings(storageService.getServings());
    setCheckedMap(storageService.getShoppingChecked(selectedWeek));
    setCustomItems(storageService.getCustomShoppingItems(selectedWeek));
  }, [selectedWeek]);

  const toggleCheck = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    storageService.setShoppingChecked(selectedWeek, next);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomText.trim()) return;

    const newItem = {
      id: `custom_${Date.now()}`,
      name: newCustomText.trim(),
    };
    const next = [...customItems, newItem];
    setCustomItems(next);
    storageService.saveCustomShoppingItems(selectedWeek, next as any);
    setNewCustomText('');
  };

  const handleDeleteCustom = (id: string) => {
    const next = customItems.filter((i) => i.id !== id);
    setCustomItems(next);
    storageService.saveCustomShoppingItems(selectedWeek, next as any);
  };

  const groupedCategories = (Object.keys(CATEGORY_META) as ShoppingCategory[])
    .map((cat) => ({
      category: cat,
      meta: CATEGORY_META[cat],
      items: currentPresetItems.filter((i) => i.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  const handleShareWhatsApp = () => {
    let msg = `*LISTA DE LA COMPRA — SEMANA ${selectedWeek}*\n`;
    msg += `Para: ${servings} ${servings === 1 ? 'persona' : 'personas'}\n`;
    msg += `_Generada desde el menú semanal_\n\n`;

    groupedCategories.forEach((group) => {
      msg += `*${group.meta.title.toUpperCase()}*\n`;
      group.items.forEach((item) => {
        const isDone = checkedMap[item.id];
        const bullet = isDone ? '[✓]' : '•';
        const qty = scaleQuantity(item.baseQty, servings);
        msg += `${bullet} ${item.name} (${qty})\n`;
      });
      msg += '\n';
    });

    if (customItems.length > 0) {
      msg += `*EXTRAS Y NOTAS*\n`;
      customItems.forEach((ci) => {
        const isDone = checkedMap[ci.id];
        const bullet = isDone ? '[✓]' : '•';
        msg += `${bullet} ${ci.name}\n`;
      });
      msg += '\n';
    }

    msg += `Mi Gordólogo · Adelgaza sin comer`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-bold font-display text-neutral-900 leading-tight">
                Lista de la Compra
              </h2>
              <p className="text-xs text-neutral-500">
                Desde el menú · {servings} {servings === 1 ? 'persona' : 'personas'}
              </p>
            </div>
          </div>

          <button
            onClick={handleShareWhatsApp}
            title="Enviar lista a WhatsApp"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {WEEK_NUMBERS.map((num) => (
            <button
              key={num}
              onClick={() => setSelectedWeek(num)}
              className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                selectedWeek === num
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Sem. {num}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {groupedCategories.map((group) => (
          <div
            key={group.category}
            className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200/80"
          >
            <h3 className="font-bold text-xs text-neutral-700 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5 pb-2 border-b border-neutral-100">
              <span>{group.meta.emoji}</span>
              <span>{group.meta.title}</span>
            </h3>

            <div className="space-y-2">
              {group.items.map((item) => {
                const isChecked = !!checkedMap[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`flex items-start justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isChecked ? 'bg-neutral-50/60 opacity-60' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span
                        className={`text-sm ${
                          isChecked ? 'line-through text-neutral-400 font-normal' : 'text-neutral-800 font-medium'
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>

                    <span className="text-xs text-neutral-500 font-medium ml-2 shrink-0 text-right max-w-[45%]">
                      {scaleQuantity(item.baseQty, servings)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-200">
          <h3 className="font-bold text-xs text-neutral-700 uppercase tracking-wider mb-2.5">
            Añadir algo más
          </h3>

          <form onSubmit={handleAddCustom} className="flex space-x-2 mb-3">
            <input
              type="text"
              placeholder="Ej: Café descafeinado, servilletas..."
              value={newCustomText}
              onChange={(e) => setNewCustomText(e.target.value)}
              className="flex-1 text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </form>

          {customItems.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-100">
              {customItems.map((ci) => {
                const isChecked = !!checkedMap[ci.id];
                return (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-50"
                  >
                    <div
                      onClick={() => toggleCheck(ci.id)}
                      className="flex items-center space-x-2.5 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-sm ${isChecked ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                        {ci.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteCustom(ci.id)}
                      className="p-1 text-neutral-300 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShoppingPage;
