import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

function itemText(item: unknown): string {
  if (item && typeof item === 'object' && 'str' in item) {
    return String((item as { str: unknown }).str || '');
  }
  return '';
}

export async function extractPdfText(file: File): Promise<string> {
  if (!file || file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    throw new Error('Elige un archivo PDF.');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  if (data.length < 8) {
    throw new Error('Ese PDF está vacío o dañado.');
  }

  let doc;
  try {
    doc = await getDocument({
      data,
      useSystemFonts: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableAutoFetch: true,
      disableStream: true,
    }).promise;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      /password|encrypted/i.test(msg)
        ? 'Ese PDF está protegido con contraseña.'
        : 'No he podido abrir ese PDF. Prueba uno con texto seleccionable (no solo foto escaneada).'
    );
  }

  try {
    const pages: string[] = [];
    const maxPages = Math.min(doc.numPages || 0, 20);
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = Array.isArray(content?.items) ? content.items : [];
      const line = items
        .map(itemText)
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
  } finally {
    try {
      await doc.destroy();
    } catch {
      /* ignore */
    }
  }
}
