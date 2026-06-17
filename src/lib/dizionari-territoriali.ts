/**
 * Dizionari territoriali ufficiali per validazione GAUSS
 * Carica e interroga i file comuni.txt e aziende_comuni.txt
 */

export interface ComuneRecord {
  codiceIstat: string;      // Es: "048017"
  nome: string;             // Es: "Firenze"
  codiceRegione: string;    // Es: "090"
  validoDal: Date;
  validoAl: Date;
}

export interface AziendaComuneRecord {
  codiceAsl: string;        // Es: "104"
  codiceIstat: string;      // Es: "048017"
  validoDal: Date;          // Validità dell'associazione ASL-Comune
  validoAl: Date;
  recordValidoDal: Date;    // Validità del record (versione)
  recordValidoAl: Date;
}

// Cache per i dizionari caricati
let comuniCache: ComuneRecord[] | null = null;
let aziendeCache: AziendaComuneRecord[] | null = null;
let comuniByIstat: Map<string, ComuneRecord[]> | null = null;
let comuniByNome: Map<string, ComuneRecord[]> | null = null;
let aziendeByCodice: Map<string, AziendaComuneRecord[]> | null = null;

// Promise singleton per evitare caricamenti duplicati
let comuniLoadPromise: Promise<ComuneRecord[]> | null = null;
let aziendeLoadPromise: Promise<AziendaComuneRecord[]> | null = null;

/**
 * Parsa una data dal formato YYYY-MM-DD
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Carica il dizionario comuni.txt
 * Formato: ISTAT_CODE|date_start|date_end|NAME|REGION_CODE||date_start2|date_end2|timestamp|
 */
export async function loadComuni(): Promise<ComuneRecord[]> {
  // Se già in cache, ritorna subito
  if (comuniCache) return comuniCache;
  
  // Se caricamento già in corso, attendi quella Promise (singleton)
  if (comuniLoadPromise) return comuniLoadPromise;
  
  // Avvia caricamento e salva la Promise
  comuniLoadPromise = (async () => {
    try {
      const response = await fetch('/data/comuni.txt');
      const text = await response.text();
      
      const records: ComuneRecord[] = [];
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 5) continue;
        
        const codiceIstat = parts[0].trim();
        const validoDalStr = parts[1]?.trim();
        const validoAlStr = parts[2]?.trim();
        const nome = parts[3]?.trim();
        const codiceRegione = parts[4]?.trim();
        
        if (!codiceIstat || !nome) continue;
        
        records.push({
          codiceIstat,
          nome,
          codiceRegione: codiceRegione.padStart(3, '0'),
          validoDal: validoDalStr ? parseDate(validoDalStr) : new Date(1900, 0, 1),
          validoAl: validoAlStr ? parseDate(validoAlStr) : new Date(9999, 11, 31),
        });
      }
      
      comuniCache = records;
      
      // Costruisci indici
      comuniByIstat = new Map();
      comuniByNome = new Map();
      
      for (const record of records) {
        // Indice per codice ISTAT
        if (!comuniByIstat.has(record.codiceIstat)) {
          comuniByIstat.set(record.codiceIstat, []);
        }
        comuniByIstat.get(record.codiceIstat)!.push(record);
        
        // Indice per nome (lowercase per ricerca case-insensitive)
        const nomeLower = record.nome.toLowerCase();
        if (!comuniByNome.has(nomeLower)) {
          comuniByNome.set(nomeLower, []);
        }
        comuniByNome.get(nomeLower)!.push(record);
      }
      
      console.log(`Caricati ${records.length} comuni dal dizionario`);
      return records;
    } catch (error) {
      console.error('Errore caricamento comuni.txt:', error);
      comuniLoadPromise = null; // Reset per permettere retry
      return [];
    }
  })();
  
  return comuniLoadPromise;
}

/**
 * Carica il dizionario aziende_comuni.txt
 * Formato: ASL_CODE|ISTAT_CODE|date_start|date_end|date_start2|date_end2|timestamp|
 */
