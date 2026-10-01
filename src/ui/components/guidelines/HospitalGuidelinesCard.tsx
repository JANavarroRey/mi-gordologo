import React, { useState } from 'react';
import { AlertTriangle, Apple, ChevronDown, ChevronUp, Ban } from 'lucide-react';

const FRUIT_GROUPS = [
  { id: 'A', grams: 300, examples: 'Melón, sandía, fresas' },
  { id: 'B', grams: 200, examples: 'Naranja, mandarina, manzana, pera, kiwi' },
  { id: 'C', grams: 160, examples: 'Plátano, uvas, mango, chirimoya' },
  { id: 'D', grams: 100, examples: 'Higos, dátiles, frutas desecadas' },
] as const;

const PROHIBITIONS = [
  'Alcohol (vino, cerveza, licores)',
  'Cerveza sin alcohol',
  'Azúcar de mesa, fructosa y miel',
  'Bollería, zumos envasados y refrescos',
  'Fritos y precocinados grasos',
] as const;

export const HospitalGuidelinesCard: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50/50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden />
          <div>
            <p className="text-xs font-bold text-neutral-900">Pautas del Hospital Morales Meseguer</p>
            <p className="text-[11px] text-neutral-500">Prohibiciones y raciones de fruta</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-amber-100">
          <div className="pt-3">
            <div className="flex items-center space-x-1.5 mb-2">
              <Ban className="w-3.5 h-3.5 text-red-600" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-800">No permitido</h4>
            </div>
            <ul className="space-y-1">
              {PROHIBITIONS.map((item) => (
                <li key={item} className="text-xs text-neutral-700 flex items-start space-x-1.5">
                  <span className="text-red-500 font-bold mt-0.5">×</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center space-x-1.5 mb-2">
              <Apple className="w-3.5 h-3.5 text-emerald-700" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Fruta — 1 ración según grupo
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FRUIT_GROUPS.map((g) => (
                <div key={g.id} className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-2">
                  <p className="text-xs font-extrabold text-emerald-900">
                    Grupo {g.id} · {g.grams} g
                  </p>
                  <p className="text-[10px] text-emerald-800 leading-snug mt-0.5">{g.examples}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
              Postre en comida y cena: 1 ración de fruta <strong>o</strong> 2 yogures desnatados sin azúcar.
              Recena: 1 yogur ó ½ vaso de leche desnatada.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
