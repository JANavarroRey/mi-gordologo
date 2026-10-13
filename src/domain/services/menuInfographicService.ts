import type { Meal, WeekMenu } from '../models/types';

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

/** Paleta idéntica a la plantilla de referencia. */
const C = {
  bg: '#eef7f0',
  blob: '#d8efe0',
  card: '#ffffff',
  cardLine: '#d7e8dc',
  ink: '#1b4332',
  brand: '#1b4332',
  brandMid: '#2d6a4f',
  mintRow: '#eaf6ee',
  yellow: '#f2c94c',
  white: '#ffffff',
  divider: '#d0ddd4',
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function assetUrl(file: string): string {
  try {
    return new URL(file, document.baseURI).href;
  } catch {
    return `./${file}`;
  }
}

function drawBackdrop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = C.blob;
  roundRect(ctx, -90, -110, 440, 380, 170);
  ctx.fill();
  roundRect(ctx, PAGE_W - 400, PAGE_H - 300, 480, 380, 170);
  ctx.fill();
}

function drawLeafMarks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = C.brandMid;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  [
    { dx: 0, dy: -8, rot: -0.55 },
    { dx: 18, dy: 2, rot: -0.12 },
    { dx: 34, dy: 12, rot: 0.38 },
  ].forEach((m) => {
    ctx.save();
    ctx.translate(x + m.dx, y + m.dy);
    ctx.rotate(m.rot);
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(7, 0, 0, -11);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawIconCalendar(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  roundRect(ctx, -9, -7, 18, 15, 2.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.lineTo(9, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.lineTo(-4, -5);
  ctx.moveTo(4, -11);
  ctx.lineTo(4, -5);
  ctx.stroke();
  ctx.restore();
}

function drawIconSun(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6.8, Math.sin(a) * 6.8);
    ctx.lineTo(Math.cos(a) * 10.2, Math.sin(a) * 10.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIconUtensils(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 2.4;
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
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(2, 0, 7.5, -0.85, Math.PI + 0.55);
  ctx.arc(-1.5, -1.5, 6, 1.35, -1.05, true);
  ctx.stroke();
  ctx.restore();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  input: InfographicInput,
  icon: HTMLImageElement | null,
  cardX: number,
  cardY: number,
  cardW: number
) {
  const { week, profileName, servings, kcal = 1500 } = input;
  const pad = 48;
  const logoSize = 96;
  const logoX = cardX + pad;
  const logoY = cardY + 36;

  if (icon) {
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 22);
    ctx.save();
    ctx.clip();
    ctx.drawImage(icon, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = '#16a34a';
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 22);
    ctx.fill();
  }

  ctx.fillStyle = C.ink;
  ctx.font = `800 28px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('MiGordólogo', logoX + logoSize / 2, logoY + logoSize + 10);

  const sepX = logoX + logoSize + 36;
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sepX, logoY + 8);
  ctx.lineTo(sepX, logoY + logoSize + 28);
  ctx.stroke();

  const titleX = sepX + 36;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink;
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText('Menú semanal', titleX, logoY + 52);
  const titleW = ctx.measureText('Menú semanal').width;
  drawLeafMarks(ctx, titleX + titleW + 18, logoY + 36);

  const pillText = `SEMANA ${week.weekNumber}  ·  ${profileName.toUpperCase()}  ·  ${
    servings === 1 ? '1 RACIÓN' : '2 RACIONES'
  }  ·  ${Number(kcal).toLocaleString('es-ES')} KCAL`;
  ctx.font = `800 24px ${FONT}`;
  const pillW = Math.min(ctx.measureText(pillText).width + 48, cardW - (titleX - cardX) - pad);
  const pillH = 48;
  const pillY = logoY + 72;
  ctx.fillStyle = C.yellow;
  roundRect(ctx, titleX, pillY, pillW, pillH, 24);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, titleX + 24, pillY + pillH / 2, pillW - 40);

  return logoY + logoSize + 56;
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  week: WeekMenu,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const dayW = 150;
  const headerH = 72;
  const bodyH = h - headerH;
  const rowH = bodyH / 7;
  const mealW = (w - dayW) / 3;
  const r = 28;

  // Clip rounded table
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  // Header bar
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
    ctx.font = `800 28px ${FONT}`;
    const labelW = ctx.measureText(col.label).width;
    const gap = 12;
    const iconSlot = 22;
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
    const circleR = 28;
    const cx = x + dayW / 2;
    const cy = rowY + rowH / 2 - 10;

    ctx.fillStyle = C.brand;
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = `800 28px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy + 1);

    ctx.fillStyle = C.ink;
    ctx.font = `800 16px ${FONT}`;
    ctx.fillText(name, cx, cy + circleR + 16);

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
      ctx.font = `600 24px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lines = wrapText(ctx, title, mealW - 48).slice(0, 3);
      const lineH = 28;
      const blockH = lines.length * lineH;
      let ty = rowY + (rowH - blockH) / 2 + lineH / 2;
      lines.forEach((line) => {
        ctx.fillText(line, m.ox + 28, ty, mealW - 48);
        ty += lineH;
      });
    });
  });

  ctx.restore();

  // Outer border
  ctx.strokeStyle = C.brand;
  ctx.lineWidth = 4;
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
      0.94
    );
  });
}

/**
 * JPEG 1600×1600 idéntico a la plantilla de menú semanal de referencia.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const icon = await loadImage(assetUrl('icon-192.svg'));

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBackdrop(ctx);

  const margin = 48;
  const cardX = margin;
  const cardY = margin;
  const cardW = PAGE_W - margin * 2;
  const cardH = PAGE_H - margin * 2;
  const cardR = 40;

  ctx.fillStyle = C.card;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.strokeStyle = C.cardLine;
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();

  const headerBottom = drawHeader(ctx, input, icon, cardX, cardY, cardW);

  const tablePad = 40;
  const tableX = cardX + tablePad;
  const tableY = headerBottom + 8;
  const tableW = cardW - tablePad * 2;
  const tableH = cardY + cardH - tablePad - tableY;

  drawTable(ctx, input.week, tableX, tableY, tableW, tableH);

  return [await canvasToJpeg(canvas)];
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
