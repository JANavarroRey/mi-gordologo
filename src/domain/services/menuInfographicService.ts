import type { Meal, MealItem, WeekMenu } from '../models/types';

type InfographicInput = {
  week: WeekMenu;
  profileName: string;
  servings: number;
  kcal?: number;
};

const W = 1400;
const MARGIN = 40;
const CARD_GAP = 18;
const COL_GAP = 16;
const HEADER_H = 168;
const FOOTER_H = 88;

function scaleQuantity(qty: string | null, servings: number): string {
  if (!qty) return '';
  if (servings === 1) return qty;
  return qty.replace(/(\d+(?:[.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(',', '.'));
    if (Number.isNaN(num)) return match;
    const multiplied = num * servings;
    return Number.isInteger(multiplied)
      ? multiplied.toString()
      : multiplied.toFixed(1).replace('.', ',');
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

type ColBlock = {
  title: string[];
  items: { nameLines: string[]; qty: string }[];
};

function mealLines(
  ctx: CanvasRenderingContext2D,
  meal: Meal | undefined,
  colW: number,
  servings: number,
  withTitle: boolean
): ColBlock {
  if (!meal) return { title: [], items: [] };
  ctx.font = '700 18px system-ui, Segoe UI, sans-serif';
  const title = withTitle && meal.recipeName ? wrapText(ctx, meal.recipeName, colW - 8) : [];
  ctx.font = '500 16px system-ui, Segoe UI, sans-serif';
  const items = (meal.items || []).map((item: MealItem) => {
    const qty = scaleQuantity(item.quantity, servings);
    const nameLines = wrapText(ctx, `• ${item.name}`, colW - 8);
    return { nameLines: nameLines.length ? nameLines : ['•'], qty };
  });
  return { title, items };
}

function columnHeight(block: ColBlock): number {
  const titleH = block.title.length * 24;
  const itemsH = block.items.reduce((sum, it) => sum + it.nameLines.length * 21 + (it.qty ? 18 : 0), 0);
  return 28 + titleH + (titleH ? 8 : 0) + itemsH;
}

/**
 * Infografía PNG del menú semanal: misma información que la vista tabla
 * (día, desayuno con cantidades, comida y cena con nombre + ingredientes).
 */
export async function buildWeekMenuInfographic(input: InfographicInput): Promise<Blob> {
  const { week, profileName, servings, kcal = 1500 } = input;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas no disponible');

  const innerW = W - MARGIN * 2;
  const dayColW = 118;
  const mealsW = innerW - dayColW - 20;
  const colW = (mealsW - COL_GAP * 2) / 3;

  type DayLayout = {
    height: number;
    breakfast: ColBlock;
    lunch: ColBlock;
    dinner: ColBlock;
  };

  const layouts: DayLayout[] = week.days.map((d) => {
    if (d.isFreeDay) {
      return {
        height: 92,
        breakfast: { title: [], items: [] },
        lunch: { title: [], items: [] },
        dinner: { title: [], items: [] },
      };
    }
    const breakfast = mealLines(probe, d.meals.breakfast, colW, servings, false);
    const lunch = mealLines(probe, d.meals.lunch, colW, servings, true);
    const dinner = mealLines(probe, d.meals.dinner, colW, servings, true);
    const contentH = Math.max(
      columnHeight(breakfast),
      columnHeight(lunch),
      columnHeight(dinner),
      72
    );
    return { height: contentH + 28, breakfast, lunch, dinner };
  });

  const bodyH = layouts.reduce((sum, l) => sum + l.height + CARD_GAP, 0);
  const H = HEADER_H + 52 + bodyH + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  ctx.fillStyle = '#f4f7f5';
  ctx.fillRect(0, 0, W, H);

  const headerGrad = ctx.createLinearGradient(0, 0, W, HEADER_H);
  headerGrad.addColorStop(0, '#065f46');
  headerGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(W - 80, 20, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, HEADER_H + 10, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px system-ui, Segoe UI, sans-serif';
  ctx.fillText('Menú de la semana', W / 2, 64);
  ctx.font = '600 24px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(236,253,245,0.95)';
  ctx.fillText(`Semana ${week.weekNumber}  ·  Mi Gordólogo`, W / 2, 102);
  ctx.font = '500 20px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText(
    `${profileName}  ·  ${servings === 1 ? '1 ración' : '2 raciones'}  ·  ${kcal} kcal`,
    W / 2,
    136
  );

  let y = HEADER_H + 22;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, MARGIN, y, innerW, 36, 12);
  ctx.fill();
  ctx.fillStyle = '#115e59';
  ctx.font = '800 15px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DÍA', MARGIN + 22, y + 24);
  const mealsX = MARGIN + dayColW + 20;
  ctx.textAlign = 'center';
  ctx.fillText('DESAYUNO', mealsX + colW / 2, y + 24);
  ctx.fillText('COMIDA', mealsX + colW + COL_GAP + colW / 2, y + 24);
  ctx.fillText('CENA', mealsX + (colW + COL_GAP) * 2 + colW / 2, y + 24);

  y += 48;

  week.days.forEach((d, idx) => {
    const layout = layouts[idx];
    const cardH = layout.height;

    if (d.isFreeDay) {
      ctx.fillStyle = '#fffbeb';
      roundRect(ctx, MARGIN, y, innerW, cardH, 18);
      ctx.fill();
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 2;
      roundRect(ctx, MARGIN, y, innerW, cardH, 18);
      ctx.stroke();

      ctx.fillStyle = '#92400e';
      ctx.font = '800 22px system-ui, Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(d.dayLabel, MARGIN + 22, y + 38);
      ctx.font = '600 20px system-ui, Segoe UI, sans-serif';
      ctx.fillText('🎉  Día libre — sin menú pautado', MARGIN + dayColW + 8, y + 38);
      y += cardH + CARD_GAP;
      return;
    }

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, MARGIN, y, innerW, cardH, 18);
    ctx.fill();
    ctx.strokeStyle = idx % 2 === 0 ? '#d1fae5' : '#e2e8f0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, MARGIN, y, innerW, cardH, 18);
    ctx.stroke();

    ctx.fillStyle = '#047857';
    roundRect(ctx, MARGIN + 12, y + 14, dayColW - 8, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 18px system-ui, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.dayLabel, MARGIN + 12 + (dayColW - 8) / 2, y + 42);

    const drawCol = (colX: number, data: ColBlock) => {
      let ty = y + 28;
      ctx.textAlign = 'left';
      if (data.title.length) {
        ctx.fillStyle = '#064e3b';
        ctx.font = '700 18px system-ui, Segoe UI, sans-serif';
        data.title.forEach((line) => {
          ctx.fillText(line, colX, ty);
          ty += 24;
        });
        ty += 6;
      }
      data.items.forEach((it) => {
        ctx.fillStyle = '#334155';
        ctx.font = '500 16px system-ui, Segoe UI, sans-serif';
        it.nameLines.forEach((line) => {
          ctx.fillText(line, colX, ty);
          ty += 21;
        });
        if (it.qty) {
          ctx.fillStyle = '#047857';
          ctx.font = '700 15px system-ui, Segoe UI, sans-serif';
          ctx.fillText(it.qty, colX + 14, ty);
          ty += 18;
        }
      });
    };

    drawCol(mealsX, layout.breakfast);
    drawCol(mealsX + colW + COL_GAP, layout.lunch);
    drawCol(mealsX + (colW + COL_GAP) * 2, layout.dinner);

    y += cardH + CARD_GAP;
  });

  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H);
  ctx.fillStyle = '#047857';
  ctx.font = '800 22px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mi Gordólogo  ·  Adelgaza sin comer', W / 2, H - 48);
  ctx.fillStyle = '#64748b';
  ctx.font = '500 16px system-ui, Segoe UI, sans-serif';
  ctx.fillText('Desayuno, comida y cena con cantidades · Pauta hospitalaria 1.500 kcal', W / 2, H - 22);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/png',
      0.95
    );
  });
}

export async function shareWeekMenuInfographic(input: InfographicInput): Promise<'shared' | 'downloaded'> {
  const blob = await buildWeekMenuInfographic(input);
  const fileName = `menu-semana-${input.week.weekNumber}-gordologo.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({
        title: `Menú semana ${input.week.weekNumber}`,
        text: 'Menú semanal · Mi Gordólogo',
        files: [file],
      });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
