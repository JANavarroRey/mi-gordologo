import type { WeekMenu } from '../models/types';

type InfographicInput = {
  week: WeekMenu;
  profileName: string;
  servings: number;
  kcal?: number;
};

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
  return lines.length ? lines : ['—'];
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(16, -6, 10, 14);
  ctx.quadraticCurveTo(0, 6, -10, 14);
  ctx.quadraticCurveTo(-16, -6, 0, -18);
  ctx.fill();
  ctx.restore();
}

function drawPepper(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 14, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#15803d';
  ctx.fillRect(-2, -12, 4, 8);
  ctx.restore();
}

/**
 * Genera una infografía PNG del menú semanal (visual, estilo cartel nutricional).
 */
export async function buildWeekMenuInfographic(input: InfographicInput): Promise<Blob> {
  const { week, profileName, servings, kcal = 1500 } = input;
  const W = 1080;
  const H = 1680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  // Fondo
  ctx.fillStyle = '#fffaf7';
  ctx.fillRect(0, 0, W, H);

  // Cabecera visual
  const headerH = 200;
  const grad = ctx.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, '#047857');
  grad.addColorStop(1, '#0d9488');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);

  // Decoración cabecera
  drawLeaf(ctx, 70, 150, 2.2, 'rgba(255,255,255,0.18)');
  drawLeaf(ctx, 980, 40, 1.8, 'rgba(255,255,255,0.15)');
  drawPepper(ctx, 120, 55, 1.4);
  drawPepper(ctx, 960, 150, 1.2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 64px system-ui, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MENÚ SEMANAL', W / 2, 95);

  ctx.font = '600 28px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(`Semana ${week.weekNumber} · Mi Gordólogo`, W / 2, 140);

  ctx.font = '500 24px system-ui, Segoe UI, sans-serif';
  ctx.fillText(
    `${profileName} · ${servings === 1 ? '1 ración' : '2 raciones'} · ${kcal} kcal`,
    W / 2,
    175
  );

  // Cabeceras de columnas
  const top = 240;
  const leftPad = 48;
  const dayW = 170;
  const mealW = (W - leftPad * 2 - dayW) / 2;
  const comidaX = leftPad + dayW;
  const cenaX = comidaX + mealW;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#115e59';
  ctx.font = '800 26px system-ui, Segoe UI, sans-serif';
  ctx.fillText('DÍA', leftPad, top);
  ctx.textAlign = 'center';
  ctx.fillText('COMIDA', comidaX + mealW / 2, top);
  ctx.fillText('CENA', cenaX + mealW / 2, top);

  // Línea decorativa
  ctx.strokeStyle = '#f59e0b';
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftPad, top + 18);
  ctx.lineTo(W - leftPad, top + 18);
  ctx.stroke();
  ctx.setLineDash([]);

  const rowStart = top + 40;
  const rowH = 165;
  const days = week.days;

  days.forEach((d, idx) => {
    const y = rowStart + idx * rowH;

    // Alternar fondo suave
    if (idx % 2 === 0) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.fillRect(leftPad - 8, y - 28, W - leftPad * 2 + 16, rowH - 10);
    }

    const lunch = d.isFreeDay
      ? '🎉 Día libre'
      : d.meals.lunch.recipeName || d.meals.lunch.items.map((i) => i.name).join(', ');
    const dinner = d.isFreeDay
      ? '🎉 Día libre'
      : d.meals.dinner.recipeName || d.meals.dinner.items.map((i) => i.name).join(', ');

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 28px system-ui, Segoe UI, sans-serif';
    ctx.fillText(d.dayLabel, leftPad, y + 10);

    ctx.fillStyle = '#334155';
    ctx.font = '500 22px system-ui, Segoe UI, sans-serif';
    const lunchLines = wrapText(ctx, lunch, mealW - 24).slice(0, 4);
    const dinnerLines = wrapText(ctx, dinner, mealW - 24).slice(0, 4);

    lunchLines.forEach((line, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(line, comidaX + mealW / 2, y + 10 + i * 28);
    });
    dinnerLines.forEach((line, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(line, cenaX + mealW / 2, y + 10 + i * 28);
    });

    // Separador punteado
    ctx.strokeStyle = '#fcd34d';
    ctx.setLineDash([4, 10]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftPad, y + rowH - 35);
    ctx.lineTo(W - leftPad, y + rowH - 35);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Pie
  const footerY = H - 110;
  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(0, footerY - 30, W, H - (footerY - 30));

  drawLeaf(ctx, 90, H - 55, 1.6, '#86efac');
  drawLeaf(ctx, 990, H - 70, 1.4, '#6ee7b7');
  drawPepper(ctx, 160, H - 40, 1.1);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#047857';
  ctx.font = '800 32px system-ui, Segoe UI, sans-serif';
  ctx.fillText('Mi Gordólogo', W / 2, footerY + 20);
  ctx.font = '500 22px system-ui, Segoe UI, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Adelgaza sin comer · Pauta 1.500 kcal', W / 2, footerY + 55);

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
