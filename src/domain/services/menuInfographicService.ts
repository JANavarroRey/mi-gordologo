import type { Meal, MealItem, WeekMenu } from '../models/types';

type InfographicInput = {
  week: WeekMenu;
  profileName: string;
  servings: number;
  kcal?: number;
};

/** WhatsApp reescala cualquier lado > 1600 px y deja el texto ilegible. */
const PAGE_W = 1600;
const PAGE_H = 1600;
const MARGIN = 28;
const COL_GAP = 12;
const DAY_W = 86;
const HEADER_H = 78;
const COL_HEAD_H = 34;
const FOOTER_H = 42;
const LINE = 20;

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

function splitLongWord(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const parts: string[] = [];
  let buf = '';
  for (const ch of word) {
    if (buf && ctx.measureText(buf + ch).width > maxWidth) {
      parts.push(buf);
      buf = ch;
    } else {
      buf += ch;
    }
  }
  if (buf) parts.push(buf);
  return parts.length ? parts : [word];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const safeW = Math.max(24, maxWidth);
  const words = text.split(/\s+/).flatMap((w) => splitLongWord(ctx, w, safeW));
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > safeW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
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

type ColBlock = { lines: string[]; titleCount: number };

function mealBlock(
  ctx: CanvasRenderingContext2D,
  meal: Meal | undefined,
  colW: number,
  servings: number,
  withTitle: boolean
): ColBlock {
  if (!meal) return { lines: [], titleCount: 0 };
  const lines: string[] = [];
  ctx.font = '700 16px system-ui, Segoe UI, sans-serif';
  if (withTitle && meal.recipeName) {
    lines.push(...wrapText(ctx, meal.recipeName, colW));
  }
  const titleCount = lines.length;
  ctx.font = '500 15px system-ui, Segoe UI, sans-serif';
  (meal.items || []).forEach((item: MealItem) => {
    const qty = scaleQuantity(item.quantity, servings);
    const text = qty ? `• ${item.name} (${qty})` : `• ${item.name}`;
    lines.push(...wrapText(ctx, text, colW));
  });
  return { lines, titleCount };
}

function drawClippedLines(
  ctx: CanvasRenderingContext2D,
  block: ColBlock,
  x: number,
  y: number,
  w: number,
  maxY: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - 2, w, Math.max(0, maxY - y + 2));
  ctx.clip();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let ty = y;
  block.lines.forEach((line, i) => {
    if (ty + LINE > maxY) return;
    const isTitle = i < block.titleCount;
    ctx.font = isTitle
      ? '700 16px system-ui, Segoe UI, sans-serif'
      : '500 15px system-ui, Segoe UI, sans-serif';
    ctx.fillStyle = isTitle ? '#064e3b' : '#1e293b';
    ctx.fillText(line, x, ty, w);
    ty += LINE;
  });
  ctx.restore();
}

