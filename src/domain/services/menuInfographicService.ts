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

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const COLORS = {
  bgTop: '#0f766e',
  bgTop2: '#065f46',
  bgBody: '#e8f5f0',
  bgBody2: '#f0faf6',
  card: '#ffffff',
  ink: '#134e4a',
  muted: '#5b7c76',
  line: '#c7e4da',
  breakfast: '#0d9488',
  breakfastBg: '#ccfbf1',
  lunch: '#047857',
  lunchBg: '#d1fae5',
  dinner: '#1e3a5f',
  dinnerBg: '#e0e7ff',
  free: '#b45309',
  freeBg: '#fef3c7',
  white: '#ffffff',
};

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

function mealEmoji(meal: Meal | undefined, fallback: string): string {
  const t = `${meal?.recipeName || ''} ${(meal?.items || []).map((i) => i.name).join(' ')}`.toLowerCase();
  if (/pescado|merluza|dorada|lubina|salmón|salmon|atún|atun|caballa|sardina|calamar|sepia|gamba|mejillón|mejillon/.test(t))
    return '🐟';
  if (/pollo|pavo|ternera|carne|conejo|jamón|jamon/.test(t)) return '🍗';
  if (/lenteja|garbanzo|alubia|legumbre|cocido|olla|potaje/.test(t)) return '🍲';
  if (/arroz|paella|cuscús|couscous/.test(t)) return '🍚';
  if (/pasta|fideo/.test(t)) return '🍝';
  if (/ensalada|verdura|crema|calabacín|calabacin|espinaca|judía|judia|pisto|hervido/.test(t)) return '🥗';
  if (/huevo|tortilla|revuelto/.test(t)) return '🥚';
  if (/yogur|leche|queso/.test(t)) return '🥛';
  if (/fruta|manzana|naranja|kiwi|pera|plátano|platano/.test(t)) return '🍎';
  if (/patata/.test(t)) return '🥔';
  return fallback;
}

function mealTitle(meal: Meal | undefined, fallback: string): string {
  if (!meal) return fallback;
  if (meal.recipeName?.trim()) return meal.recipeName.trim();
  const first = meal.items?.[0]?.name;
  return first || fallback;
}