export async function loadAziendeComuni(): Promise<AziendaComuneRecord[]> {
  // Se già in cache, ritorna subito
  if (aziendeCache) return aziendeCache;
  
  // Se caricamento già in corso, attendi quella Promise (singleton)
  if (aziendeLoadPromise) return aziendeLoadPromise;
  
  // Avvia caricamento e salva la Promise
  aziendeLoadPromise = (async () => {
    try {
      const response = await fetch('/data/aziende_comuni.txt');
      const text = await response.text();
      
      const records: AziendaComuneRecord[] = [];
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 4) continue;
        
        const codiceAsl = parts[0].trim();
        const codiceIstat = parts[1]?.trim();
        const validoDalStr = parts[2]?.trim();
        const validoAlStr = parts[3]?.trim();
        
        if (!codiceAsl || !codiceIstat) continue;
        
        records.push({
          codiceAsl,
          codiceIstat,
          validoDal: validoDalStr ? parseDate(validoDalStr) : new Date(1900, 0, 1),
          validoAl: validoAlStr ? parseDate(validoAlStr) : new Date(9999, 11, 31),
          recordValidoDal: parts[4]?.trim() ? parseDate(parts[4].trim()) : new Date(1900, 0, 1),
          recordValidoAl: parts[5]?.trim() ? parseDate(parts[5].trim()) : new Date(9999, 11, 31),
        });
      }
      
      aziendeCache = records;
      
      // Costruisci indice per ASL
      aziendeByCodice = new Map();
      for (const record of records) {
        if (!aziendeByCodice.has(record.codiceAsl)) {
          aziendeByCodice.set(record.codiceAsl, []);
        }
        aziendeByCodice.get(record.codiceAsl)!.push(record);
      }
      
      console.log(`Caricate ${records.length} associazioni azienda-comune`);
      return records;
    } catch (error) {
      console.error('Errore caricamento aziende_comuni.txt:', error);
      aziendeLoadPromise = null; // Reset per permettere retry
      return [];
    }
  })();
  
  return aziendeLoadPromise;
}

/**
 * Inizializza entrambi i dizionari
 */
export async function initDizionari(): Promise<void> {
  await Promise.all([loadComuni(), loadAziendeComuni()]);
}

/**
 * Verifica se un record è valido a una certa data
 */
function isValidAtDate(record: { validoDal: Date; validoAl: Date }, date: Date): boolean {
  return date >= record.validoDal && date <= record.validoAl;
}

/**
 * Cerca un comune per codice ISTAT, opzionalmente valido a una certa data
 */
export function findComuneByIstat(codiceIstat: string, atDate?: Date): ComuneRecord | null {
  if (!comuniByIstat) return null;
  
  const records = comuniByIstat.get(codiceIstat);
  if (!records || records.length === 0) return null;
  
  if (atDate) {
    return records.find(r => isValidAtDate(r, atDate)) || null;
  }
  
  // Se non specificata data, ritorna il record più recente (validoAl = 9999-12-31)
  return records.find(r => r.validoAl.getFullYear() === 9999) || records[0];
}

/**
 * Rimappa un codice ISTAT storico/scaduto al codice attualmente valido,
 * cercando un comune con lo stesso nome e regione la cui validità arrivi al 9999-12-31.
 * Esempi: 048034 (PRATO storico) -> 100005 (Prato attuale, nuova provincia PO);
 *         048819 (Pistoia storico) -> 047014 (Pistoia attuale).
 * Ritorna il codice ISTAT originale se è già valido o se nessun rimpiazzo è trovato.
 */
