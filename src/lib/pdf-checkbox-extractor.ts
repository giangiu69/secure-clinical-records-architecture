/**
 * PDF Checkbox Extractor
 *
 * Estrae dal PDF presenze "professionisti_MM-AA.pdf" (tabella grafica
 * senza layer testo) le righe deterministicamente, leggendo la checkbox
 * spuntata via sampling pixel sul canvas renderizzato.
 *
 * Pipeline:
 *  1. Rendering pagina a scala alta (Canvas2D)
 *  2. Tesseract.js con bbox a livello word
 *  3. Localizza l'header (riga "Data N. ore Cod. utente ...")
 *  4. Cluster delle word header per X-center → 12 colonne tipologia
 *  5. Per ogni data row (riga con dd/MM/yyyy):
 *     - estrae data, ore, nome utente, parente, info aggiuntive
 *     - per ogni colonna checkbox: sample pixel density nel rettangolo cella
 *     - se density > threshold → checkbox spuntata
 *  6. Emette RawPresenceEntry con codpres deterministico (dalla colonna).
 *
 * Output: array di entry pronte per la pipeline aggregazione di PDFImporter.
 */

import type { RawPresenceEntry } from './pdfParser';
import {
  COLUMN_SPECS,
  matchColumnSpec,
  type ColumnSpec,
  type CodicePrestazioneType,
} from './pdf-column-codpres-map';

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrLine {
  words: OcrWord[];
  y: number; // centro Y
  text: string;
  x0: number;
  x1: number;
}

interface DetectedColumn {
  spec: ColumnSpec;
  xCenter: number;
  xLeft: number;
  xRight: number;
}

/** Indica se l'extractor checkbox è applicabile (PDF immagine). */
export function shouldUseCheckboxExtractor(nativeTextLength: number): boolean {
  // PDF graficamente generati (zero/quasi-zero testo nativo) sono il caso target
  return nativeTextLength < 200;
}

/** Renderizza una pagina pdfjs su canvas e restituisce {canvas, ctx, scale}. */
async function renderPageToCanvas(page: any, targetWidth = 2400): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
}> {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(3.5, Math.max(2, targetWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { canvas, ctx, scale };
}

/** Estrae word bbox usando Tesseract.js (v6/v7 compatibile). */
async function runTesseractWords(canvas: HTMLCanvasElement): Promise<OcrWord[]> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('ita');
  try {
    const result: any = await worker.recognize(canvas, {}, { blocks: true });
    const words: OcrWord[] = [];

    const pushWord = (w: any) => {
      if (!w?.text || !w?.bbox) return;
      words.push({
        text: String(w.text),
        bbox: {
          x0: w.bbox.x0 ?? 0,
          y0: w.bbox.y0 ?? 0,
          x1: w.bbox.x1 ?? 0,
          y1: w.bbox.y1 ?? 0,
        },
      });
    };

    // Path 1: result.data.blocks (v7 con { blocks: true })
    const blocks = result?.data?.blocks ?? [];
    for (const block of blocks) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          for (const w of line.words ?? []) pushWord(w);
        }
      }
    }
    // Path 2 (fallback): result.data.words flat array
    if (words.length === 0 && Array.isArray(result?.data?.words)) {
      for (const w of result.data.words) pushWord(w);
    }

    return words;
  } finally {
    await worker.terminate();
  }
}

/** Raggruppa word in righe per Y-center (tolerance dinamica). */
function groupWordsIntoLines(words: OcrWord[], yTolerance: number): OcrLine[] {
  if (words.length === 0) return [];
  const sorted = [...words].sort(
    (a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2,
  );
  const lines: OcrLine[] = [];
  for (const w of sorted) {
    const yc = (w.bbox.y0 + w.bbox.y1) / 2;
    const last = lines[lines.length - 1];
    if (last && Math.abs(yc - last.y) <= yTolerance) {
      last.words.push(w);
      last.y = (last.y * (last.words.length - 1) + yc) / last.words.length;
    } else {
      lines.push({ words: [w], y: yc, text: '', x0: 0, x1: 0 });
    }
  }
  for (const ln of lines) {
    ln.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    ln.text = ln.words.map(w => w.text).join(' ');
    ln.x0 = Math.min(...ln.words.map(w => w.bbox.x0));
    ln.x1 = Math.max(...ln.words.map(w => w.bbox.x1));
  }
  return lines;
}

/** Trova le righe header (Data, N. ore, Cod. utente, + 12 tipologie). */
function findHeaderLines(lines: OcrLine[]): { headerYTop: number; headerYBot: number; headerWords: OcrWord[] } | null {
  // Trova la linea che contiene "Data" + "ore" + ("utente" o "Cod") — ancora dell'header
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text.toLowerCase();
    if (/\bdata\b/.test(t) && /\bore\b/.test(t) && /utente|cod\./.test(t)) {
      // Header può espandersi su 2-3 righe sopra/dopo (es. "Supp." / "Psicolog.")
      const yc = lines[i].y;
      const span = (lines[i].words[0]?.bbox.y1 ?? 0) - (lines[i].words[0]?.bbox.y0 ?? 0);
      const yMin = yc - span * 4;
      const yMax = yc + span * 4;
      const headerWords: OcrWord[] = [];
      for (const ln of lines) {
        const lyc = ln.y;
        if (lyc >= yMin && lyc <= yMax) headerWords.push(...ln.words);
      }
      return { headerYTop: yMin, headerYBot: yMax, headerWords };
    }
  }
  return null;
}

