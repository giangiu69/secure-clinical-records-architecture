/**
 * Excel Parser for SPR Import Pipeline
 * Parses "numero prestazioni" column and calculates tariffs
 * Supports dynamic column mapping and smart fill from CF
 */

import { roundFinancial } from "./financial-utils";
import { parseCodiceFiscale as parseCF } from "./cf-parser";
import { initDizionari, searchComuniByNome, findAslByComune, findBestFuzzyMatch } from "./dizionari-territoriali";

// Tariffe Regionali Toscana
export const TARIFFE = {
  AC: 54.25, // Ambulatoriale Complessa (417.1)
  AA: 44.90, // Ambulatoriale Altro (405.1)
};

/**
 * Calcola importo prestazione (tariffa unica, nessuno sconto remoto)
 * @param codpres - Codice prestazione (417.1 o 405.1)
 * @param totalHours - Ore totali (remote + in presenza)
 * @returns { tariffa, importo }
 */
export function calculateImporto(
  codpres: string,
  totalHours: number
): { tariffa: number; importo: number } {
  const tariffa = codpres === '417.1' ? TARIFFE.AC : TARIFFE.AA;
  const importo = roundFinancial(tariffa * totalHours, 2);
  return { tariffa, importo };
}

/**
 * Determina tipoindu dal formato IDutente
 * @param idUtente - Codice Fiscale, STP o ENI
 * @returns "1" (CF standard), "3" (STP numerico), "5" (ENI)
 */
export function determineTipoindu(idUtente: string | undefined): string {
  if (!idUtente || idUtente.trim() === '') return '1';
  
  const cleaned = idUtente.trim().toUpperCase();
  
  // ENI: inizia con "ENI"
  if (cleaned.startsWith('ENI')) return '5';
  
  // STP: solo numerico
  if (/^\d+$/.test(cleaned)) return '3';
  
  // CF standard italiano (16 char alfanumerici)
  if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cleaned)) return '1';
  
  // Default
  return '1';
}

export interface ParsedPrestazione {
  codice: string;           // "417.1" o "405.1"
  quantitaOre: number;      // Es. 6, 12, 34
  tariffa: number;          // 54.25 o 44.90
  durataMinuti: number;     // quantitaOre * 60
  importo: number;          // tariffa * quantitaOre
}

export interface ExcelRowData {
  nomeCognome?: string;
  codiceFiscale?: string;
  dataNascita?: string;
  numeroPrestazioni?: string;
  tipologiaPrestazione?: string;
  genere?: string;
  residenza?: string;
  specifica?: string;
  [key: string]: string | undefined;
}

export interface ImportedPatient {
  codiceFiscale: string;
  cognome: string;
  nome: string;
  dataNascita?: string;
  genere?: string;
  lures?: string;
  regresu?: string;
  uslresu?: string;
  tipoindu?: string;
  _excelTipologia?: string;
  _excelSpecifica?: string;
  _dataPIC?: string;       // NUOVO: data presa in carico da Excel
  codiceMalattia?: string;   // ICD9-CM dalla colonna "CODICE MALATTIA"
  codiceEsenzione?: string;  // Codice esenzione dalla colonna "codice esenzione"
  gradiDisabilita?: string;  // Gradi disabilità dalla colonna "gradi disabilita"
  totalOre: number;
  totalImporto: number;
  codpres: string;
  prestazioni: ParsedPrestazione[];
}

// ==================== COLUMN PATTERN MATCHING ====================

/**
 * Patterns for dynamic column detection (case-insensitive)
 */