function topItems(meal: Meal | undefined, servings: number, max = 3): string[] {
  if (!meal?.items?.length) return [];
  const skip = /^(postre|aceite de oliva)/i;
  return meal.items
    .filter((i) => i.name && !skip.test(i.name))
    .slice(0, max)
    .map((i: MealItem) => {
      const qty = scaleQuantity(i.quantity, servings);
      return qty ? `${i.name} · ${qty}` : i.name;
    });
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
  ctx.arcTo(x + w, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
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
  return lines;
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, PAGE_H);
  g.addColorStop(0, COLORS.bgBody);
  g.addColorStop(1, COLORS.bgBody2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Soft decorative blobs (atmosphere, not content)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  ctx.beginPath();
  ctx.arc(140, 180, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(13, 148, 136, 0.07)';
  ctx.beginPath();
  ctx.arc(PAGE_W - 80, PAGE_H - 200, 280, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeader(ctx: CanvasRenderingContext2D, input: InfographicInput, pageIndex: number, pageCount: number) {
  const { week, profileName, servings, kcal = 1500 } = input;
  const h = 168;
  const hg = ctx.createLinearGradient(0, 0, PAGE_W, h);
  hg.addColorStop(0, COLORS.bgTop2);
  hg.addColorStop(0.55, COLORS.bgTop);
  hg.addColorStop(1, '#115e59');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, PAGE_W, h);

  // Soft highlight arc
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(PAGE_W * 0.75, -40, 420, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(236,253,245,0.9)';
  ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('MI GORDÓLOGO', 56, 48);

  ctx.fillStyle = COLORS.white;
  ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Menú de la semana', 56, 108);

  const kcalLabel = `${Number(kcal).toLocaleString('es-ES')} kcal`;
  const meta = `Semana ${week.weekNumber}  ·  ${profileName}  ·  ${servings === 1 ? '1 ración' : '2 raciones'}  ·  ${kcalLabel}${
    pageCount > 1 ? `  ·  ${pageIndex + 1}/${pageCount}` : ''
  }`;
  ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(209,250,229,0.95)';
  ctx.fillText(meta, 56, 144);

  // Brand chip right
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, PAGE_W - 220, 48, 164, 72, 18);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.white;
  ctx.font = '800 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('🌿', PAGE_W - 138, 78);
  ctx.font = '700 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(236,253,245,0.95)';
  ctx.fillText('Hospital 1.500', PAGE_W - 138, 106);
}

function drawFooter(ctx: CanvasRenderingContext2D, kcal: number) {
  const h = 56;
  const y = PAGE_H - h;
  ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
  ctx.fillRect(0, y, PAGE_W, h);
  ctx.fillStyle = 'rgba(236,253,245,0.95)';
  ctx.font = '700 18px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Mi Gordólogo  ·  Estimación del menú ${Number(kcal).toLocaleString('es-ES')} kcal/día  ·  Ideal para WhatsApp`,
    PAGE_W / 2,
    y + h / 2
  );
}

type MealSlot = {
  label: string;
  emoji: string;
  title: string;
  items: string[];
  accent: string;
  bg: string;
};

function buildSlots(day: WeekMenu['days'][number], servings: number): MealSlot[] {
  return [
    {
      label: 'Desayuno',
      emoji: mealEmoji(day.meals.breakfast, '🌅'),
      title: mealTitle(day.meals.breakfast, 'Desayuno'),
      items: topItems(day.meals.breakfast, servings, 2),
      accent: COLORS.breakfast,
      bg: COLORS.breakfastBg,
    },
    {
      label: 'Comida',
      emoji: mealEmoji(day.meals.lunch, '🍽️'),
      title: mealTitle(day.meals.lunch, 'Comida'),
      items: topItems(day.meals.lunch, servings, 3),
      accent: COLORS.lunch,
      bg: COLORS.lunchBg,
    },
    {
      label: 'Cena',
      emoji: mealEmoji(day.meals.dinner, '🌙'),
      title: mealTitle(day.meals.dinner, 'Cena'),
      items: topItems(day.meals.dinner, servings, 3),
      accent: COLORS.dinner,
      bg: COLORS.dinnerBg,
    },
  ];
}

function drawMealChip(
  ctx: CanvasRenderingContext2D,
  slot: MealSlot,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = slot.bg;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();

  // Accent bar
  ctx.fillStyle = slot.accent;
  roundRect(ctx, x, y, 10, h, 16);
  ctx.fill();
  ctx.fillStyle = slot.bg;
  ctx.fillRect(x + 6, y, 8, h);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = slot.accent;
  ctx.fillText(`${slot.emoji}  ${slot.label.toUpperCase()}`, x + 22, y + 26);

  ctx.fillStyle = COLORS.ink;
  ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
  const titleLines = wrapText(ctx, slot.title, w - 36).slice(0, 2);
  let ty = y + 52;
  titleLines.forEach((line) => {
    ctx.fillText(line, x + 22, ty, w - 36);
    ty += 24;
  });

  ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.muted;
  slot.items.forEach((item) => {
    const lines = wrapText(ctx, item, w - 36).slice(0, 1);
    lines.forEach((line) => {
      ctx.fillText(line, x + 22, ty, w - 36);
      ty += 20;
    });
  });
}

function drawDayCard(
  ctx: CanvasRenderingContext2D,
  day: WeekMenu['days'][number],
  idx: number,
  x: number,
  y: number,
  w: number,
  h: number,
  servings: number
) {
  // Shadow
  ctx.fillStyle = 'rgba(6, 78, 59, 0.08)';
  roundRect(ctx, x + 4, y + 6, w, h, 22);
  ctx.fill();

  ctx.fillStyle = COLORS.card;
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 22);
  ctx.stroke();

  const short = DAY_SHORT[day.dayOfWeek] ?? DAY_SHORT[idx];
  const full = DAY_FULL[day.dayOfWeek] ?? day.dayLabel;

  // Day badge
  const badgeG = ctx.createLinearGradient(x, y, x + 120, y + h);
  badgeG.addColorStop(0, COLORS.bgTop2);
  badgeG.addColorStop(1, COLORS.bgTop);
  ctx.fillStyle = badgeG;
  roundRect(ctx, x, y, 118, h, 22);
  ctx.fill();
  ctx.fillStyle = COLORS.card;
  ctx.fillRect(x + 100, y, 22, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.white;
  ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(short.toUpperCase(), x + 52, y + h / 2 - 8);
  ctx.font = '600 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(236,253,245,0.9)';
  ctx.fillText(full, x + 52, y + h / 2 + 22);

  if (day.isFreeDay) {
    ctx.fillStyle = COLORS.freeBg;
    roundRect(ctx, x + 130, y + 18, w - 148, h - 36, 16);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.free;
    ctx.font = '800 28px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('🎉  Día libre', x + 160, y + h / 2 - 6);
    ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Sin menú pautado — a disfrutar', x + 160, y + h / 2 + 26);
    return;
  }

  const slots = buildSlots(day, servings);
  const gap = 14;
  const chipX = x + 130;
  const chipArea = w - 148;
  const chipW = (chipArea - gap * 2) / 3;
  const chipH = h - 28;
  slots.forEach((slot, i) => {
    drawMealChip(ctx, slot, chipX + i * (chipW + gap), y + 14, chipW, chipH);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/jpeg',
      0.93
    );
  });
}

/**
 * JPEG 1600×1600 visual (límite WhatsApp): tarjetas por día con emoji y platos destacados.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const { week, servings, kcal = 1500 } = input;
  const HEADER = 168;
  const FOOTER = 56;
  const MARGIN = 36;
  const GAP = 14;
  const usableH = PAGE_H - HEADER - FOOTER - MARGIN * 2;
  const daysPerPage = 4;
  const pages: (typeof week.days)[] = [];
  for (let i = 0; i < week.days.length; i += daysPerPage) {
    pages.push(week.days.slice(i, i + daysPerPage));
  }

  const blobs: Blob[] = [];
  for (let p = 0; p < pages.length; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    drawBackdrop(ctx);
    drawHeader(ctx, input, p, pages.length);

    const slice = pages[p];
    const cardH = Math.floor((usableH - GAP * (slice.length - 1)) / slice.length);
    const cardW = PAGE_W - MARGIN * 2;
    let y = HEADER + MARGIN;
    slice.forEach((day, idx) => {
      const globalIdx = p * daysPerPage + idx;
      drawDayCard(ctx, day, globalIdx, MARGIN, y, cardW, cardH, servings);
      y += cardH + GAP;
    });

    drawFooter(ctx, kcal);
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