/**
 * Dai word header costruisce le colonne checkbox.
 * Strategia: per ogni ColumnSpec, trova le keyword nei word header,
 * usa la X-center mediana dei word matching come xCenter colonna.
 * Le boundary destra/sinistra le derivo dalle X-center adiacenti.
 */
function detectColumns(headerWords: OcrWord[], canvasWidth: number): DetectedColumn[] {
  const lower = headerWords.map(w => ({ ...w, text: w.text.toLowerCase().replace(/[.,:]/g, '') }));
  const candidates: { spec: ColumnSpec; xCenter: number }[] = [];

  for (const spec of COLUMN_SPECS) {
    // Cerca uno qualunque dei keyword più discriminanti
    const discrim = spec.keywords[spec.keywords.length - 1];
    const matches = lower.filter(w => w.text.includes(discrim));
    if (matches.length === 0) continue;
    // Prendi il match più "vicino" agli altri keyword della spec
    let best = matches[0];
    if (spec.keywords.length > 1 && matches.length > 1) {
      // Usa il match più a destra (le colonne procedono left→right e i keyword
      // tipo "supp" si ripetono — il discrim è quello che fissa la posizione)
      best = matches.reduce((a, b) =>
        (a.bbox.x0 + a.bbox.x1) / 2 > (b.bbox.x0 + b.bbox.x1) / 2 ? a : b,
      );
    }
    const xCenter = (best.bbox.x0 + best.bbox.x1) / 2;
    candidates.push({ spec, xCenter });
  }

  // Ordina per X e calcola boundary mid-point fra colonne adiacenti
  candidates.sort((a, b) => a.xCenter - b.xCenter);
  const detected: DetectedColumn[] = candidates.map((c, i) => {
    const prevX = i === 0 ? Math.max(0, c.xCenter - 60) : (c.xCenter + candidates[i - 1].xCenter) / 2;
    const nextX = i === candidates.length - 1
      ? Math.min(canvasWidth, c.xCenter + 60)
      : (c.xCenter + candidates[i + 1].xCenter) / 2;
    return { spec: c.spec, xCenter: c.xCenter, xLeft: prevX, xRight: nextX };
  });

  return detected;
}

/** Determina se una zona del canvas è "spuntata" via density pixel scuri. */
function isCellChecked(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (w < 4 || h < 4) return false;
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.min(ctx.canvas.width - ix, Math.ceil(w));
  const ih = Math.min(ctx.canvas.height - iy, Math.ceil(h));
  if (iw <= 0 || ih <= 0) return false;

  const img = ctx.getImageData(ix, iy, iw, ih).data;
  let dark = 0;
  const total = iw * ih;
  for (let p = 0; p < img.length; p += 4) {
    // grayscale rapido
    const lum = 0.299 * img[p] + 0.587 * img[p + 1] + 0.114 * img[p + 2];
    if (lum < 130) dark++;
  }
  const density = dark / total;
  // soglia: cella vuota ha density molto bassa (solo bordi), checkbox piena
  // tipicamente > 0.04
  return density > 0.035;
}

const DATE_RE = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
const HOURS_RE = /^(\d+)([hH])?$/;
const REMOTE_RE = /\b(da\s+)?remoto\b/i;