export const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  codiceFiscale: [/codice.*fiscale/i, /c\.?f\.?$/i, /^cf$/i],
  dataNascita: [/data.*nascita/i, /data\s*di\s*nascita/i],
  genere: [/^genere$/i, /^sesso$/i],
  residenza: [/^residenza$/i, /comune.*residenza/i],
  tipologia: [/tipologia.*prest/i, /^tipologia$/i],
  specifica: [/specifica.*prest/i, /^specifica$/i],
  // Pattern specifici per "Numero prestazioni / 6 mesi" - RIMOSSO /ore/i troppo generico
  prestazioni: [/numero.*prest/i, /n[°.]?\s*prest/i, /prest.*mesi/i, /6\s*mesi/i],
  nomeCognome: [/^gca$/i, /nome.*cognome/i, /cognome.*nome/i, /nominativo/i],
  // NUOVO: Pattern per data presa in carico
  dataPIC: [/data.*presa.*carico/i, /data.*pic/i, /presa.*carico/i, /inizio.*percorso/i],
  // Nuove colonne dal file aggiornato
  codiceMalattia: [/codice\s*malattia/i, /icd.*9/i],
  codiceEsenzione: [/codice\s*esenzione/i, /esenzione/i],
  gradiDisabilita: [/gradi\s*disabilit/i, /disabilit/i],
  familiare: [/^familiare$/i, /caregiver/i, /^parente$/i],
};

/**
 * Find column index by matching patterns against headers
 */
export function findColumnByPatterns(
  headers: string[], 
  patterns: RegExp[]
): number {
  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').toString().trim();
    for (const pattern of patterns) {
      if (pattern.test(header)) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Build column index map from headers
 */
export function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const idx = findColumnByPatterns(headers, patterns);
    if (idx !== -1) {
      map[key] = idx;
    }
  }
  return map;
}

// ==================== DATA PARSING ====================

/**
 * Estrae il codice fiscale da una stringa
 * Regex standard: 16 caratteri alfanumerici
 */
export function extractCodiceFiscale(value: string | undefined): string | null {
  if (!value) return null;
  
  // Rimuovi spazi e caratteri non alfanumerici
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Regex CF italiano
  const cfRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  
  if (cfRegex.test(cleaned)) {
    return cleaned;
  }
  
  // Cerca un CF all'interno di una stringa più lunga
  const match = cleaned.match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/);
  return match ? match[0] : null;
}

/**
 * Parse genere from Excel value
 * Handles: "M", "F", "Maschio", "Femmina", "1", "2"
 */
export function parseGenere(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.toString().trim().toUpperCase();
  if (v === 'M' || v === 'MASCHIO') return '1';
  if (v === 'F' || v === 'FEMMINA') return '2';
  if (v === '1' || v === '2') return v;
  return null;
}

/**
 * Estrae il nome del comune da un indirizzo completo
 * Pattern migliorati per gestire formati senza punteggiatura standard:
 * - "via XYZ, 123. COMUNE (PROV)" → "COMUNE"
 * - "via XYZ, 123 COMUNE" → "COMUNE"
 * - "Via Roma 45 Firenze" → "Firenze"
 * - "FIRENZE" → "FIRENZE"
 */
/**
 * Mappa abbreviazioni comuni toscani → nome completo per dizionario
 */
const COMUNE_ABBREVIATIONS: Record<string, string> = {
  "sesto f.no": "Sesto Fiorentino",
  "sesto fiorentino": "Sesto Fiorentino",
  "figline e incisa v.no": "Figline e Incisa Valdarno",
  "figline incisa v.no": "Figline e Incisa Valdarno",
  "laterina pergine v.no": "Laterina Pergine Valdarno",
  "laterina pergine valdarno": "Laterina Pergine Valdarno",
  "campi b.zio": "Campi Bisenzio",
  "campi bisenzio": "Campi Bisenzio",
  "reggello": "Reggello",
  "bagno a ripoli": "Bagno a Ripoli",
  "san casciano val di pesa": "San Casciano in Val di Pesa",
  "san casciano v.p.": "San Casciano in Val di Pesa",
  "greve in chianti": "Greve in Chianti",
  "barberino di mugello": "Barberino di Mugello",
  "barberino tavarnelle": "Barberino Tavarnelle",
  "borgo san lorenzo": "Borgo San Lorenzo",
  "castelfiorentino": "Castelfiorentino",
  "cerreto guidi": "Cerreto Guidi",
  "certaldo": "Certaldo",
  "montelupo f.no": "Montelupo Fiorentino",
  "pontassieve": "Pontassieve",
  "rignano sull'arno": "Rignano sull'Arno",
  "scandicci": "Scandicci",
  "signa": "Signa",
  "lastra a signa": "Lastra a Signa",
  "calenzano": "Calenzano",
  "fiesole": "Fiesole",
  "impruneta": "Impruneta",
  "incisa in val d'arno": "Figline e Incisa Valdarno",
  "terranuova b.ni": "Terranuova Bracciolini",
  "terranuova bracciolini": "Terranuova Bracciolini",
  "montevarchi": "Montevarchi",
  "san giovanni v.no": "San Giovanni Valdarno",
  "san giovanni valdarno": "San Giovanni Valdarno",
};