export function remapIstatToCurrent(codiceIstat: string): string {
  if (!comuniByIstat || !comuniCache) return codiceIstat;
  const records = comuniByIstat.get(codiceIstat);
  if (!records || records.length === 0) return codiceIstat;

  // Già valido oggi? niente da fare
  const current = records.find(r => r.validoAl.getFullYear() === 9999);
  if (current) return codiceIstat;

  // Recupera nome e regione dall'ultimo record storico
  const latestHistorical = records.reduce((a, b) => (a.validoAl > b.validoAl ? a : b));
  const targetName = latestHistorical.nome.toLowerCase().trim();
  const targetRegion = latestHistorical.codiceRegione;

  // Cerca lo stesso comune attualmente valido (stesso nome, stessa regione)
  const candidates = comuniByNome?.get(targetName) || [];
  const replacement = candidates.find(
    r => r.validoAl.getFullYear() === 9999 && r.codiceRegione === targetRegion
  );
  return replacement ? replacement.codiceIstat : codiceIstat;
}

/**
 * Calcola la distanza di Levenshtein tra due stringhe
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calcola la similarità percentuale tra due stringhe (0-100)
 */
function calculateSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  
  if (aLower === bLower) return 100;
  if (!aLower || !bLower) return 0;
  
  const maxLen = Math.max(aLower.length, bLower.length);
  const distance = levenshteinDistance(aLower, bLower);
  
  return Math.round((1 - distance / maxLen) * 100);
}

export interface FuzzyMatchResult {
  comune: ComuneRecord;
  similarity: number; // 0-100
  isExact: boolean;
}

/**
 * Cerca comuni per nome con fuzzy matching
 * Restituisce match ordinati per similarità decrescente
 */
export function searchComuniByNomeFuzzy(
  nome: string, 
  atDate?: Date, 
  limit = 10,
  minSimilarity = 60
): FuzzyMatchResult[] {
  if (!comuniByNome || !comuniCache) return [];
  
  const searchTerm = nome.toLowerCase().trim();
  if (!searchTerm || searchTerm.length < 2) return [];
  
  const results: FuzzyMatchResult[] = [];
  const seen = new Set<string>();
  
  // Prima cerca match esatti
  const exact = comuniByNome.get(searchTerm);
  if (exact) {
    for (const r of exact) {
      if (atDate && !isValidAtDate(r, atDate)) continue;
      if (!seen.has(r.codiceIstat)) {
        results.push({ comune: r, similarity: 100, isExact: true });
        seen.add(r.codiceIstat);
      }
    }
  }
  
  // Se abbiamo match esatti, ritorna subito
  if (results.length > 0) {
    return results.slice(0, limit);
  }
  
  // Calcola similarità per tutti i comuni
  const scored: FuzzyMatchResult[] = [];
  
  for (const record of comuniCache) {
    if (seen.has(record.codiceIstat)) continue;
    if (atDate && !isValidAtDate(record, atDate)) continue;
    
    const similarity = calculateSimilarity(searchTerm, record.nome);
    
    if (similarity >= minSimilarity) {
      scored.push({ comune: record, similarity, isExact: false });
      seen.add(record.codiceIstat);
    }
  }
  
  // Ordina per similarità decrescente
  scored.sort((a, b) => b.similarity - a.similarity);
  
  return scored.slice(0, limit);
}

/**
 * Trova il miglior match fuzzy per un nome comune
 * Restituisce il comune più simile se la similarità supera la soglia
 */
