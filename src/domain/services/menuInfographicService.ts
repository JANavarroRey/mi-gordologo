import type { Meal, WeekMenu } from '../models/types';
import { LOGO_MARK_DATA_URL } from './logoMarkDataUrl';

type InfographicInput = {
  week: WeekMenu;
  profileName: string;
  servings: number;
  kcal?: number;
};

/** WhatsApp reescala cualquier lado > 1600 px y deja el texto ilegible. */
const PAGE_W = 1600;
const PAGE_H = 1600;

const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAME = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

/** Paleta tomada de la plantilla de referencia. */
const C = {
  page: '#e9f5ec',
  blob: '#cfe9d6',
  blobSoft: '#d9efdf',
  card: '#ffffff',
  cardLine: '#c9ddd0',
  ink: '#1b4332',
  brand: '#1b4332',
  leaf: '#52b788',
  mintRow: '#e8f5ec',
  yellow: '#f2c94c',
  white: '#ffffff',
  divider: '#c5d5cb',
  free: '#b45309',
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

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.fillStyle = C.blob;
  roundRect(ctx, -120, -140, 520, 420, 180);
  ctx.fill();
  roundRect(ctx, PAGE_W - 420, -80, 480, 320, 160);
  ctx.fill();
  roundRect(ctx, PAGE_W - 460, PAGE_H - 340, 520, 420, 180);
  ctx.fill();

  ctx.fillStyle = C.blobSoft;
  roundRect(ctx, -60, PAGE_H - 220, 280, 260, 120);
  ctx.fill();
}

function drawLeafMarks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = C.leaf;
  [
    { dx: 0, dy: -8, rot: -0.7, s: 1 },
    { dx: 16, dy: 2, rot: -0.2, s: 0.92 },
    { dx: 30, dy: 12, rot: 0.4, s: 0.95 },
  ].forEach((m) => {
    ctx.save();
    ctx.translate(x + m.dx, y + m.dy);
    ctx.rotate(m.rot);
    ctx.scale(m.s, m.s);
    // Teardrop / sparkle like the reference
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(7, -2, 0, 12);
    ctx.quadraticCurveTo(-7, -2, 0, -12);
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
  const logoSize = 108;
  const logoX = cardX + pad;
  const logoY = cardY + 40;

  // Logo mark (PNG embebido — nunca cuadrado verde vacío)
  ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

  ctx.fillStyle = C.ink;
  ctx.font = `800 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MiGordólogo', logoX + logoSize / 2, logoY + logoSize + 12);

  const sepX = logoX + logoSize + 40;
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(sepX, logoY + 6);
  ctx.lineTo(sepX, logoY + logoSize + 34);
  ctx.stroke();

  const titleX = sepX + 40;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink;
  ctx.font = `800 68px ${FONT}`;
  ctx.fillText('Menú semanal', titleX, logoY + 58);
  const titleW = ctx.measureText('Menú semanal').width;
  drawLeafMarks(ctx, titleX + titleW + 20, logoY + 38);

  const pillText = `SEMANA ${week.weekNumber}  ·  ${profileName.toUpperCase()}  ·  ${
    servings === 1 ? '1 RACIÓN' : '2 RACIONES'
  }  ·  ${Number(kcal).toLocaleString('es-ES')} KCAL`;
  ctx.font = `800 26px ${FONT}`;
  const pillW = Math.min(ctx.measureText(pillText).width + 52, cardX + cardW - pad - titleX);
  const pillH = 52;
  const pillY = logoY + 78;
  ctx.fillStyle = C.yellow;
  roundRect(ctx, titleX, pillY, pillW, pillH, 26);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, titleX + 26, pillY + pillH / 2, pillW - 44);

  return Math.max(logoY + logoSize + 52, pillY + pillH + 28);
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  week: WeekMenu,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const dayW = 158;
  const headerH = 76;
  const bodyH = h - headerH;
  const rowH = bodyH / 7;
  const mealW = (w - dayW) / 3;
  const r = 30;

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
    const circleR = 30;
    const cx = x + dayW / 2;
    const cy = rowY + rowH / 2 - 12;

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
    ctx.font = `800 17px ${FONT}`;
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

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo generar la imagen'));
      },
      'image/jpeg',
      0.95
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
 * JPEG 1600×1600 idéntico a la plantilla de menú semanal de referencia.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const logo = await loadImage(LOGO_MARK_DATA_URL);

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBackdrop(ctx);

  const margin = 56;
  const cardX = margin;
  const cardY = margin;
  const cardW = PAGE_W - margin * 2;
  const cardH = PAGE_H - margin * 2;
  const cardR = 44;

  ctx.fillStyle = C.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.strokeStyle = C.cardLine;
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  const headerBottom = drawHeader(ctx, input, logo, cardX, cardY, cardW);

  const tablePad = 44;
  const tableX = cardX + tablePad;
  const tableY = headerBottom;
  const tableW = cardW - tablePad * 2;
  const tableH = cardY + cardH - tablePad - tableY;

  drawTable(ctx, input.week, tableX, tableY, tableW, tableH);

  return [await canvasToJpeg(canvas)];
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