/**
 * Estrae il nome del comune da un indirizzo completo.
 * Strategia: prima prova a riconoscere abbreviazioni note,
 * poi usa pattern di separazione per isolare la parte "città".
 * 
 * Gestisce:
 * - "via XYZ, 123. Comune (PROV)" 
 * - "via XYZ 123 Comune"
 * - "via XYZ, 123- Comune"
 * - Abbreviazioni come "F.no", "V.no"
 */
export function extractComuneFromAddress(address: string): string | null {
  if (!address || address.trim() === '') return null;
  
  const trimmed = address.trim();
  
  // Helper: rimuove contenuto parentetico finale es. "(FI)", "(Empoli?)"
  const stripParens = (s: string) => s.replace(/\s*\([^)]*\)\s*$/i, '').trim();
  // Helper: rimuove CAP (5 cifre)
  const stripCAP = (s: string) => s.replace(/\b\d{5}\b/g, '').trim();
  
  // Step 0: Controlla se l'indirizzo contiene un'abbreviazione nota
  const lowerAddr = trimmed.toLowerCase();
  for (const [abbr, fullName] of Object.entries(COMUNE_ABBREVIATIONS)) {
    if (lowerAddr.includes(abbr)) {
      return fullName;
    }
  }
  
  // Step 1: Rimuovi provincia tra parentesi e CAP
  let cleaned = stripParens(trimmed);
  cleaned = stripCAP(cleaned);
  
  // Step 2: Cerca punto separatore dopo numero civico
  // "via P. Metastasio, 14. Firenze" → dopo "14." c'è "Firenze"
  // Ma NON deve matchare "P." o "V." (abbreviazioni nome strada)
  // Strategia: cerca l'ULTIMO punto che è preceduto da digit o digit+lettera
  const allDotMatches = [...cleaned.matchAll(/(\d+[a-zA-Z]?)\.\s+([A-Za-zÀ-ÿ].*?)$/g)];
  if (allDotMatches.length > 0) {
    const lastMatch = allDotMatches[allDotMatches.length - 1];
    let afterDot = lastMatch[2].trim();
    afterDot = stripCAP(afterDot);
    afterDot = afterDot.replace(/,\s*$/, '').trim();
    if (afterDot.includes(',')) {
      const lastPart = afterDot.split(',').pop()?.trim();
      if (lastPart && lastPart.length > 2) return lastPart;
    }
    if (afterDot.length > 2) return afterDot;
  }
  
  // Step 2b: Punto separatore generico (dopo qualsiasi contenuto, ma non abbreviazioni)
  // Cerca punto seguito da spazio e parola di almeno 3+ lettere (non "F.no", "V.no")
  const genericDotMatch = cleaned.match(/\.\s+([A-Za-zÀ-ÿ]{3,}[\sA-Za-zÀ-ÿ']*)$/);
  if (genericDotMatch) {
    let afterDot = genericDotMatch[1].trim();
    afterDot = stripCAP(afterDot);
    if (afterDot.length > 2) return afterDot;
  }
  
  // Step 3: Cerca dopo trattino separatore ("3C- Firenze")
  const dashMatch = cleaned.match(/[-–]\s+([A-Za-zÀ-ÿ].+)$/);
  if (dashMatch) {
    const afterDash = stripCAP(dashMatch[1].trim());
    if (afterDash.length > 2) return afterDash;
  }
  
  // Step 4: Cerca dopo numero civico (con o senza virgola)
  // "VIA DI MANTIGNANO 160/7 FIRENZE" → "FIRENZE"
  // "via Zanobi da Strada 1 firenze 50126" → "firenze"
  // "via della sala 1/c 50145 Firenze" → "Firenze"
  // Pattern: numero civico, poi opzionale CAP, poi città (case-insensitive)
  const civicPattern = /\d+(?:\/\d+|\/[a-zA-Z]|[a-zA-Z])?\s*[,]?\s+(?:\d{5}\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\s]*?)(?:\s+\d{5})?$/;
  const civicMatch = cleaned.match(civicPattern);
  if (civicMatch) {
    let candidate = civicMatch[1].trim();
    candidate = stripCAP(candidate);
    candidate = candidate.replace(/,\s*$/, '').trim();
    if (!/^(via|viale|piazza|piazzale|corso|largo|vicolo|strada)/i.test(candidate) && candidate.length > 2) {
      return candidate;
    }
  }
  
  // Step 5: Se non ci sono separatori, l'intero valore potrebbe essere il comune
  if (!trimmed.includes(',') && !trimmed.includes('.') && /^[A-Za-zÀ-ÿ\s']+$/.test(trimmed)) {
    return trimmed;
  }
  
  // Step 6: Fallback - ultima parte dopo virgola
  const parts = cleaned.split(',');
  if (parts.length >= 2) {
    let lastPart = parts[parts.length - 1].trim();
    lastPart = stripCAP(lastPart);
    lastPart = lastPart.replace(/^\d+\s*/g, '').trim();
    if (lastPart.length > 2) return lastPart;
  }
  
  return null;
}

export interface ResidenzaResult {
  lures: string;
  regresu: string;
  uslresu: string;
  fuzzyMatch?: {
    originalTerm: string;
    matchedName: string;
    similarity: number;
  };
}

/**
 * Parse residenza (comune name) and resolve to territorial codes
 * Handles full addresses like "via XYZ, 123. Firenze (FI)"
 * Returns { lures, regresu, uslresu, fuzzyMatch? } or null
 * 
 * fuzzyMatch è presente quando il match non è esatto (similarity < 100)
 */
export async function parseResidenza(value: string | undefined): Promise<ResidenzaResult | null> {
  if (!value || value.trim() === '') return null;
  
  await initDizionari();
  
  // Prima prova a estrarre il comune dall'indirizzo completo
  const comuneFromAddress = extractComuneFromAddress(value);
  const searchTerm = comuneFromAddress || value.trim();
  
  // Cerca comune per nome (case-insensitive, match esatto o parziale)
  const matches = searchComuniByNome(searchTerm, undefined, 5);
  
  if (matches.length > 0) {
    // Preferisci match esatto se disponibile
    const exactMatch = matches.find(m => 
      m.nome.toLowerCase() === searchTerm.toLowerCase()
    );
    const comune = exactMatch || matches[0];
    const asl = findAslByComune(comune.codiceIstat);
    
    return {
      lures: comune.codiceIstat,
      regresu: comune.codiceRegione,
      uslresu: asl || '999',
    };
  }
  
  // Fallback: prova a cercare rimuovendo "COMUNE DI", "CITTA' DI", etc.
  const cleanedTerm = searchTerm
    .replace(/^(COMUNE|CITTA'?|MUNICIPIO)\s+(DI\s+)?/i, '')
    .trim();
  
  if (cleanedTerm !== searchTerm) {
    const fallbackMatches = searchComuniByNome(cleanedTerm, undefined, 5);
    if (fallbackMatches.length > 0) {
      const comune = fallbackMatches[0];
      const asl = findAslByComune(comune.codiceIstat);
      return {
        lures: comune.codiceIstat,
        regresu: comune.codiceRegione,
        uslresu: asl || '999',
      };
    }
  }
  
  // NUOVO: Fuzzy matching come ultimo tentativo
  // Cerca il comune più simile con soglia minima 70%
  const fuzzyResult = findBestFuzzyMatch(searchTerm, undefined, 70);
  
  if (fuzzyResult) {
    const asl = findAslByComune(fuzzyResult.comune.codiceIstat);
    return {
      lures: fuzzyResult.comune.codiceIstat,
      regresu: fuzzyResult.comune.codiceRegione,
      uslresu: asl || '999',
      fuzzyMatch: {
        originalTerm: searchTerm,
        matchedName: fuzzyResult.comune.nome,
        similarity: fuzzyResult.similarity,
      },
    };
  }
  
  return null;
}

/**
 * Parsa la colonna "numero prestazioni / 6 mesi"
 * Pattern SPECIFICO: (417.1|405.1) x N
 * Esempi: "417.1x 6", "417.1x4; 417.1x34; 405.1x6"
 * 
 * Regole Tariffe:
 * - 417.1 → €54.25 (AC - Ambulatoriale Complessa)
 * - 405.1 → €44.90 (AA - Ambulatoriale Altro)
 */
export function parsePrestazioni(numeroPrestazioni: string | undefined): ParsedPrestazione[] {
  if (!numeroPrestazioni || numeroPrestazioni.trim() === '') {
    return [];
  }
  
  const results: ParsedPrestazione[] = [];
  const testo = numeroPrestazioni.trim();
  
  // Pattern SPECIFICO: cattura SOLO 417.1 o 405.1 seguiti da x N
  const PRESTAZIONI_REGEX = /(417\.1|405\.1)\s*x\s*(\d+)/gi;
  
  let match;
  let hasSpecificMatch = false;
  while ((match = PRESTAZIONI_REGEX.exec(testo)) !== null) {
    hasSpecificMatch = true;
    const codice = match[1];                    // "417.1" o "405.1"
    const quantita = parseInt(match[2], 10);    // N ore
    
    if (isNaN(quantita) || quantita <= 0) continue;
    
    // Determina tariffa dal codice
    const tariffa = codice === '417.1' ? TARIFFE.AC : TARIFFE.AA;
    
    const durataMinuti = quantita * 60;
    const importo = roundFinancial(tariffa * quantita, 2);
    
    results.push({
      codice,
      quantitaOre: quantita,
      tariffa,
      durataMinuti,
      importo,
    });
  }
  
  // Fallback: se il testo è un numero puro (es. "6", "12"), 
  // interpretalo come ore con codice default 417.1 (AC)
  if (!hasSpecificMatch) {
    const bareNumber = parseInt(testo.replace(/\s/g, ''), 10);
    if (!isNaN(bareNumber) && bareNumber > 0 && bareNumber <= 999) {
      const tariffa = TARIFFE.AC; // Default: 417.1
      const durataMinuti = bareNumber * 60;
      const importo = roundFinancial(tariffa * bareNumber, 2);
      
      results.push({
        codice: '417.1',
        quantitaOre: bareNumber,
        tariffa,
        durataMinuti,
        importo,
      });
    }
  }
  
  return results;
}

/**
 * Parsa nome e cognome da una stringa unica
 * Formati supportati: "Cognome Nome" o "COGNOME NOME"
 */
export function parseNomeCognome(value: string | undefined): { cognome: string; nome: string } {
  if (!value || value.trim() === '') {
    return { cognome: '', nome: '' };
  }
  
  const parts = value.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { cognome: parts[0], nome: '' };
  }
  
  // Assume primo elemento = cognome, resto = nome
  const cognome = parts[0];
  const nome = parts.slice(1).join(' ');
  
  return { cognome, nome };
}

// ==================== NUOVE FUNZIONI: PULIZIA NOME E NORMALIZZAZIONE ====================

/**
 * Pulisce il nome del paziente rimuovendo parti del nome familiare se mescolate.
 * Es. se il campo nome contiene "Rossi Mario Anna" e il familiare è "Rossi Anna: Madre",
 * rimuove "Anna" dal nome paziente → { cognome: "Rossi", nome: "Mario" }
 */
export function cleanPatientName(
  fullName: string,
  familiareValue: string | undefined
): { cognome: string; nome: string } {
  const base = parseNomeCognome(fullName);
  
  if (!familiareValue || familiareValue.trim() === '') {
    return base;
  }
  
  // Estrai nome familiare dalla stringa (es. "Suisola Fabiola: Madre" → "Suisola Fabiola")
  const familiareName = familiareValue.split(':')[0].trim();
  
  if (!familiareName) return base;
  
  // Ottieni le parti del nome familiare
  const familiareParts = familiareName.toLowerCase().split(/\s+/);
  
  // Ricostruisci il nome completo del paziente e filtra
  const fullParts = fullName.trim().split(/\s+/);
  
  // Identifica quali parti sono del familiare e non del paziente
  // Strategia: il cognome (prima parola) è condiviso, le parole successive
  // che appaiono nel nome familiare ma non sono la prima parola del paziente vanno rimosse
  const patientParts = fullParts.filter((part, idx) => {
    const partLower = part.toLowerCase();
    // Mantieni sempre la prima parola (cognome condiviso)
    if (idx === 0) return true;
    // Rimuovi solo se la parola è presente nel nome familiare (non nel cognome condiviso)
    // e non è il cognome stesso
    const isInFamiliare = familiareParts.slice(1).includes(partLower);
    return !isInFamiliare;
  });
  
  if (patientParts.length === 0) return base;
  if (patientParts.length === 1) return { cognome: patientParts[0], nome: '' };
  
  return {
    cognome: patientParts[0],
    nome: patientParts.slice(1).join(' '),
  };
}

/**
 * Normalizza codice ICD9-CM per formato GAUSS (5 byte).
 * Regola GAUSS (SIAR_PIC): se lunghezza > 3, in 4ª posizione deve esserci il ".".
 * Es. "V17.1" → "V17.1", "310.2" → "310.2", "4109" → "410.9", "676.0" → "676.0",
 *     "434"   → "434  ", "43491" → "434.9" (tronca eccedenza).
 */
export function normalizeICD9(value: string | undefined): string {
  if (!value || value.trim() === '') return '';

  // Rimuovi punti e altri separatori, mantieni solo alfanumerici, uppercase
  const raw = value.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (raw.length === 0) return '';

  // Se length ≤ 3, padda con spazi a destra a 5 char
  if (raw.length <= 3) return raw.padEnd(5, ' ');

  // length > 3 → inserisci punto in 4ª posizione (tra i primi 3 e i restanti)
  // poi tronca a 5 caratteri (limite campo GAUSS)
  const withDot = raw.substring(0, 3) + '.' + raw.substring(3);
  return withDot.substring(0, 5).padEnd(5, ' ');
}

/**
 * Normalizza codice esenzione per GAUSS.
 * - "non esente" / "NON ESENTE" → stringa vuota
 * - Valori multipli separati da spazio (es. "013 048"): prende il primo
 * - Trim e uppercase, max 6 caratteri
 */
export function normalizeEsenzione(value: string | undefined): string {
  if (!value || value.trim() === '') return '';
  
  const trimmed = value.trim();
  
  // Gestisci "non esente" e varianti (incluso "NONESE")
  if (/non\s*esent/i.test(trimmed) || /^NONESE?$/i.test(trimmed)) return '';
  
  // Se il valore è solo "0", trattalo come assente
  if (trimmed === '0') return '';
  
  // Se contiene spazi (valori multipli), prendi il primo
  const firstCode = trimmed.split(/\s+/)[0];
  
  // FIX: Rimuovi punti, trattini e caratteri non alfanumerici
  const cleaned = firstCode.replace(/[^A-Za-z0-9]/g, '');
  
  // Se dopo la pulizia è vuoto o "0", ritorna vuoto
  if (!cleaned || cleaned === '0') return '';
  
  // Uppercase e max 6 caratteri
  return cleaned.toUpperCase().substring(0, 6);
}

/**
 * Converte data Excel in formato ISO (YYYY-MM-DD)
 */
export function parseExcelDate(value: any): string | undefined {
  if (!value) return undefined;
  
  // Se è un oggetto Date (da cellDates: true)
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    if (y > 1900 && y < 2100) {
      return `${y}-${m}-${d}`;
    }
    return undefined;
  }
  
  // Se è un numero (serial date Excel)
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return undefined;
  }
  
  // Se è una stringa
  const str = String(value).trim();
  if (!str) return undefined;
  
  // Rifiuta stringhe di formato placeholder (es. "dd/MM/yyyy", "gg/mm/aaaa")
  if (/[a-zA-Z]{2,}/.test(str.replace(/[\/\-\.\s]/g, ''))) {
    console.warn(`[parseExcelDate] Rifiutato formato placeholder: "${str}"`);
    return undefined;
  }
  
  // Formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Formato YYYY-MM-DD (già corretto)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  // Formato MM/DD/YYYY (americano) - fallback
  const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const fullYear = parseInt(y) > 50 ? `19${y}` : `20${y}`;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Ultimo tentativo: new Date() nativo
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() > 1900) {
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  console.warn(`[parseExcelDate] Formato data non riconosciuto: "${str}" (type: ${typeof value})`);
  return undefined;
}

/**
 * Smart fill: extract data from CF when Excel fields are missing
 */
export function smartFillFromCF(cf: string, existingData: {
  dataNascita?: string;
  genere?: string;
}): {
  dataNascita?: string;
  genere?: string;
  tipoindu: string;
} {
  const result: { dataNascita?: string; genere?: string; tipoindu: string } = {
    dataNascita: existingData.dataNascita,
    genere: existingData.genere,
    tipoindu: '1', // Default: CF valido
  };
  
  // Determina tipoindu dal formato CF
  if (cf.length === 16 && /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(cf)) {
    result.tipoindu = '1'; // CF standard
  } else if (/^\d+$/.test(cf)) {
    result.tipoindu = '3'; // Numerico/STP
  }
  
  // Se mancano dataNascita o genere, estrai da CF
  if (!result.dataNascita || !result.genere) {
    const cfData = parseCF(cf);
    if (cfData) {
      if (!result.dataNascita) result.dataNascita = cfData.dataNascita;
      if (!result.genere) result.genere = cfData.genere;
    }
  }
  
  return result;
}

// ==================== LEGACY FUNCTIONS (for compatibility) ====================

/**
 * Trova il nome della colonna che contiene le prestazioni
 */
export function findPrestazioniColumn(headers: string[]): string | undefined {
  const idx = findColumnByPatterns(headers, COLUMN_PATTERNS.prestazioni);
  return idx !== -1 ? headers[idx] : undefined;
}

/**
 * Trova il nome della colonna che contiene la tipologia
 */
export function findTipologiaColumn(headers: string[]): string | undefined {
  const idx = findColumnByPatterns(headers, COLUMN_PATTERNS.tipologia);
  return idx !== -1 ? headers[idx] : undefined;
}

/**
 * Trova il nome della colonna che contiene il codice fiscale
 */
export function findCFColumn(headers: string[]): string | undefined {
  const idx = findColumnByPatterns(headers, COLUMN_PATTERNS.codiceFiscale);
  return idx !== -1 ? headers[idx] : undefined;
}

/**
 * Formatta un numero come valuta per SPR (es. "594,90")
 */
export function formatCurrencyForSPR(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

/**
 * Formatta ore per SPR (es. "0044" per 44 ore)
 */
export function formatOreForSPR(ore: number): string {
  return ore.toString().padStart(4, '0');
}