export function findBestFuzzyMatch(
  nome: string,
  atDate?: Date,
  minSimilarity = 70
): FuzzyMatchResult | null {
  const matches = searchComuniByNomeFuzzy(nome, atDate, 1, minSimilarity);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Cerca comuni per nome (ricerca parziale case-insensitive)
 */
export function searchComuniByNome(nome: string, atDate?: Date, limit = 20): ComuneRecord[] {
  if (!comuniByNome || !comuniCache) return [];
  
  const searchTerm = nome.toLowerCase().trim();
  if (!searchTerm) return [];
  
  const results: ComuneRecord[] = [];
  const seen = new Set<string>();
  
  // Prima cerca match esatti
  const exact = comuniByNome.get(searchTerm);
  if (exact) {
    for (const r of exact) {
      if (atDate && !isValidAtDate(r, atDate)) continue;
      if (!seen.has(r.codiceIstat)) {
        results.push(r);
        seen.add(r.codiceIstat);
      }
    }
  }
  
  // Poi cerca match parziali
  for (const record of comuniCache) {
    if (results.length >= limit) break;
    if (seen.has(record.codiceIstat)) continue;
    if (atDate && !isValidAtDate(record, atDate)) continue;
    
    if (record.nome.toLowerCase().includes(searchTerm)) {
      results.push(record);
      seen.add(record.codiceIstat);
    }
  }
  
  return results;
}

/**
 * Trova la ASL associata a un comune per codice ISTAT, valida a una certa data
 */
export function findAslByComune(codiceIstat: string, atDate?: Date): string | null {
  if (!aziendeByCodice || !aziendeCache) return null;
  
  const date = atDate || new Date();
  
  for (const record of aziendeCache) {
    if (record.codiceIstat === codiceIstat && 
        isValidAtDate(record, date) &&
        date >= record.recordValidoDal && date <= record.recordValidoAl) {
      return record.codiceAsl;
    }
  }
  
  return null;
}

/**
 * Trova i comuni associati a una ASL, validi a una certa data
 */
export function findComuniByAsl(codiceAsl: string, atDate?: Date): ComuneRecord[] {
  if (!aziendeByCodice || !comuniByIstat) return [];
  
  const date = atDate || new Date();
  const aslRecords = aziendeByCodice.get(codiceAsl);
  if (!aslRecords) return [];
  
  const risultati: ComuneRecord[] = [];
  const seen = new Set<string>();
  
  for (const aslRecord of aslRecords) {
    if (!isValidAtDate(aslRecord, date) || date < aslRecord.recordValidoDal || date > aslRecord.recordValidoAl) continue;
    if (seen.has(aslRecord.codiceIstat)) continue;
    
    const comune = findComuneByIstat(aslRecord.codiceIstat, date);
    if (comune) {
      risultati.push(comune);
      seen.add(aslRecord.codiceIstat);
    }
  }
  
  return risultati;
}

/**
 * Estrae la regione dal codice ISTAT di un comune
 * I primi 3 caratteri del codice ISTAT provinciale indicano la provincia,
 * che va mappata alla regione
 */
export function getRegioneFromIstat(codiceIstat: string): string | null {
  const comune = findComuneByIstat(codiceIstat);
  return comune?.codiceRegione || null;
}

/**
 * Valida se un comune è esistente e valido a una certa data
 */
export function validateComune(codiceIstat: string, atDate?: Date): {
  valid: boolean;
  comune?: ComuneRecord;
  error?: string;
} {
  const comune = findComuneByIstat(codiceIstat, atDate);
  
  if (!comune) {
    return { valid: false, error: `Codice ISTAT ${codiceIstat} non trovato nel dizionario` };
  }
  
  if (atDate && !isValidAtDate(comune, atDate)) {
    return { 
      valid: false, 
      comune,
      error: `Comune ${comune.nome} non valido alla data specificata` 
    };
  }
  
  return { valid: true, comune };
}

/**
 * Valida se l'associazione ASL-Comune è valida a una certa data
 */
export function validateAslComune(codiceAsl: string, codiceIstat: string, atDate?: Date): {
  valid: boolean;
  error?: string;
} {
  const date = atDate || new Date();
  
  if (!aziendeByCodice) {
    return { valid: false, error: 'Dizionario aziende non caricato' };
  }
  
  const aslRecords = aziendeByCodice.get(codiceAsl);
  if (!aslRecords) {
    return { valid: false, error: `Codice ASL ${codiceAsl} non trovato` };
  }
  
  const validRecord = aslRecords.find(
    r => r.codiceIstat === codiceIstat && isValidAtDate(r, date) &&
         date >= r.recordValidoDal && date <= r.recordValidoAl
  );
  
  if (!validRecord) {
    return { 
      valid: false, 
      error: `Comune ${codiceIstat} non appartiene alla ASL ${codiceAsl} alla data specificata` 
    };
  }
  
  return { valid: true };
}