function drawPageChrome(
  ctx: CanvasRenderingContext2D,
  input: InfographicInput,
  pageIndex: number,
  pageCount: number,
  innerW: number,
  colW: number,
  mealsX: number
): void {
  const { week, profileName, servings, kcal = 1500 } = input;
  ctx.fillStyle = '#f4f7f5';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const headerGrad = ctx.createLinearGradient(0, 0, PAGE_W, HEADER_H);
  headerGrad.addColorStop(0, '#065f46');
  headerGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, PAGE_W, HEADER_H);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px system-ui, Segoe UI, sans-serif';
  ctx.fillText('Menú de la semana', PAGE_W / 2, 36);
  ctx.font = '600 18px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(236,253,245,0.95)';
  const pageHint = pageCount > 1 ? `  ·  ${pageIndex + 1}/${pageCount}` : '';
  ctx.fillText(
    `Semana ${week.weekNumber} · ${profileName} · ${servings === 1 ? '1 ración' : '2 raciones'} · ${kcal} kcal${pageHint}`,
    PAGE_W / 2,
    62
  );

  const headY = HEADER_H + 8;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, MARGIN, headY, innerW, COL_HEAD_H, 10);
  ctx.fill();
  ctx.fillStyle = '#115e59';
  ctx.font = '800 14px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DÍA', MARGIN + DAY_W / 2, headY + COL_HEAD_H / 2);
  ctx.fillText('DESAYUNO', mealsX + colW / 2, headY + COL_HEAD_H / 2);
  ctx.fillText('COMIDA', mealsX + colW + COL_GAP + colW / 2, headY + COL_HEAD_H / 2);
  ctx.fillText('CENA', mealsX + (colW + COL_GAP) * 2 + colW / 2, headY + COL_HEAD_H / 2);

  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H);
  ctx.fillStyle = '#047857';
  ctx.font = '700 16px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mi Gordólogo · Pauta 1.500 kcal · texto nítido para WhatsApp', PAGE_W / 2, PAGE_H - FOOTER_H / 2);
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * JPEG 1600×1600 (límite de WhatsApp) con la misma info que la tabla.
 * Si no cabe, se parte en varias páginas para no perder nitidez.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const { week, servings } = input;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('Canvas no disponible');

  const innerW = PAGE_W - MARGIN * 2;
  const mealsW = innerW - DAY_W - 12;
  const colW = (mealsW - COL_GAP * 2) / 3;
  const mealsX = MARGIN + DAY_W + 12;
  const bodyTop = HEADER_H + 8 + COL_HEAD_H + 10;
  const bodyBottom = PAGE_H - FOOTER_H - 12;
  const usable = bodyBottom - bodyTop;

  type DayPack = {
    dayLabel: string;
    short: string;
    isFreeDay: boolean;
    breakfast: ColBlock;
    lunch: ColBlock;
    dinner: ColBlock;
    height: number;
  };

  const packs: DayPack[] = week.days.map((d, idx) => {
    const short = DAY_SHORT[d.dayOfWeek] ?? DAY_SHORT[idx] ?? d.dayLabel.slice(0, 3);
    if (d.isFreeDay) {
      return {
        dayLabel: d.dayLabel,
        short,
        isFreeDay: true,
        breakfast: { lines: [], titleCount: 0 },
        lunch: { lines: [], titleCount: 0 },
        dinner: { lines: [], titleCount: 0 },
        height: 56,
      };
    }
    const breakfast = mealBlock(probe, d.meals.breakfast, colW - 10, servings, false);
    const lunch = mealBlock(probe, d.meals.lunch, colW - 10, servings, true);
    const dinner = mealBlock(probe, d.meals.dinner, colW - 10, servings, true);
    const contentH = Math.max(breakfast.lines.length, lunch.lines.length, dinner.lines.length, 2) * LINE;
    return {
      dayLabel: d.dayLabel,
      short,
      isFreeDay: false,
      breakfast,
      lunch,
      dinner,
      height: Math.min(contentH + 16, usable),
    };
  });

  const pages: DayPack[][] = [];
  let current: DayPack[] = [];
  let used = 0;
  const gap = 8;
  for (const pack of packs) {
    const need = pack.height + gap;
    if (current.length && used + need > usable) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(pack);
    used += need;
  }
  if (current.length) pages.push(current);

  const blobs: Blob[] = [];
  for (let p = 0; p < pages.length; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    drawPageChrome(ctx, input, p, pages.length, innerW, colW, mealsX);

    let y = bodyTop;
    pages[p].forEach((pack, idx) => {
      const cardH = pack.height;
      if (pack.isFreeDay) {
        ctx.fillStyle = '#fffbeb';
        roundRect(ctx, MARGIN, y, innerW, cardH, 12);
        ctx.fill();
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 1.5;
        roundRect(ctx, MARGIN, y, innerW, cardH, 12);
        ctx.stroke();
        ctx.fillStyle = '#92400e';
        ctx.font = '700 18px system-ui, Segoe UI, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pack.short}  ·  Día libre — sin menú pautado`, MARGIN + 16, y + cardH / 2, innerW - 32);
        y += cardH + gap;
        return;
      }

      ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      roundRect(ctx, MARGIN, y, innerW, cardH, 12);
      ctx.fill();
      ctx.strokeStyle = '#d1fae5';
      ctx.lineWidth = 1;
      roundRect(ctx, MARGIN, y, innerW, cardH, 12);
      ctx.stroke();

      ctx.fillStyle = '#047857';
      roundRect(ctx, MARGIN + 8, y + 8, DAY_W - 10, Math.min(36, cardH - 16), 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px system-ui, Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pack.short, MARGIN + 8 + (DAY_W - 10) / 2, y + 8 + Math.min(36, cardH - 16) / 2, DAY_W - 14);

      const textY = y + 8;
      const maxY = y + cardH - 6;
      const textW = colW - 10;
      drawClippedLines(ctx, pack.breakfast, mealsX, textY, textW, maxY);
      drawClippedLines(ctx, pack.lunch, mealsX + colW + COL_GAP, textY, textW, maxY);
      drawClippedLines(ctx, pack.dinner, mealsX + (colW + COL_GAP) * 2, textY, textW, maxY);

      y += cardH + gap;
    });

    blobs.push(await canvasToJpeg(canvas));
  }

  return blobs;
}

export async function shareWeekMenuInfographic(input: InfographicInput): Promise<'shared' | 'downloaded'> {
  const blobs = await buildWeekMenuInfographicPages(input);
  const files = blobs.map(
    (blob, i) =>
      new File([blob], `menu-semana-${input.week.weekNumber}${blobs.length > 1 ? `-${i + 1}` : ''}.jpg`, {
        type: 'image/jpeg',
      })
  );

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  const shareData: ShareData = {
    title: `Menú semana ${input.week.weekNumber}`,
    text: 'Menú semanal · Mi Gordólogo',
    files,
  };

  if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
    try {
      await nav.share(shareData);
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'shared';
    }
  }

  for (const file of files) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return 'downloaded';
}
