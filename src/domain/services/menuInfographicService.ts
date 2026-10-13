import type { Meal, WeekMenu } from '../models/types';
import { LOGO_JPG_DATA_URL } from './logoJpgDataUrl';

type InfographicInput = {
  week: WeekMenu;
  profileName: string;
  servings: number;
  kcal?: number;
};

/** WhatsApp reescala cualquier lado > 1600 px. */
const PAGE_W = 1600;
const PAGE_H = 1600;
/** Radio exterior de la imagen completa (como la plantilla). */
const OUTER_R = 72;

const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAME = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

const C = {
  page: '#eaf6ee',
  blob: '#c8e6d0',
  blobSoft: '#d7efdd',
  card: '#ffffff',
  cardLine: '#d0e0d6',
  ink: '#1b4332',
  brand: '#1b4332',
  leaf: '#52b788',
  mintRow: '#e8f5ec',
  yellow: '#f2c94c',
  white: '#ffffff',
  divider: '#c5d5cb',
  free: '#b45309',
  logoBg: '#16a34a',
};

const FONT = 'Nunito, "Segoe UI", system-ui, sans-serif';

function mealTitle(meal: Meal | undefined, fallback: string): string {
  if (!meal) return fallback;
  if (meal.recipeName?.trim()) return meal.recipeName.trim();
  const first = meal.items?.[0]?.name;
  return first || fallback;
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar el logo'));
    img.src = src;
  });
}

function drawOrganicBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeafMarks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = C.leaf;
  [
    { dx: 2, dy: -10, rot: -0.75, s: 1.05 },
    { dx: 18, dy: 0, rot: -0.2, s: 0.95 },
    { dx: 32, dy: 12, rot: 0.45, s: 1 },
  ].forEach((m) => {
    ctx.save();
    ctx.translate(x + m.dx, y + m.dy);
    ctx.rotate(m.rot);
    ctx.scale(m.s, m.s);
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.bezierCurveTo(8, -4, 8, 6, 0, 14);
    ctx.bezierCurveTo(-8, 6, -8, -4, 0, -13);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

function drawIconCalendar(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  roundRect(ctx, -10, -7, 20, 16, 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.lineTo(10, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4.5, -11);
  ctx.lineTo(-4.5, -5);
  ctx.moveTo(4.5, -11);
  ctx.lineTo(4.5, -5);
  ctx.stroke();
  ctx.restore();
}

function drawIconSun(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 7.2, Math.sin(a) * 7.2);
    ctx.lineTo(Math.cos(a) * 10.8, Math.sin(a) * 10.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIconUtensils(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -9);
  ctx.lineTo(-5, 9);
  ctx.moveTo(-8, -9);
  ctx.lineTo(-8, -2.5);
  ctx.quadraticCurveTo(-5, -0.5, -2, -2.5);
  ctx.lineTo(-2, -9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, 9);
  ctx.lineTo(5, -9);
  ctx.quadraticCurveTo(11, -3, 5, 1);
  ctx.stroke();
  ctx.restore();
}

function drawIconMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(2, 0, 7.8, -0.85, Math.PI + 0.55);
  ctx.arc(-1.5, -1.5, 6.2, 1.35, -1.05, true);
  ctx.stroke();
  ctx.restore();
}

/** Dibuja public/logo.jpg con esquinas redondeadas (marca oficial). */
function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  x: number,
  y: number,
  size: number
) {
  const r = size * 0.2;
  ctx.fillStyle = C.white;
  roundRect(ctx, x, y, size, size, r);
  ctx.fill();
  ctx.strokeStyle = C.cardLine;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, size, size, r);
  ctx.stroke();

  ctx.save();
  roundRect(ctx, x, y, size, size, r);
  ctx.clip();

  const srcW = logo.naturalWidth || logo.width;
  const srcH = logo.naturalHeight || logo.height;
  const pad = size * 0.04;
  const box = size - pad * 2;
  const scale = Math.min(box / srcW, box / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(logo, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  ctx.restore();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  input: InfographicInput,
  logo: HTMLImageElement,
  cardX: number,
  cardY: number,
  cardW: number
): number {
  const { week, profileName, servings, kcal = 1500 } = input;
  const pad = 52;
  const logoSize = 168;
  const logoX = cardX + pad;
  const logoY = cardY + 36;

  drawBrandLogo(ctx, logo, logoX, logoY, logoSize);

  const brandBottom = logoY + logoSize;
  const sepX = logoX + logoSize + 36;
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(sepX, logoY + 10);
  ctx.lineTo(sepX, brandBottom - 10);
  ctx.stroke();

  const titleX = sepX + 36;
  const titleMidY = logoY + logoSize * 0.36;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.ink;
  ctx.font = `800 68px ${FONT}`;
  ctx.fillText('Menú semanal', titleX, titleMidY);
  const titleW = ctx.measureText('Menú semanal').width;
  drawLeafMarks(ctx, titleX + titleW + 20, titleMidY - 22);

  const pillText = `SEMANA ${week.weekNumber}  ·  ${profileName.toUpperCase()}  ·  ${
    servings === 1 ? '1 RACIÓN' : '2 RACIONES'
  }  ·  ${Number(kcal).toLocaleString('es-ES')} KCAL`;
  ctx.font = `800 26px ${FONT}`;
  const pillW = Math.min(ctx.measureText(pillText).width + 56, cardX + cardW - pad - titleX);
  const pillH = 54;
  const pillY = titleMidY + 38;
  ctx.fillStyle = C.yellow;
  roundRect(ctx, titleX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, titleX + 28, pillY + pillH / 2, pillW - 48);

  return Math.max(brandBottom + 28, pillY + pillH + 28);
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  week: WeekMenu,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const dayW = 160;
  const headerH = 78;
  const bodyH = h - headerH;
  const rowH = bodyH / 7;
  const mealW = (w - dayW) / 3;
  const r = 36;

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  ctx.fillStyle = C.brand;
  ctx.fillRect(x, y, w, headerH);

  const headers: Array<{
    label: string;
    cx: number;
    icon: (c: CanvasRenderingContext2D, ix: number, iy: number) => void;
  }> = [
    { label: 'Día', cx: x + dayW / 2, icon: drawIconCalendar },
    { label: 'Desayuno', cx: x + dayW + mealW * 0.5, icon: drawIconSun },
    { label: 'Comida', cx: x + dayW + mealW * 1.5, icon: drawIconUtensils },
    { label: 'Cena', cx: x + dayW + mealW * 2.5, icon: drawIconMoon },
  ];

  headers.forEach((col) => {
    ctx.font = `800 30px ${FONT}`;
    const labelW = ctx.measureText(col.label).width;
    const gap = 14;
    const iconSlot = 24;
    const blockW = iconSlot + gap + labelW;
    const start = col.cx - blockW / 2;
    col.icon(ctx, start + iconSlot / 2, y + headerH / 2);
    ctx.fillStyle = C.white;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(col.label, start + iconSlot + gap, y + headerH / 2 + 1);
  });

  week.days.forEach((day, i) => {
    const rowY = y + headerH + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? C.white : C.mintRow;
    ctx.fillRect(x, rowY, w, rowH);

    const letter = DAY_LETTER[day.dayOfWeek] ?? DAY_LETTER[i];
    const name = DAY_NAME[day.dayOfWeek] ?? DAY_NAME[i];
    const circleR = 32;
    const cx = x + dayW / 2;
    const cy = rowY + rowH / 2 - 14;

    ctx.fillStyle = C.brand;
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = `800 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy + 1);

    ctx.fillStyle = C.ink;
    ctx.font = `800 18px ${FONT}`;
    ctx.fillText(name, cx, cy + circleR + 18);

    const meals = [
      { key: 'breakfast' as const, ox: x + dayW },
      { key: 'lunch' as const, ox: x + dayW + mealW },
      { key: 'dinner' as const, ox: x + dayW + mealW * 2 },
    ];

    meals.forEach((m) => {
      if (day.isFreeDay) {
        if (m.key === 'lunch') {
          ctx.fillStyle = C.free;
          ctx.font = `700 26px ${FONT}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('Día libre', m.ox + 28, rowY + rowH / 2);
        }
        return;
      }
      const title = mealTitle(day.meals[m.key], '—');
      ctx.fillStyle = C.ink;
      ctx.font = `600 25px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lines = wrapText(ctx, title, mealW - 52).slice(0, 3);
      const lineH = 29;
      const blockH = lines.length * lineH;
      let ty = rowY + (rowH - blockH) / 2 + lineH / 2;
      lines.forEach((line) => {
        ctx.fillText(line, m.ox + 28, ty, mealW - 52);
        ty += lineH;
      });
    });
  });

  ctx.restore();

  ctx.strokeStyle = C.brand;
  ctx.lineWidth = 5;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/png'
    );
  });
}

function emptyMeal(type: Meal['type'], recipeName: string): Meal {
  return { type, recipeName, items: [], recipeUrl: null, totalCalories: null };
}

function sampleWeek(): WeekMenu {
  const titles = [
    ['Leche desnatada', 'Lentejas estofadas', 'Ensalada templada de arroz y pavo (plato único)'],
    ['Yogur desnatado sin azúcar', 'Arroz a la cubana', 'Espinacas con conejo al horno'],
    ['Café/infusión con leche desnatada', 'Verduras con carne', 'Sopa de fideos con tortilla'],
    ['Queso fresco Burgos desnatado', 'Pasta al huevo con queso', 'Hervido de alcachofas con pollo'],
    ['Leche desnatada', 'Cocido murciano', 'Crema de calabacín con huevo'],
    ['Yogur desnatado sin azúcar', 'Estofado de ternera', 'Vichyssoise con jamón de pavo'],
    ['Leche desnatada con canela', 'Ensalada de alubias (plato único)', 'Revuelto de champiñones con ensalada'],
  ];
  return {
    weekNumber: 2,
    days: titles.map((t, i) => ({
      dayOfWeek: i,
      dayLabel: DAY_NAME[i],
      isFreeDay: false,
      meals: {
        breakfast: emptyMeal('breakfast', t[0]),
        midMorning: emptyMeal('midMorning', ''),
        lunch: emptyMeal('lunch', t[1]),
        snack: emptyMeal('snack', ''),
        dinner: emptyMeal('dinner', t[2]),
        recena: emptyMeal('recena', ''),
      },
    })),
  };
}

/**
 * PNG 1600×1600 con esquinas redondeadas — plantilla de menú semanal de referencia.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const logo = await loadImage(LOGO_JPG_DATA_URL);

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Esquinas exteriores transparentes (como la original)
  ctx.clearRect(0, 0, PAGE_W, PAGE_H);
  ctx.save();
  roundRect(ctx, 0, 0, PAGE_W, PAGE_H, OUTER_R);
  ctx.clip();

  // Fondo menta + blobs orgánicos
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  drawOrganicBlob(ctx, 80, 60, 340, 280, C.blob);
  drawOrganicBlob(ctx, PAGE_W - 60, 40, 300, 240, C.blobSoft);
  drawOrganicBlob(ctx, PAGE_W - 40, PAGE_H - 80, 380, 300, C.blob);
  drawOrganicBlob(ctx, 40, PAGE_H - 40, 220, 180, C.blobSoft);

  const margin = 48;
  const cardX = margin;
  const cardY = margin;
  const cardW = PAGE_W - margin * 2;
  const cardH = PAGE_H - margin * 2;
  const cardR = 56;

  ctx.fillStyle = C.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.strokeStyle = C.cardLine;
  ctx.lineWidth = 2.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  const headerBottom = drawHeader(ctx, input, logo, cardX, cardY, cardW);

  const tablePad = 48;
  const tableX = cardX + tablePad;
  const tableY = headerBottom;
  const tableW = cardW - tablePad * 2;
  const tableH = cardY + cardH - tablePad - tableY;

  drawTable(ctx, input.week, tableX, tableY, tableW, tableH);

  ctx.restore();

  return [await canvasToPng(canvas)];
}

/** Solo para previsualización / QA local. */
export async function buildSampleMenuInfographicBlob(): Promise<Blob> {
  return (
    await buildWeekMenuInfographicPages({
      week: sampleWeek(),
      profileName: 'Pepe',
      servings: 1,
      kcal: 1500,
    })
  )[0];
}

export async function shareWeekMenuInfographic(input: InfographicInput): Promise<'shared' | 'downloaded'> {
  const blobs = await buildWeekMenuInfographicPages(input);
  const files = blobs.map(
    (blob, i) =>
      new File([blob], `menu-semana-${input.week.weekNumber}${blobs.length > 1 ? `-${i + 1}` : ''}.png`, {
        type: 'image/png',
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
