import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdfText(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(doc.numPages, 20);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (line) pages.push(`--- Página ${i} ---\n${line}`);
  }
  const text = pages.join('\n\n').trim();
  if (text.length < 40) {
    throw new Error('No he podido leer texto de ese PDF. Prueba uno no escaneado, o más nítido.');
  }
  return text.slice(0, 24000);
}
