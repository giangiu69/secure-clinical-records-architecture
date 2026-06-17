/**
 * Utility per il parsing e calcolo del Codice Fiscale italiano
 */

import { findComuneByBelfiore } from "./codici-belfiore";
import { initDizionari, searchComuniByNome } from "./dizionari-territoriali";

const MONTH_CODES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, H: 6,
  L: 7, M: 8, P: 9, R: 10, S: 11, T: 12
};

const MONTH_CODES_REVERSE: Record<number, string> = {
  1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "H",
  7: "L", 8: "M", 9: "P", 10: "R", 11: "S", 12: "T"
};

// Tabelle per il calcolo del carattere di controllo (CIN)
const ODD_VALUES: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  "A": 1, "B": 0, "C": 5, "D": 7, "E": 9, "F": 13, "G": 15, "H": 17, "I": 19, "J": 21,
  "K": 2, "L": 4, "M": 18, "N": 20, "O": 11, "P": 3, "Q": 6, "R": 8, "S": 12, "T": 14,
  "U": 16, "V": 10, "W": 22, "X": 25, "Y": 24, "Z": 23
};

const EVEN_VALUES: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6, "H": 7, "I": 8, "J": 9,
  "K": 10, "L": 11, "M": 12, "N": 13, "O": 14, "P": 15, "Q": 16, "R": 17, "S": 18, "T": 19,
  "U": 20, "V": 21, "W": 22, "X": 23, "Y": 24, "Z": 25
};

const CHECK_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface CFParseResult {
  genere: string;
  dataNascita: string; // formato YYYY-MM-DD
  codiceBelfiore?: string;
  comuneNascita?: string;
  cittu?: string; // Codice ISTAT del comune di nascita (per campo cittu SPR1)
  isEstero?: boolean; // true se nato all'estero (Belfiore inizia con Z)
}

/**
 * Estrae consonanti da una stringa
 */
function getConsonants(str: string): string {
  return str.toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, "");
}

/**
 * Estrae vocali da una stringa
 */
function getVowels(str: string): string {
  return str.toUpperCase().replace(/[^AEIOU]/g, "");
}

/**
 * Calcola il codice di 3 caratteri per cognome o nome
 */
function calculateNameCode(str: string): string {
  const consonants = getConsonants(str);
  const vowels = getVowels(str);
  let code = consonants + vowels + "XXX";
  return code.substring(0, 3);
}

/**
 * Calcola il codice del nome (regola speciale: se consonanti >= 4, prendi 1a, 3a, 4a)
 */
function calculateFirstNameCode(firstName: string): string {
  const consonants = getConsonants(firstName);
  const vowels = getVowels(firstName);
  
  if (consonants.length >= 4) {
    // Prendi 1a, 3a e 4a consonante
    return consonants[0] + consonants[2] + consonants[3];
  }
  
  let code = consonants + vowels + "XXX";
  return code.substring(0, 3);
}

/**
 * Calcola il carattere di controllo (CIN)
 */
function calculateCheckDigit(cf15: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cf15[i];
    if (i % 2 === 0) {
      // Posizione dispari (1-based) = indice pari (0-based)
      sum += ODD_VALUES[char] || 0;
    } else {
      // Posizione pari (1-based) = indice dispari (0-based)
      sum += EVEN_VALUES[char] || 0;
    }
  }
  return CHECK_CHARS[sum % 26];
}

/**
 * Calcola il Codice Fiscale da dati anagrafici
 * @param cognome Cognome
 * @param nome Nome
 * @param dataNascita Data di nascita in formato YYYY-MM-DD
 * @param genere "1" per maschio, "2" per femmina
 * @param codiceBelfiore Codice Belfiore del comune di nascita (es. "H501" per Roma)
 * @returns Codice fiscale di 16 caratteri
 */
export function calculateCodiceFiscale(
  cognome: string,
  nome: string,
  dataNascita: string,
  genere: string,
  codiceBelfiore: string
): string | null {
  if (!cognome || !nome || !dataNascita || !genere || !codiceBelfiore) {
    return null;
  }

  try {
    // Codice cognome (3 caratteri)
    const cognomeCode = calculateNameCode(cognome);
    
    // Codice nome (3 caratteri)
    const nomeCode = calculateFirstNameCode(nome);
    
    // Data di nascita
    const date = new Date(dataNascita);
    const year = date.getFullYear().toString().substring(2, 4);
    const month = MONTH_CODES_REVERSE[date.getMonth() + 1];
    let day = date.getDate();
    
    // Se femmina, aggiungi 40 al giorno
    if (genere === "2") {
      day += 40;
    }
    
    const dayStr = day.toString().padStart(2, "0");
    
    // Codice Belfiore (4 caratteri)
    const belfiore = codiceBelfiore.toUpperCase().substring(0, 4).padEnd(4, "X");
    
    // Primi 15 caratteri
    const cf15 = cognomeCode + nomeCode + year + month + dayStr + belfiore;
    
    // Carattere di controllo
    const checkDigit = calculateCheckDigit(cf15);
    
    return cf15 + checkDigit;
  } catch (error) {
    console.error("Errore nel calcolo del CF:", error);
    return null;
  }
}

