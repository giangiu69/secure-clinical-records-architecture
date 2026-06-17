export interface RawPresenceEntry {
  date: string;        // YYYY-MM-DD
  hours: number;       // Ore della singola sessione
  patientName: string; // Nome grezzo dal PDF
  activityText?: string; // Testo attività per classificazione codpres
  isRemote: boolean;   // Flag per prestazioni da remoto
  hasValutazione?: boolean;  // Flag se presente valutazione
  valutazioneDate?: string;  // Data valutazione se presente (YYYY-MM-DD)
  /**
   * Codpres deterministico (impostato SOLO dal pdf-checkbox-extractor quando
   * la colonna checkbox è stata letta direttamente dal PDF tabellare).
   * Se presente, PDFImporter lo usa direttamente senza passare per il
   * classificatore testuale.
   */
  codpres?: '417.1' | '405.1';
}

// Estrae mese di riferimento dal PDF (es. "GENNAIO 2025", "Gennaio 2025", "01/2025")
export function extractReferenceMonth(pdfText: string): { year: number; month: number } | null {
  const monthNames: Record<string, number> = {
    'gennaio': 1, 'febbraio': 2, 'marzo': 3, 'aprile': 4, 'maggio': 5, 'giugno': 6,
    'luglio': 7, 'agosto': 8, 'settembre': 9, 'ottobre': 10, 'novembre': 11, 'dicembre': 12
  };
  
  // Pattern: "GENNAIO 2025" or "Gennaio 2025"
  const monthYearPattern = /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})\b/i;
  const monthYearMatch = pdfText.match(monthYearPattern);
  if (monthYearMatch) {
    return {
      month: monthNames[monthYearMatch[1].toLowerCase()],
      year: parseInt(monthYearMatch[2])
    };
  }
  
  // Pattern: "01/2025" or "1/2025"
  const numericPattern = /\b(\d{1,2})\/(\d{4})\b/;
  const numericMatch = pdfText.match(numericPattern);
  if (numericMatch) {
    const month = parseInt(numericMatch[1]);
    if (month >= 1 && month <= 12) {
      return { month, year: parseInt(numericMatch[2]) };
    }
  }
  
  return null;
}

