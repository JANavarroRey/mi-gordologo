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
  paper: '#fafaf8',
  paperSoft: '#f3f4f1',
  ink: '#1c1917',
  muted: '#57534e',
  soft: '#a8a29e',
  brand: '#16a34a',
  brandDeep: '#14532d',
  brandSoft: '#dcfce7',
  brandMid: '#86efac',
  accent: '#facc15',
  accentInk: '#422006',
  cell: '#f5f5f4',
  cellAlt: '#ffffff',
  line: '#e7e5e4',
  white: '#ffffff',
  free: '#b45309',
  freeBg: '#fef3c7',
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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function logoUrl(): string {
  try {
    return new URL('logo.svg', document.baseURI).href;
  } catch {
    return './logo.svg';
  }
}

/** Bowl decorativo (estilo foto del ejemplo, en marca). */
function drawBowl(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(20, 83, 45, 0.08)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 110, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bowl
  ctx.fillStyle = '#f8faf8';
  ctx.strokeStyle = C.brandDeep;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-95, -10);
  ctx.quadraticCurveTo(-100, 70, 0, 85);
  ctx.quadraticCurveTo(100, 70, 95, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Rim
  ctx.fillStyle = C.brandSoft;
  ctx.beginPath();
  ctx.ellipse(0, -10, 98, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.brand;
  ctx.stroke();
  // Greens
  ctx.fillStyle = '#4ade80';
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.28;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 40, -18 + Math.sin(a) * 8, 18, 10, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mango / lemon bits
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.ellipse(-28, 8, 16, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(22, 14, 14, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(48, -6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Aros tipo cebolla / decoración derecha. */
function drawRings(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.translate(cx, cy);
  const rings = [
    { x: 0, y: 0, r: 48, c: '#fca5a5' },
    { x: 36, y: 22, r: 38, c: '#fda4af' },
    { x: -30, y: 28, r: 32, c: '#fb7185' },
    { x: 18, y: -28, r: 28, c: '#fecdd3' },
  ];
  rings.forEach((ring) => {
    ctx.strokeStyle = ring.c;
    ctx.lineWidth = 7;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(ring.x - 4, ring.y - 4, ring.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  input: InfographicInput,
  logo: HTMLImageElement | null
) {
  const { week, profileName, servings, kcal = 1500 } = input;

  // Soft paper wash
  const g = ctx.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, C.paper);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PAGE_W, 320);

  drawBowl(ctx, 150, 155, 0.95);
  drawRings(ctx, PAGE_W - 130, 120);

  if (logo) {
    const lw = 280;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, PAGE_W / 2 - lw / 2, 28, lw, lh);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = C.brandDeep;
    ctx.font = '800 36px Nunito, "Segoe UI", sans-serif';
    ctx.fillText('Mi Gordólogo', PAGE_W / 2, 70);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink;
  ctx.font = '700 72px Georgia, "Times New Roman", serif';
  ctx.fillText('Menú Semanal', PAGE_W / 2, 200);

  ctx.fillStyle = C.brand;
  ctx.font = '700 22px Nunito, "Segoe UI", sans-serif';
  ctx.fillText('S A L U D A B L E', PAGE_W / 2, 238);

  const kcalLabel = `${Number(kcal).toLocaleString('es-ES')} kcal`;
  const pill = `Semana ${week.weekNumber}  ·  ${profileName}  ·  ${
    servings === 1 ? '1 ración' : '2 raciones'
  }  ·  ${kcalLabel}`;
  ctx.font = '700 22px Nunito, "Segoe UI", sans-serif';
  const pw = Math.min(ctx.measureText(pill).width + 56, PAGE_W - 120);
  const px = (PAGE_W - pw) / 2;
  const py = 258;
  ctx.fillStyle = C.accent;
  roundRect(ctx, px, py, pw, 44, 22);
  ctx.fill();
  ctx.fillStyle = C.accentInk;
  ctx.textBaseline = 'middle';
  ctx.fillText(pill, PAGE_W / 2, py + 22);
}

function drawTable(ctx: CanvasRenderingContext2D, week: WeekMenu) {
  const top = 330;
  const bottom = PAGE_H - 64;
  const side = 56;
  const dayW = 78;
  const tableW = PAGE_W - side * 2;
  const mealW = (tableW - dayW) / 3;
  const headerH = 52;
  const bodyH = bottom - top - headerH;
  const rowH = bodyH / 7;

  // Header bar
  ctx.fillStyle = C.brandSoft;
  roundRect(ctx, side + dayW, top, tableW - dayW, headerH, 14);
  ctx.fill();
  // square off left of header for flush with day col
  ctx.fillRect(side + dayW, top + 14, 14, headerH - 14);

  const cols = [
    { key: 'breakfast' as const, label: 'DESAYUNO', x: side + dayW },
    { key: 'lunch' as const, label: 'COMIDA', x: side + dayW + mealW },
    { key: 'dinner' as const, label: 'CENA', x: side + dayW + mealW * 2 },
  ];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.brandDeep;
  ctx.font = '800 22px Nunito, "Segoe UI", sans-serif';
  cols.forEach((col) => {
    ctx.fillText(col.label, col.x + mealW / 2, top + headerH / 2);
  });

  week.days.forEach((day, i) => {
    const y = top + headerH + i * rowH;
    const letter = DAY_LETTER[day.dayOfWeek] ?? DAY_LETTER[i];

    // Day badge
    ctx.fillStyle = C.brandSoft;
    roundRect(ctx, side + 6, y + rowH / 2 - 28, 56, 56, 12);
    ctx.fill();
    ctx.fillStyle = C.brandDeep;
    ctx.font = '800 28px Nunito, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, side + 34, y + rowH / 2);

    cols.forEach((col, ci) => {
      const x = col.x;
      const bg = i % 2 === 0 ? C.cell : C.cellAlt;
      ctx.fillStyle = bg;
      if (ci === 0 && i === 0) {
        roundRect(ctx, x, y, mealW, rowH, 0);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, mealW, rowH);
      }
      // subtle separators
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
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
          ctx.font = '700 20px Nunito, "Segoe UI", sans-serif';
          ctx.fillText('Día libre', x + mealW / 2, y + rowH / 2);
        }
        return;
      }

      const meal = day.meals[col.key];
      const title = mealTitle(meal, col.label);
      ctx.fillStyle = C.ink;
      ctx.font = '600 20px Nunito, "Segoe UI", sans-serif';
      const lines = wrapText(ctx, title, mealW - 36).slice(0, 3);
      const lineH = 24;
      const blockH = lines.length * lineH;
      let ty = y + (rowH - blockH) / 2 + lineH / 2;
      lines.forEach((line) => {
        ctx.fillText(line, x + mealW / 2, ty, mealW - 28);
        ty += lineH;
      });
    });
  });

  // Outer soft frame
  ctx.strokeStyle = C.brandMid;
  ctx.lineWidth = 2;
  roundRect(ctx, side + dayW, top, tableW - dayW, headerH + bodyH, 16);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D, kcal: number) {
  ctx.fillStyle = C.brandDeep;
  ctx.fillRect(0, PAGE_H - 56, PAGE_W, 56);
  ctx.fillStyle = 'rgba(220, 252, 231, 0.95)';
  ctx.font = '700 18px Nunito, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Mi Gordólogo  ·  ${Number(kcal).toLocaleString('es-ES')} kcal/día  ·  Adelgaza sin comer`,
    PAGE_W / 2,
    PAGE_H - 28
  );
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
 * JPEG 1600×1600 estilo menú semanal limpio (referencia visual) con marca Mi Gordólogo.
 */
export async function buildWeekMenuInfographicPages(input: InfographicInput): Promise<Blob[]> {
  const { week, kcal = 1500 } = input;
  const logo = await loadImage(logoUrl());

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
  drawTable(ctx, week);
  drawFooter(ctx, kcal);

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