/**
 * Estrae genere, data di nascita e comune dal Codice Fiscale
 * @param cf Codice fiscale di 16 caratteri
 * @returns Oggetto con genere, dataNascita e codiceBelfiore, oppure null se CF non valido
 */
export function parseCodiceFiscale(cf: string): CFParseResult | null {
  if (!cf || cf.length !== 16) {
    return null;
  }

  const cfUpper = cf.toUpperCase();

  try {
    // Estrazione genere (posizione 9, indice 9)
    // Se il giorno è > 40, è femmina (sottraiamo 40 per ottenere il giorno reale)
    const dayCode = parseInt(cfUpper.substring(9, 11), 10);
    const genere = dayCode > 40 ? "2" : "1"; // 1=Maschio, 2=Femmina
    const day = dayCode > 40 ? dayCode - 40 : dayCode;

    // Estrazione anno (posizione 6-7, indice 6-7)
    const yearCode = parseInt(cfUpper.substring(6, 8), 10);
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const lastTwoDigits = currentYear % 100;
    
    // Se l'anno è maggiore degli ultimi due cifre dell'anno corrente, è del secolo scorso
    const year = yearCode > lastTwoDigits ? currentCentury - 100 + yearCode : currentCentury + yearCode;

    // Estrazione mese (posizione 8, indice 8)
    const monthCode = cfUpper.charAt(8);
    const month = MONTH_CODES[monthCode];

    if (!month || day < 1 || day > 31) {
      return null;
    }

    // Formattazione data in YYYY-MM-DD
    const dataNascita = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Estrazione codice Belfiore (posizione 11-14, indice 11-14)
    const codiceBelfiore = cfUpper.substring(11, 15);
    
    // Cerca il comune nel database Belfiore
    const comune = findComuneByBelfiore(codiceBelfiore);
    
    // Determina se nato all'estero (Belfiore inizia con Z)
    const isEstero = codiceBelfiore.startsWith('Z');

    return {
      genere,
      dataNascita,
      codiceBelfiore,
      comuneNascita: comune ? `${comune.nome} (${comune.provincia})` : undefined,
      isEstero,
    };
  } catch (error) {
    console.error("Errore nel parsing del CF:", error);
    return null;
  }
}

/**
 * Deriva il codice cittu (cittadinanza/comune nascita ISTAT) dal Codice Fiscale.
 * - Se Belfiore inizia con 'Z' → nato all'estero → ritorna "999" (codice generico estero)
 * - Altrimenti cerca il nome del comune dal dizionario Belfiore, poi lo mappa
 *   al codice ISTAT via dizionari-territoriali (comuni.txt)
 * @returns codice ISTAT del comune di nascita, o "100" (Italia default), o "999" (estero)
 */
export async function deriveCittuFromCF(cf: string): Promise<string> {
  if (!cf || cf.length !== 16) return "100";
  
  const parsed = parseCodiceFiscale(cf);
  if (!parsed || !parsed.codiceBelfiore) return "100";
  
  // Nato all'estero
  if (parsed.isEstero) {
    return "999";
  }
  
  // Cerca il comune Belfiore
  const comuneBelfiore = findComuneByBelfiore(parsed.codiceBelfiore);
  if (!comuneBelfiore) return "100";
  
  // Cerca il codice ISTAT dal nome del comune via dizionari-territoriali
  await initDizionari();
  const matches = searchComuniByNome(comuneBelfiore.nome, undefined, 3);
  
  if (matches.length > 0) {
    // Preferisci match esatto
    const exact = matches.find(m => m.nome.toLowerCase() === comuneBelfiore.nome.toLowerCase());
    return exact ? exact.codiceIstat : matches[0].codiceIstat;
  }
  
  // Fallback: cittadinanza italiana
  return "100";
}

/**
 * Valida un codice fiscale controllando il carattere di controllo
 */
export function validateCodiceFiscale(cf: string): boolean {
  if (!cf || cf.length !== 16) {
    return false;
  }
  
  const cfUpper = cf.toUpperCase();
  const cf15 = cfUpper.substring(0, 15);
  const providedCheckDigit = cfUpper.charAt(15);
  const calculatedCheckDigit = calculateCheckDigit(cf15);
  
  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Calcola l'età in anni dati due date
 * @param dataNascita Data di nascita in formato YYYY-MM-DD
 * @param dataRiferimento Data di riferimento in formato YYYY-MM-DD
 * @returns Età in anni
 */
export function calcolaEta(dataNascita: string, dataRiferimento: string): number {
  const nascita = new Date(dataNascita);
  const riferimento = new Date(dataRiferimento);
  
  let eta = riferimento.getFullYear() - nascita.getFullYear();
  const meseCorrente = riferimento.getMonth();
  const meseNascita = nascita.getMonth();
  
  if (meseCorrente < meseNascita || (meseCorrente === meseNascita && riferimento.getDate() < nascita.getDate())) {
    eta--;
  }
  
  return eta;
}