// Estrae data valutazione dal PDF
// Priorità: 1) Data esplicita in colonna "valutazione", 2) Data in "info aggiuntive" se flag valutazione presente
export function extractValutazioneDate(pdfText: string, lineContext: string): { hasValutazione: boolean; date?: string } {
  const textLower = lineContext.toLowerCase();
  
  // Cerca flag "valutazione" o varianti
  const hasValutazioneFlag = /\bvalutazion[ei]\b/i.test(textLower) || 
                             /\bvalut\.?\b/i.test(textLower);
  
  if (!hasValutazioneFlag) {
    return { hasValutazione: false };
  }
  
  // Pattern date: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const datePatterns = [
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/g,  // DD/MM/YYYY
    /data\s*valutazione[:\s]*(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/i,  // "data valutazione: DD/MM/YYYY"
  ];
  
  // Prima cerca pattern esplicito "data valutazione"
  const explicitMatch = lineContext.match(/data\s*valutazione[:\s]*(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/i);
  if (explicitMatch) {
    const day = explicitMatch[1];
    const month = explicitMatch[2];
    const year = explicitMatch[3];
    return { 
      hasValutazione: true, 
      date: `${year}-${month}-${day}` 
    };
  }
  
  // Poi cerca qualsiasi data nel contesto
  const dateMatch = lineContext.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
  if (dateMatch) {
    const day = dateMatch[1];
    const month = dateMatch[2];
    const year = dateMatch[3];
    return { 
      hasValutazione: true, 
      date: `${year}-${month}-${day}` 
    };
  }
  
  // Flag valutazione presente ma senza data esplicita
  return { hasValutazione: true };
}

// Pattern per rilevare sessioni da remoto
const REMOTE_PATTERN = /\b(da\s+)?remoto\b/i;

export async function parsePDFToPresences(pdfText: string): Promise<RawPresenceEntry[]> {
  const entries: RawPresenceEntry[] = [];
  // Pulisce il testo e normalizza gli spazi
  const tokens = pdfText
    .replace(/\n/g, " ")
    .split(/\s+/)
    .filter((t) => t.trim().length > 0);

  const datePattern = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/;
  const hoursPattern = /^(\d+)[hH]$/;
  const bareNumberPattern = /^(\d{1,2})$/;
  // Pattern per ore decimali italiane: "2,0h", "1,5h", "2.5h"
  const decimalHoursPattern = /^(\d+)[,.](\d+)[hH]$/;
  const bareDecimalHoursPattern = /^(\d{1,2})[,.](\d+)$/;
  // Pattern per orari tipo "9.30", "19.00", "21:00", "9.30-10.30"
  const timePattern = /^\d{1,2}[\.:]\d{2}/;

  // Activity keywords to capture
  const activityKeywords = [
    'supporto', 'psicologico', 'famiglia', 'familiare', 'riabilitazione',
    'individuale', 'valutazione', 'tutorati', 'tutoraggio', 'psicoeducativi',
    'psicoed', 'incontri', 'familiari', 'riunioni', 'interventi', 'remoto'
  ];

  // Parole da escludere completamente (intestazioni, codici, parole comuni non-nome)
  const excludeWords = new Set([
    'DATA', 'ORE', 'COD', 'UTENTE', 'PARENTE', 'RIABILITAZIONE', 
    'CODICE', 'PRESTAZIONE', 'ATTIVITA', 'NOME', 'COGNOME',
    'GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO',
    'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE',
    // Parole comuni che non sono nomi
    'AVVOCATO', 'COMPAGNA', 'COMPAGNO', 'MARITO', 'MOGLIE', 'MADRE', 'PADRE',
    'FIGLIO', 'FIGLIA', 'INFO', 'AGGIUNTIVE', 'NOTE', 'DA', 'DI', 'IL', 'LA',
    'UN', 'UNA', 'PER', 'CON', 'SU', 'TRA', 'FRA'
  ]);

  // Massimo 3 parole per il nome (Cognome + Nome, gestisce cognomi composti)
  const MAX_NAME_WORDS = 3;

  let currentDate: string | null = null;
  let currentHours: number | null = null;
  let nameBuffer: string[] = [];
  let activityBuffer: string[] = [];
  let currentLineText: string[] = []; // Track full line for remote detection
  let nameComplete = false; // Flag per indicare che il nome è completo

  console.log(`[PDF Parse] Inizio parsing, ${tokens.length} token trovati`);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const dateMatch = token.match(datePattern);

    if (dateMatch) {
      // Salva entry precedente se completa
      if (currentDate && currentHours !== null && nameBuffer.length > 0) {
        const lineText = currentLineText.join(" ");
        const isRemote = REMOTE_PATTERN.test(lineText);
        // Estrai valutazione dal contesto della riga
        const valutazione = extractValutazioneDate(lineText, lineText);
        saveEntry(entries, currentDate, currentHours, nameBuffer, activityBuffer, isRemote, valutazione);
      }
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      currentDate = `${dateMatch[3]}-${month}-${day}`; // YYYY-MM-DD
      currentHours = null;
      nameBuffer = [];
      activityBuffer = [];
      currentLineText = [];
      nameComplete = false; // Reset flag per nuova entry
      continue;
    }

    // Track all tokens in current line for remote detection
    currentLineText.push(token);

    const hoursMatch = token.match(hoursPattern);
    if (hoursMatch && currentDate) {
      currentHours = parseInt(hoursMatch[1]);
      continue;
    }

    // OCR può separare "2 h" in due token distinti
    const bareHourMatch = token.match(bareNumberPattern);
    if (bareHourMatch && currentDate && /^[hH]$/.test(tokens[i + 1] || '')) {
      currentHours = parseInt(bareHourMatch[1]);
      i += 1;
      continue;
    }

    // Ore decimali (es. "2,0h", "1,5h")
    const decimalMatch = token.match(decimalHoursPattern);
    if (decimalMatch && currentDate) {
      currentHours = parseFloat(`${decimalMatch[1]}.${decimalMatch[2]}`);
      continue;
    }

    const bareDecimalMatch = token.match(bareDecimalHoursPattern);
    if (bareDecimalMatch && currentDate && /^[hH]$/.test(tokens[i + 1] || '')) {
      currentHours = parseFloat(`${bareDecimalMatch[1]}.${bareDecimalMatch[2]}`);
      i += 1;
      continue;
    }

    // Se troviamo un orario (es. 9.30, 19.00-20.00), il nome è completo
    if (timePattern.test(token)) {
      nameComplete = true;
      continue;
    }

    // Raccogli nomi solo se non abbiamo ancora completato
    if (currentDate && !nameComplete) {
      const tokenUpper = token.toUpperCase();
      
      // Esclude parole chiave
      if (!excludeWords.has(tokenUpper)) {
        const tokenLower = token.toLowerCase();
        const isActivityWord = activityKeywords.some(kw => tokenLower.includes(kw));
        
        if (isActivityWord) {
          // Se troviamo una keyword di attività, il nome è finito
          nameComplete = true;
          activityBuffer.push(token);
        } else if (token.length > 1 && /^[A-Za-zÀ-ÿ\-']+$/.test(token)) {
          // Solo parole alfabetiche (nomi/cognomi)
          if (nameBuffer.length < MAX_NAME_WORDS) {
            nameBuffer.push(token);
          } else {
            // Abbiamo raggiunto il max, il nome è completo
            nameComplete = true;
          }
        }
      }
    } else if (currentDate && nameComplete) {
      // Dopo che il nome è completo, raccogli solo activity keywords
      const tokenLower = token.toLowerCase();
      const isActivityWord = activityKeywords.some(kw => tokenLower.includes(kw));
      if (isActivityWord) {
        activityBuffer.push(token);
      }
    }
  }
  
  // Salva ultimo
  if (currentDate && currentHours !== null && nameBuffer.length > 0) {
    const lineText = currentLineText.join(" ");
    const isRemote = REMOTE_PATTERN.test(lineText);
    const valutazione = extractValutazioneDate(lineText, lineText);
    saveEntry(entries, currentDate, currentHours, nameBuffer, activityBuffer, isRemote, valutazione);
  }

  console.log(`[PDF Parse] Parsing completato: ${entries.length} entry trovate`);
  entries.forEach((e, i) => {
    console.log(`[PDF Parse] Entry ${i+1}: ${e.patientName} - ${e.date} - ${e.hours}h${e.hasValutazione ? ' [VALUTAZIONE]' : ''}`);
  });

  // Ritorna entry singole NON aggregate
  return entries;
}

function saveEntry(
  entries: RawPresenceEntry[], 
  date: string, 
  hours: number, 
  nameBuffer: string[],
  activityBuffer: string[],
  isRemote: boolean,
  valutazione: { hasValutazione: boolean; date?: string }
) {
  const rawName = nameBuffer.join(" ").trim();
  const cleanName = rawName.replace(/[0-9]/g, "").trim(); // Via eventuali numeri
  const activityText = activityBuffer.join(" ").trim();
  
  if (cleanName.length > 3) {
    entries.push({ 
      date, 
      hours, 
      patientName: cleanName,
      activityText: activityText || undefined,
      isRemote,
      hasValutazione: valutazione.hasValutazione,
      valutazioneDate: valutazione.date,
    });
  }
}

// Aggregazione rimossa: avviene DOPO il matching in PDFImporter
