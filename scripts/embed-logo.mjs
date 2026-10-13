import fs from 'fs';

const b = fs.readFileSync('public/logo-mark.png').toString('base64');
const out = `/** PNG del icono Mi Gordólogo embebido (canvas-safe, sin depender del SVG). */\nexport const LOGO_MARK_DATA_URL =\n  'data:image/png;base64,${b}';\n`;
fs.writeFileSync('src/domain/services/logoMarkDataUrl.ts', out);
console.log('embedded', b.length, 'chars');
