import fs from 'fs';

const b = fs.readFileSync('public/logo.jpg').toString('base64');
const out = `/** logo.jpg embebido para canvas (sin depender de la ruta en runtime). */\nexport const LOGO_JPG_DATA_URL =\n  'data:image/jpeg;base64,${b}';\n`;
fs.writeFileSync('src/domain/services/logoJpgDataUrl.ts', out);
console.log('embedded logo.jpg', b.length, 'chars');
