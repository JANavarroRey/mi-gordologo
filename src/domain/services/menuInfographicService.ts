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

const C = {
  paper: '#f7faf7',
  ink: '#14532d',
  body: '#1c1917',
  muted: '#44403c',
  brand: '#16a34a',
  brandDeep: '#14532d',
  brandSoft: '#dcfce7',
  brandBar: '#15803d',
  accent: '#facc15',
  accentInk: '#422006',
  cell: '#f0fdf4',
  cellAlt: '#ffffff',
  line: '#bbf7d0',
  white: '#ffffff',
  free: '#b45309',
};

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

const HEADER_H = 210;

function drawHeader(
  ctx: CanvasRenderingContext2D,
  input: InfographicInput,
  logo: HTMLImageElement | null
) {
  const { week, profileName, servings, kcal = 1500 } = input;

  const hg = ctx.createLinearGradient(0, 0, PAGE_W, HEADER_H);
  hg.addColorStop(0, '#14532d');
  hg.addColorStop(0.55, '#15803d');
  hg.addColorStop(1, '#16a34a');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, PAGE_W, HEADER_H);

  // Soft light accent (no food doodles)
  ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
  ctx.beginPath();
  ctx.ellipse(PAGE_W - 180, -20, 260, 140, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(200, HEADER_H + 10, 280, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // Logo card
  const cardX = 40;
  const cardY = 28;
  const cardH = 154;
  const cardW = logo ? 420 : 280;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(ctx, cardX, cardY, cardW, cardH, 22);
  ctx.fill();

  if (logo) {
    const pad = 18;
    const maxW = cardW - pad * 2;
    const maxH = cardH - pad * 2;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const lw = logo.width * scale;
    const lh = logo.height * scale;
    ctx.drawImage(logo, cardX + (cardW - lw) / 2, cardY + (cardH - lh) / 2, lw, lh);
  } else {
    ctx.fillStyle = C.brandDeep;
    ctx.font = '800 40px Nunito, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Mi Gordólogo', cardX + cardW / 2, cardY + cardH / 2);
  }

  // Title block (right of logo)
  const textLeft = cardX + cardW + 40;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.white;
  ctx.font = '800 64px Georgia, "Times New Roman", serif';
  ctx.fillText('Menú semanal', textLeft, 100);

  const kcalLabel = `${Number(kcal).toLocaleString('es-ES')} kcal`;
  const pill = `Semana ${week.weekNumber}  ·  ${profileName}  ·  ${
    servings === 1 ? '1 ración' : '2 raciones'
  }  ·  ${kcalLabel}`;
  ctx.font = '700 26px Nunito, "Segoe UI", sans-serif';
  const pw = Math.min(ctx.measureText(pill).width + 48, PAGE_W - textLeft - 48);
  const py = 128;
  ctx.fillStyle = C.accent;
  roundRect(ctx, textLeft, py, pw, 52, 26);
  ctx.fill();
  ctx.fillStyle = C.accentInk;
  ctx.textBaseline = 'middle';
  ctx.fillText(pill, textLeft + 24, py + 26, pw - 40);
}

function drawTable(ctx: CanvasRenderingContext2D, week: WeekMenu) {
  const top = HEADER_H + 28;
  const bottom = PAGE_H - 70;
  const side = 40;
  const dayW = 88;
  const tableW = PAGE_W - side * 2;
  const mealW = (tableW - dayW) / 3;
  const headerH = 64;
  const bodyH = bottom - top - headerH;
  const rowH = bodyH / 7;
  const tableLeft = side + dayW;
  const tableRight = side + tableW;

  // Column header
  ctx.fillStyle = C.brandSoft;
  roundRect(ctx, tableLeft, top, tableW - dayW, headerH, 16);
  ctx.fill();
  ctx.fillRect(tableLeft, top + 20, 20, headerH - 20);

  const cols = [
    { key: 'breakfast' as const, label: 'DESAYUNO', x: tableLeft },
    { key: 'lunch' as const, label: 'COMIDA', x: tableLeft + mealW },
    { key: 'dinner' as const, label: 'CENA', x: tableLeft + mealW * 2 },
  ];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.brandDeep;
  ctx.font = '800 28px Nunito, "Segoe UI", sans-serif';
  cols.forEach((col) => {
    ctx.fillText(col.label, col.x + mealW / 2, top + headerH / 2);
  });

  week.days.forEach((day, i) => {
    const y = top + headerH + i * rowH;
    const letter = DAY_LETTER[day.dayOfWeek] ?? DAY_LETTER[i];

    // Day badge
    const badgeSize = Math.min(68, rowH - 16);
    ctx.fillStyle = C.brand;
    roundRect(ctx, side + (dayW - badgeSize) / 2, y + (rowH - badgeSize) / 2, badgeSize, badgeSize, 14);
    ctx.fill();
    ctx.fillStyle = C.white;
    ctx.font = '800 34px Nunito, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, side + dayW / 2, y + rowH / 2 + 1);

    cols.forEach((col, ci) => {
      const x = col.x;
      ctx.fillStyle = i % 2 === 0 ? C.cell : C.cellAlt;
      ctx.fillRect(x, y, mealW, rowH);

      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + rowH);
      ctx.lineTo(x + mealW, y + rowH);
      ctx.stroke();
      if (ci > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }

      if (day.isFreeDay) {
        if (ci === 1) {
          ctx.fillStyle = C.free;
          ctx.font = '700 26px Nunito, "Segoe UI", sans-serif';
          ctx.fillText('Día libre', x + mealW / 2, y + rowH / 2);
        }
        return;
      }

      const meal = day.meals[col.key];
      const title = mealTitle(meal, col.label);
      ctx.fillStyle = C.body;
      ctx.font = '700 26px Nunito, "Segoe UI", sans-serif';
      const lines = wrapText(ctx, title, mealW - 40).slice(0, 3);
      const lineH = 30;
      const blockH = lines.length * lineH;
      let ty = y + (rowH - blockH) / 2 + lineH / 2;
      lines.forEach((line) => {
        ctx.fillText(line, x + mealW / 2, ty, mealW - 32);
        ty += lineH;
      });
    });
  });

  // Clean outer border (fixed roundRect — no diagonal)
  ctx.strokeStyle = C.brand;
  ctx.lineWidth = 3;
  roundRect(ctx, tableLeft, top, tableRight - tableLeft, headerH + bodyH, 16);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.brandDeep;
  ctx.fillRect(0, PAGE_H - 58, PAGE_W, 58);
  ctx.fillStyle = 'rgba(220, 252, 231, 0.96)';
  ctx.font = '700 22px Nunito, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mi Gordólogo  ·  Adelgaza sin comer', PAGE_W / 2, PAGE_H - 29);
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
 * JPEG 1600×1600: cabecera con logo + tabla limpia (WhatsApp).
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const logo = await loadImage(assetUrl('logo.svg'));

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  drawHeader(ctx, input, logo);
  drawTable(ctx, input.week);
  drawFooter(ctx);

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