/** Estrae entry dalla pagina. */
async function extractPageEntries(
  page: any,
): Promise<RawPresenceEntry[]> {
  const { canvas, ctx } = await renderPageToCanvas(page);
  const words = await runTesseractWords(canvas);
  if (words.length === 0) {
    canvas.width = 0; canvas.height = 0;
    return [];
  }

  // Tolerance Y dinamica: ~50% altezza word media
  const avgH = words.reduce((s, w) => s + (w.bbox.y1 - w.bbox.y0), 0) / words.length;
  const yTol = Math.max(6, avgH * 0.6);
  const lines = groupWordsIntoLines(words, yTol);

  const header = findHeaderLines(lines);
  if (!header) {
    canvas.width = 0; canvas.height = 0;
    return [];
  }

  const cols = detectColumns(header.headerWords, canvas.width);
  if (cols.length < 6) {
    // Header non rilevato in modo affidabile
    canvas.width = 0; canvas.height = 0;
    return [];
  }

  // Trova "Info aggiuntive" X start (per delimitare a destra l'ultima checkbox)
  const infoWord = header.headerWords.find(w => /info|aggiuntive/i.test(w.text));
  const infoXStart = infoWord ? infoWord.bbox.x0 : canvas.width;

  // Righe dati: linee dopo headerYBot che iniziano con una data
  const dataLines = lines.filter(ln => ln.y > header.headerYBot && DATE_RE.test(ln.text));

  const entries: RawPresenceEntry[] = [];
  for (const ln of dataLines) {
    const m = ln.text.match(DATE_RE);
    if (!m) continue;
    const date = `${m[3]}-${m[2]}-${m[1]}`;

    // Ore: cerca token tipo "1h", "2h", "1", "2"
    let hours = 1;
    const hToken = ln.words.find(w => HOURS_RE.test(w.text.replace(/[Oo]/g, '0')));
    if (hToken) {
      const mm = hToken.text.replace(/[Oo]/g, '0').match(HOURS_RE);
      if (mm) hours = parseInt(mm[1], 10);
    }

    // Riga Y bounds (per pixel sampling)
    const yTop = Math.min(...ln.words.map(w => w.bbox.y0)) - 2;
    const yBot = Math.max(...ln.words.map(w => w.bbox.y1)) + 2;
    const rowH = Math.max(8, yBot - yTop);

    // Nome utente: word tra la fine "Cod. utente" e la prima checkbox column
    const firstCol = cols[0];
    const cogXStart = (header.headerWords.find(w => /utente|parente/i.test(w.text))?.bbox.x0 ?? 0) + 5;
    const cogXEnd = firstCol.xLeft - 5;
    const nameWords = ln.words.filter(w => {
      const xc = (w.bbox.x0 + w.bbox.x1) / 2;
      return xc > cogXStart && xc < cogXEnd && !DATE_RE.test(w.text) && !HOURS_RE.test(w.text);
    });
    const patientName = nameWords.map(w => w.text).join(' ').replace(/[0-9]/g, '').trim();
    if (patientName.length < 3) continue;

    // Info aggiuntive: word a destra dell'ultima col checkbox
    const lastCol = cols[cols.length - 1];
    const infoWords = ln.words.filter(w => (w.bbox.x0 + w.bbox.x1) / 2 > Math.max(lastCol.xRight, infoXStart - 10));
    const infoText = infoWords.map(w => w.text).join(' ');
    const isRemote = REMOTE_RE.test(infoText);

    // Per ogni colonna checkbox importabile: sample pixel
    let matchedSpec: ColumnSpec | null = null;
    for (const col of cols) {
      // Cella: rettangolo (xLeft+pad, yTop) → (xRight-pad, yBot)
      const padX = Math.min(8, (col.xRight - col.xLeft) * 0.15);
      const cellX = col.xLeft + padX;
      const cellW = (col.xRight - col.xLeft) - padX * 2;
      if (isCellChecked(ctx, cellX, yTop, cellW, rowH)) {
        // Prima checkbox trovata vince (confermato: una sola checkbox per riga)
        matchedSpec = col.spec;
        break;
      }
    }

    if (!matchedSpec) {
      console.log(`[CheckboxExtractor] ${date} ${patientName}: nessuna checkbox rilevata → scarta`);
      continue;
    }

    if (matchedSpec.codpres === null) {
      console.log(`[CheckboxExtractor] ${date} ${patientName}: colonna "${matchedSpec.label}" (non sanitaria) → scarta`);
      continue;
    }

    entries.push({
      date,
      hours,
      patientName,
      activityText: matchedSpec.label,
      isRemote,
      hasValutazione: matchedSpec.isValutazione === true,
      valutazioneDate: matchedSpec.isValutazione ? date : undefined,
      // estensione: codpres deterministico
      codpres: matchedSpec.codpres,
    } as RawPresenceEntry & { codpres: CodicePrestazioneType });
  }

  canvas.width = 0;
  canvas.height = 0;
  return entries;
}

/**
 * Estrae tutte le entry dal PDF usando il rilevamento checkbox per colonna.
 * Ritorna array vuoto se il formato non è riconosciuto (header non trovato in nessuna pagina).
 */
export async function extractCheckboxEntries(pdf: any): Promise<RawPresenceEntry[]> {
  const all: RawPresenceEntry[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const entries = await extractPageEntries(page);
      console.log(`[CheckboxExtractor] Pagina ${i}/${pdf.numPages}: ${entries.length} entry`);
      all.push(...entries);
    } catch (err) {
      console.error(`[CheckboxExtractor] Errore pagina ${i}:`, err);
    }
  }
  console.log(`[CheckboxExtractor] Totale entry estratte: ${all.length}`);
  return all;
}
