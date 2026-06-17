import { SPR1Record, SPR2Record } from "@/types/spr";
import { calculateImpres, roundFinancial, parseCurrency } from "./financial-utils";
import { findAslByComune, findComuneByIstat, initDizionari, remapIstatToCurrent } from "./dizionari-territoriali";
import { SCALE_DEFAULTS } from "./scale-disabilita";
import { normalizeNpratForGauss } from "./nprat-utils";
import { isValidICD9 } from "./icd9-lookup";

// Rimuove caratteri accentati e speciali per compatibilità ANSI/Windows-1252
function removeAccents(str: string): string {
  const accentsMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ñ': 'n', 'ç': 'c',
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
    'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
    'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
    'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
    'Ñ': 'N', 'Ç': 'C'
  };
  return str.split('').map(char => accentsMap[char] || char).join('').replace(/[^\x20-\x7E]/g, ' ');
}

/**
 * Normalizza il codice esenzione per GAUSS.
 * Accetta: 6 cifre numeriche OPPURE codici toscani alfanumerici (C02, E01, L01, 0B02, 048, 013…).
 * Estrae il primo token alfanumerico contenente almeno una cifra, uppercase, pad a 6 spazi.
 * Non-esente (ticket €38): vuoto, '000000', '0', 'no', 'non esente', solo lettere senza cifre.
 */
function normalizeCodese(raw: string | null | undefined): { codese: string; isExempt: boolean } {
  const trimmed = (raw || '').trim().toUpperCase();
  if (!trimmed) return { codese: '000000', isExempt: false };

  const nonExemptValues = new Set(['000000', '0', 'NO', 'NON ESENTE', 'NESSUNA', 'NESSUNO', 'N/A', '-']);
  if (nonExemptValues.has(trimmed)) return { codese: '000000', isExempt: false };

  if (/^\d{6}$/.test(trimmed)) return { codese: trimmed, isExempt: true };

  const tokens = trimmed.split(/[^A-Z0-9]+/).filter(t => t.length > 0);
  for (const tok of tokens) {
    if (tok.length >= 2 && tok.length <= 6 && /\d/.test(tok)) {
      return { codese: tok.padEnd(6, ' '), isExempt: true };
    }
  }

  return { codese: '000000', isExempt: false };
}


function formatDateGGMMAAAA(date?: string): string {
  if (!date) return " ".repeat(8);
  const cleaned = date.replace(/[-/]/g, "");
  // Rifiuta stringhe non numeriche (es. "ddMMyyyy" formato placeholder)
  if (!/^\d{8}$/.test(cleaned)) return " ".repeat(8);
  
  // FIX: Controlla PRIMA se è formato AAAAMMGG (anno nelle prime 4 cifre)
  // Questo previene il bug dove "20241001" viene interpretato come GGMMAAAA
  // perché le prime 2 cifre (20) sono <= 31
  const yearCandidate = parseInt(cleaned.substring(0, 4), 10);
  if (yearCandidate >= 1900 && yearCandidate <= 2100) {
    // Formato AAAAMMGG → converti a GGMMAAAA
    const day = cleaned.substring(6, 8);
    const month = cleaned.substring(4, 6);
    const year = cleaned.substring(0, 4);
    return day + month + year;
  }
  
  // Check if already in GGMMAAAA format (day <= 31, month <= 12)
  const firstTwo = parseInt(cleaned.substring(0, 2), 10);
  const secondTwo = parseInt(cleaned.substring(2, 4), 10);
  
  if (firstTwo >= 1 && firstTwo <= 31 && secondTwo >= 1 && secondTwo <= 12) {
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Estrae {year, month} (1-12) da una stringa data in formato YYYY-MM-DD, YYYYMMDD o DDMMYYYY.
 * Ritorna null se non parsabile.
 */
function extractYearMonth(date?: string): { year: number; month: number } | null {
  if (!date) return null;
  const cleaned = date.replace(/[-/]/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;
  const firstFour = parseInt(cleaned.substring(0, 4), 10);
  if (firstFour >= 1900 && firstFour <= 2100) {
    // AAAAMMGG
    return { year: firstFour, month: parseInt(cleaned.substring(4, 6), 10) };
  }
  // GGMMAAAA
  const year = parseInt(cleaned.substring(4, 8), 10);
  const month = parseInt(cleaned.substring(2, 4), 10);
  if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
    return { year, month };
  }
  return null;
}

function extractYMD(date?: string): { year: number; month: number; day: number } | null {
  if (!date) return null;
  const cleaned = date.replace(/[-/]/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;
  const firstFour = parseInt(cleaned.substring(0, 4), 10);
  const ymd = firstFour >= 1900 && firstFour <= 2100
    ? { year: firstFour, month: parseInt(cleaned.substring(4, 6), 10), day: parseInt(cleaned.substring(6, 8), 10) }
    : { year: parseInt(cleaned.substring(4, 8), 10), month: parseInt(cleaned.substring(2, 4), 10), day: parseInt(cleaned.substring(0, 2), 10) };
  if (ymd.year < 1900 || ymd.year > 2100 || ymd.month < 1 || ymd.month > 12 || ymd.day < 1 || ymd.day > 31) return null;
  return ymd;
}

/**
 * Forza dataini = primo giorno del mese di riferimento, datafine = ultimo giorno.
 * Mese di riferimento derivato dalla prima data parsabile tra: dataini, datafine, data_PIC.
 * Ritorna stringhe in formato GGMMAAAA pronte per l'export.
 */
function computeMonthBoundaries(
  dataini?: string,
  datafine?: string,
  dataPIC?: string
): { dataini: string; datafine: string } {
  const ym = extractYearMonth(dataini) || extractYearMonth(datafine) || extractYearMonth(dataPIC);
  if (!ym) return { dataini: dataini || "", datafine: datafine || "" };
  const { year, month } = ym;
  const lastDay = new Date(year, month, 0).getDate();
  const mm = month.toString().padStart(2, "0");
  const yyyy = year.toString();
  const pic = extractYMD(dataPIC);
  const firstDay = pic && pic.year === year && pic.month === month ? Math.max(1, pic.day) : 1;
  const firstDD = firstDay.toString().padStart(2, "0");
  const lastDD = lastDay.toString().padStart(2, "0");
  return {
    dataini: `${firstDD}${mm}${yyyy}`,
    datafine: `${lastDD}${mm}${yyyy}`,
  };
}

function formatNumeric(value: string | number | undefined, length: number): string {
  if (!value || value === "" || value === "0") return " ".repeat(length);
  const numValue = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(numValue) || numValue === 0) return " ".repeat(length);
  return numValue.toString().padStart(length, "0");
}

function formatEconomic(value: string | number | undefined, length: number): string {
  if (!value || value === "" || value === "0" || value === "0.00" || value === "0,00") return "0".repeat(length - 3) + ",00";
  let strValue = typeof value === "number" ? value.toString() : value;
  strValue = strValue.replace(",", ".");
  const floatValue = parseFloat(strValue);
  if (isNaN(floatValue) || floatValue === 0) return "0".repeat(length - 3) + ",00";
  const integerPart = Math.floor(floatValue);
  const decimalPart = Math.round((floatValue - integerPart) * 100);
  const intPartLength = length - 3;
  const intPartStr = integerPart.toString().padStart(intPartLength, "0");
  const decPartStr = decimalPart.toString().padStart(2, "0");
  return intPartStr + "," + decPartStr;
}

function formatText(value: string | undefined, length: number): string {
  if (!value) return " ".repeat(length);
  const cleaned = removeAccents(value);
  if (cleaned.length > length) return cleaned.substring(0, length);
  return cleaned.padEnd(length, " ");
}

// Formatta con default numerico (es. "00", "000") se vuoto
function formatTextWithDefault(value: string | undefined, length: number, defaultValue: string): string {
  if (!value || value.trim() === "") return defaultValue.padStart(length, "0").substring(0, length);
  const cleaned = removeAccents(value);
  if (cleaned.length > length) return cleaned.substring(0, length);
  return cleaned.padEnd(length, " ");
}

function normalizeICD9ForGauss(value: string | undefined): string {
  if (!value || value.trim() === "") return "";
  const raw = value.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!raw) return "";
  if (raw === "00000" || raw === "99999") return raw;
  if (isValidICD9(raw)) return raw.padEnd(5, " ").substring(0, 5);
  if (raw.length === 4 && isValidICD9(`${raw}0`)) return `${raw}0`;
  return raw.padEnd(5, " ").substring(0, 5);
}

// Calcola età da data di nascita rispetto a data PIC
function calculateAge(dataNascita: string | undefined, dataPIC: string | undefined): number {
  if (!dataNascita || !dataPIC) return 99;
  
  const cleanedNasc = dataNascita.replace(/[-/]/g, "");
  const cleanedPIC = dataPIC.replace(/[-/]/g, "");
  
  if (!/^\d{8}$/.test(cleanedNasc) || !/^\d{8}$/.test(cleanedPIC)) return 99;
  
  // Converti in formato YYYYMMDD se necessario
  let nascYYYYMMDD = cleanedNasc;
  let picYYYYMMDD = cleanedPIC;
  
  // Se in formato GGMMAAAA, converti
  const firstTwo = parseInt(cleanedNasc.substring(0, 2), 10);
  if (firstTwo >= 1 && firstTwo <= 31) {
    nascYYYYMMDD = cleanedNasc.substring(4, 8) + cleanedNasc.substring(2, 4) + cleanedNasc.substring(0, 2);
  }
  
  const firstTwoPIC = parseInt(cleanedPIC.substring(0, 2), 10);
  if (firstTwoPIC >= 1 && firstTwoPIC <= 31) {
    picYYYYMMDD = cleanedPIC.substring(4, 8) + cleanedPIC.substring(2, 4) + cleanedPIC.substring(0, 2);
  }
  
  const yearNasc = parseInt(nascYYYYMMDD.substring(0, 4), 10);
  const monthNasc = parseInt(nascYYYYMMDD.substring(4, 6), 10);
  const dayNasc = parseInt(nascYYYYMMDD.substring(6, 8), 10);
  
  const yearPIC = parseInt(picYYYYMMDD.substring(0, 4), 10);
  const monthPIC = parseInt(picYYYYMMDD.substring(4, 6), 10);
  const dayPIC = parseInt(picYYYYMMDD.substring(6, 8), 10);
  
  let age = yearPIC - yearNasc;
  if (monthPIC < monthNasc || (monthPIC === monthNasc && dayPIC < dayNasc)) {
    age--;
  }
  
  return age;
}

// Formatta durata in ore con 1 decimale (SPR2)
// NOTA: il valore in input è GIÀ in ore (non minuti), come memorizzato nel DB.
// GAUSS richiede formato "NNN,D" (5 caratteri totali con 1 decimale).
// Esempio: durata=1 → "001,0", durata=7 → "007,0"
function formatDurataOre(oreStr: string | number | undefined, length: number): string {
  if (!oreStr || oreStr === "" || oreStr === "0") return "0".repeat(length - 2) + ",0";
  const ore = typeof oreStr === "string" ? parseFloat(oreStr) : oreStr;
  if (isNaN(ore) || ore === 0) return "0".repeat(length - 2) + ",0";
  
  const oreInt = Math.floor(ore);
  const oreDec = Math.round((ore - oreInt) * 10);
  
  const oreIntStr = oreInt.toString().padStart(length - 2, "0");
  return oreIntStr + "," + oreDec.toString();
}

// Numerico con zeri obbligatori (mai spazi vuoti) - per campi SPR2
function formatNumericZero(value: string | number | undefined, length: number): string {
  if (!value || value === "" || value === "0") return "0".repeat(length);
  const numValue = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(numValue) || numValue === 0) return "0".repeat(length);
  const result = numValue.toString();
  if (result.length > length) return result.substring(0, length);
  return result.padStart(length, "0");
}

// Economico con zeri obbligatori (mai spazi vuoti) - per campi SPR2
function formatEconomicZero(value: string | number | undefined, length: number): string {
  if (!value || value === "" || value === "0" || value === "0.00" || value === "0,00") {
    return "0".repeat(length - 3) + ",00";
  }
  let strValue = typeof value === "number" ? value.toString() : value;
  strValue = strValue.replace(",", ".");
  const floatValue = parseFloat(strValue);
  if (isNaN(floatValue) || floatValue === 0) return "0".repeat(length - 3) + ",00";
  const integerPart = Math.floor(floatValue);
  const decimalPart = Math.round((floatValue - integerPart) * 100);
  const intPartLength = length - 3;
  const intPartStr = integerPart.toString().padStart(intPartLength, "0");
  const decPartStr = decimalPart.toString().padStart(2, "0");
  return intPartStr + "," + decPartStr;
}

// Scrive una stringa nel buffer a partire dalla posizione specificata (Fixed Buffer Pattern)
function writeAtPosition(buffer: string[], value: string, startPos: number): void {
  for (let i = 0; i < value.length; i++) {
    if (startPos + i < buffer.length) {
      buffer[startPos + i] = value[i];
    }
  }
}

/**
 * Genera una linea SPR1 per il file TXT.
 * @param record - Il record SPR1 da esportare
 * @param firstTreatmentDate - Data opzionale del primo trattamento (fallback per data_val)
 */
export function generateSPR1Line(record: SPR1Record, firstTreatmentDate?: string): string {
  // Forza valori obbligatori con zeri invece di spazi
  const ore_prev_safe = record.ore_prev || "0";
  // Protesi: forza "2" se non è "1"
  const protesi_safe = record.protesi === "1" ? "1" : "2";
  
  // Calcola età per respGen: per maggiorenni (>= 18) deve essere SPAZIO, non "9"
  const age = calculateAge(record.datanasc, record.data_PIC);
  const respGen_safe = age >= 18 ? "" : (record.respGen || "");
  
  // Logica geografica: se regresu != 090 E != 999, forza accesso a 3
  let accesso_safe = record.accesso || "1";
  if (record.regresu && record.regresu !== "090" && record.regresu !== "999") {
    accesso_safe = "3";
  }
  
  // Gestione scale disabilità: usa i default dal dizionario ufficiale SCALEDIS
  // Scala 1: Glasgow Coma Scale (14), score 15 = normale
  // Scala 2: Dolore (06), score 0 = no dolore  
  // Scala 3: MMSE (05), score 30 = normale
  const scalaDis_1_safe = record.scalaDis_1 || SCALE_DEFAULTS.scala_1.codice;
  const disIngr_1_safe = record.disIngr_1 || SCALE_DEFAULTS.scala_1.score;
  
  const scalaDis_2_safe = (record.scalaDis_2 || "").trim() || SCALE_DEFAULTS.scala_2.codice;
  const disIngr_2_safe = (record.disIngr_2 || "").trim() || SCALE_DEFAULTS.scala_2.score;
  
  const scalaDis_3_safe = (record.scalaDis_3 || "").trim() || SCALE_DEFAULTS.scala_3.codice;
  const disIngr_3_safe = (record.disIngr_3 || "").trim() || SCALE_DEFAULTS.scala_3.score;
  
  const scalaDis_4_safe = (record.scalaDis_4 || "").trim() || "  ";
  const disIngr_4_safe = (record.disIngr_4 || "").trim() || "     ";
  
  const scalaDis_5_safe = (record.scalaDis_5 || "").trim() || "  ";
  const disIngr_5_safe = (record.disIngr_5 || "").trim() || "     ";
  
  const scalaDis_6_safe = (record.scalaDis_6 || "").trim() || "  ";
  const disIngr_6_safe = (record.disIngr_6 || "").trim() || "     ";
  
  // Auto-fill data_val: se vuota, usa il primo trattamento (se disponibile)
  const data_val_safe = record.data_val || firstTreatmentDate || "";
  
  // Auto-fix territoriale: rimappa lures storici al codice ISTAT attualmente valido,
  // poi ricalcola regresu e uslresu dal lures corretto.
  // GAUSS rifiuta codici ISTAT non più in vigore (es. 048034 Prato -> 100005, 048819 Pistoia -> 047014).
  let luresSafe = record.lures || '';
  if (luresSafe.trim()) {
    luresSafe = remapIstatToCurrent(luresSafe.trim());
  }
  let regresu_safe = record.regresu || '';
  let uslresu_safe = record.uslresu || '';
  if (luresSafe && luresSafe.trim()) {
    const comune = findComuneByIstat(luresSafe);
    if (comune) regresu_safe = comune.codiceRegione;
    const asl = findAslByComune(luresSafe);
    if (asl) uslresu_safe = asl;
  }

  // FIX GAUSS: codpres CON il punto (es. "405.1", "417.1") - GAUSS rifiuta "4051"/"4171"
  // Gestisce anche liste multiple separate da ";" (solo SPR1)
  const codpresNormalized = (record.codpres || '')
    .split(';')
    .map(c => c.trim())
    .filter(Boolean)
    .join(';');

  // FIX GAUSS: struttura forzata a "090MA7" (codice fisso Ass.C.A.)
  // In DB può esserci il codice UDO (110xxx) che GAUSS rifiuta sul campo struttura
  const strutturaSafe = '090MA7';

  let line = "";
  line += formatText(record.record, 1) + formatText(record.opera, 1) + formatText(record.codusl, 3) + formatText(strutturaSafe, 6);
  line += formatDateGGMMAAAA(record.data_PIC) + formatText(normalizeNpratForGauss(record.nprat), 10) + formatText(record.tipoindu, 1) + formatText(record.IDutente, 24);
  line += formatText(record.genere, 1) + formatDateGGMMAAAA(record.datanasc) + formatText(respGen_safe, 1) + formatText(record.cittu, 3);
  line += formatText(luresSafe, 6) + formatText(regresu_safe, 3) + formatText(uslresu_safe, 3) + formatText(record.statciv, 2);
  line += formatText(record.titstud, 1) + formatText(record.condprof, 1) + formatText(record.soggRich, 2) + formatText(record.setting, 1);
  const icd9Normalized = normalizeICD9ForGauss(record.ICD9CM) || record.ICD9CM || '';
  const icd9cNormalized = normalizeICD9ForGauss(record.ICD9CM_c) || record.ICD9CM_c || '';
  line += formatText(codpresNormalized, 8) + formatText(accesso_safe, 1) + formatText(icd9Normalized, 5) + formatText(icd9cNormalized, 5);
  // proroghe: campo NUMERICO -> se vuoto/0, esportare ZERI "000"
  const proroghe_safe = record.proroghe || "0";
  line += formatNumeric(proroghe_safe, 3) + formatNumeric(record.percent_SSN, 3) + formatText(record.pianif, 1) + formatDateGGMMAAAA(data_val_safe);
  line += formatText(record.care_giver, 1) + formatText(record.IntPRIPAI_1, 2) + formatText(record.IntPRIPAI_2, 2) + formatText(record.IntPRIPAI_3, 2);
  line += formatText(record.IntPRIPAI_4, 2) + formatText(record.IntPRIPAI_5, 2) + formatText(record.IntPRIPAI_6, 2);
  line += formatText(scalaDis_1_safe, 2) + formatText(disIngr_1_safe, 5) + formatText(scalaDis_2_safe, 2) + formatText(disIngr_2_safe, 5);
  line += formatText(scalaDis_3_safe, 2) + formatText(disIngr_3_safe, 5) + formatText(scalaDis_4_safe, 2) + formatText(disIngr_4_safe, 5);
  line += formatText(scalaDis_5_safe, 2) + formatText(disIngr_5_safe, 5) + formatText(scalaDis_6_safe, 2) + formatText(disIngr_6_safe, 5);
  line += formatText(record.vi_stabclin, 1) + formatText(record.vi_vitaq, 1) + formatText(record.vi_mob, 1) + formatText(record.vi_cogn, 1);
  line += formatText(record.vi_comp, 1) + formatText(record.vi_comu, 1) + formatText(record.vi_sensor, 1) + formatText(record.vi_bisogni, 1);
  line += formatText(record.vi_supsoc, 1) + formatText(protesi_safe, 1) + formatNumeric(record.durata_prev, 3) + formatNumeric(ore_prev_safe, 4);
  line += formatText(record.prof_MMGPLS, 1) + formatText(record.prof_spec, 1) + formatText(record.prof_inf, 1) + formatText(record.prof_oss, 1);
  line += formatText(record.prof_fisiot, 1) + formatText(record.prof_log, 1) + formatText(record.prof_terap_ev, 1) + formatText(record.prof_occup, 1);
  line += formatText(record.prof_psic, 1) + formatText(record.prof_as, 1) + formatText(record.prof_educ, 1) + formatText(record.prof_altri_san, 1);
  // FIX GAUSS: codese accetta codici esenzione TOSCANI alfanumerici (C02, C03, E01, L01,
  // B02, 0B02, 0A02, 0A31, 048, 013, 017…) oppure codici a 6 cifre numeriche.
  // Se il valore è un codice esenzione plausibile → normalizzalo (primo token alfanum,
  // uppercase, padded a 6 spazi) e NON addebitare ticket.
  // Se davvero vuoto / "000000" / "non esente" / "0" → fallback non-esente con ticket 38€.
  const { codese: codeseNormalized, isExempt } = normalizeCodese(record.codese);
  let imptickSafe = record.imptick;
  let quoricSafe = record.quoric;
  const impattSafe = record.impatt;
  if (!isExempt) {
    imptickSafe = '000038,00';
    quoricSafe = '00000,00';
  }
  line += formatText(record.d_prof_altri, 30) + formatEconomicZero(quoricSafe, 8) + formatEconomicZero(imptickSafe, 8) + formatEconomicZero(impattSafe, 8);
  line += formatText(codeseNormalized, 6) + formatText(record.Cognome, 20) + formatText(record.Nome, 20) + formatTextWithDefault(record.Progetto, 2, "00");
  line += formatTextWithDefault(record.Pacchetto, 2, "00") + formatTextWithDefault(record.Pres_inviante, 8, "00000000") + formatTextWithDefault(record.Distr_inviante, 2, "00") + formatTextWithDefault(record.Evento, 10, "0000000000");
  line += formatTextWithDefault(record.Quota, 1, "2") + formatTextWithDefault(record.Chiusura, 1, "0") + formatTextWithDefault(record.Localizzazione, 8, "00000000") + formatTextWithDefault(record.Gest_Tetto, 1, "0");
  line += formatText(record.Num_verbale, 12) + formatDateGGMMAAAA(record.Data_verbale);
  // SPR1: 359 caratteri esatti (lo spazio finale e CRLF vengono aggiunti manualmente nel buffer)
  return line.length < 359 ? line.padEnd(359, " ") : line.substring(0, 359);
}

export function generateSPR2Line(record: SPR2Record): string {
  // FIXED BUFFER PATTERN: Inizializza buffer di 166 caratteri tutti spazi
  const buffer: string[] = new Array(166).fill(' ');
  
  // CHIAVE (sempre presente) - Posizioni 0-27 (28 byte totali)
  writeAtPosition(buffer, formatText(record.record, 1), 0);           // pos 0
  writeAtPosition(buffer, formatText(record.codusl, 3), 1);           // pos 1-3
  writeAtPosition(buffer, formatText('090MA7', 6), 4);                // pos 4-9 (FIX GAUSS: struttura fissa)
  writeAtPosition(buffer, formatDateGGMMAAAA(record.data_PIC), 10);   // pos 10-17
  writeAtPosition(buffer, formatText(normalizeNpratForGauss(record.nprat), 10), 18); // pos 18-27 (FIX GAUSS: prefisso FA7)
  
  // DATI SPECIFICI alle coordinate assolute
  switch (record.record) {
    case "3": // TRATTAMENTO - Posizioni 28-68 (41 byte)
      // STRICT MODE: Always recalculate impres at export time
      const calculatedImpres = calculateImpres(record.tariffa, record.numpres);
      
      // FIX GAUSS: dataini/datafine forzati ai confini del mese di riferimento,
      // senza mai esportare dataini precedente a data_PIC (vincolo GAUSS bloccante).
      const { dataini: datainiSafe, datafine: datafineSafe } = computeMonthBoundaries(
        record.dataini, record.datafine, record.data_PIC
      );
      
      writeAtPosition(buffer, formatDateGGMMAAAA(datainiSafe), 28);      // pos 28-35
      writeAtPosition(buffer, formatDateGGMMAAAA(datafineSafe), 36);     // pos 36-43
      writeAtPosition(buffer, formatNumericZero(record.numpres || "0", 3), 44);    // pos 44-46
      
      // Handle undefined tariffa: export spaces if NULL, else format with zeros
      if (!record.tariffa || record.tariffa.trim() === "") {
        writeAtPosition(buffer, "        ", 47); // 8 spaces
      } else {
        writeAtPosition(buffer, formatEconomicZero(record.tariffa, 8), 47);   // pos 47-54
      }
      
      // Use recalculated impres: export "00000,00" if undefined (never spaces for currency)
      writeAtPosition(buffer, formatEconomicZero(calculatedImpres || "0", 8), 55);    // pos 55-62
      // FIX: compensa "N" non è valido per GAUSS → esporta spazio
      const compensaSafe = (!record.compensa || record.compensa === "N" || record.compensa.trim() === "") ? " " : record.compensa;
      writeAtPosition(buffer, formatText(compensaSafe, 1), 63);          // pos 63
      // FIX: Assicura che durata sia parsata correttamente anche se arriva come numero dal DB
      const durataValue = record.durata !== undefined && record.durata !== null && record.durata !== '' 
        ? record.durata 
        : "0";
      writeAtPosition(buffer, formatDurataOre(durataValue, 5), 64);       // pos 64-68 (ore con 1 decimale)
      break;
      
    case "4": // RIVALUTAZIONE - Posizioni 69-100 (32 byte)
      writeAtPosition(buffer, formatDateGGMMAAAA(record.dt_Rival_ValF), 69);    // pos 69-76
      writeAtPosition(buffer, formatText(record.motiv_RivalValF, 1), 77);       // pos 77
      
      // LOGICA CONDIZIONALE: Se confValPrec="1" (Sì), i campi clinici devono essere SPAZI
      const isConfirmed = record.confValPrec === "1";
      writeAtPosition(buffer, formatText(record.confValPrec, 1), 78);           // pos 78
      
      if (isConfirmed) {
        // Conferma Sì -> tutti i campi clinici diventano SPAZI
        writeAtPosition(buffer, "     ", 79);   // R_ICD9CM: 5 spazi
        writeAtPosition(buffer, "     ", 84);   // R_ICD9CM_c: 5 spazi
        writeAtPosition(buffer, " ", 89);       // trSocioRiab: 1 spazio
        writeAtPosition(buffer, " ", 90);       // rvf_stabclin: 1 spazio
        writeAtPosition(buffer, " ", 91);       // rvf_vitaq: 1 spazio
        writeAtPosition(buffer, " ", 92);       // rvf_mob: 1 spazio
        writeAtPosition(buffer, " ", 93);       // rvf_cogn: 1 spazio
        writeAtPosition(buffer, " ", 94);       // rvf_comp: 1 spazio
        writeAtPosition(buffer, " ", 95);       // rvf_comu: 1 spazio
        writeAtPosition(buffer, " ", 96);       // rvf_sensor: 1 spazio
        writeAtPosition(buffer, " ", 97);       // rvf_bisogni: 1 spazio
        writeAtPosition(buffer, " ", 98);       // rvf_supsoc: 1 spazio
        writeAtPosition(buffer, " ", 99);       // rvf_care_giver: 1 spazio
        writeAtPosition(buffer, " ", 100);      // rvf_protesi: 1 spazio
      } else {
        // Conferma No -> esporta i valori (o default "9")
        writeAtPosition(buffer, formatText(record.R_ICD9CM, 5), 79);              // pos 79-83
        writeAtPosition(buffer, formatText(record.R_ICD9CM_c, 5), 84);            // pos 84-88
        writeAtPosition(buffer, formatText(record.trSocioRiab, 1), 89);           // pos 89
        writeAtPosition(buffer, formatText(record.rvf_stabclin || "9", 1), 90);   // pos 90
        writeAtPosition(buffer, formatText(record.rvf_vitaq || "9", 1), 91);      // pos 91
        writeAtPosition(buffer, formatText(record.rvf_mob || "9", 1), 92);        // pos 92
        writeAtPosition(buffer, formatText(record.rvf_cogn || "9", 1), 93);       // pos 93
        writeAtPosition(buffer, formatText(record.rvf_comp || "9", 1), 94);       // pos 94
        writeAtPosition(buffer, formatText(record.rvf_comu || "9", 1), 95);       // pos 95
        writeAtPosition(buffer, formatText(record.rvf_sensor || "9", 1), 96);     // pos 96
        writeAtPosition(buffer, formatText(record.rvf_bisogni || "9", 1), 97);    // pos 97
        writeAtPosition(buffer, formatText(record.rvf_supsoc || "9", 1), 98);     // pos 98
        writeAtPosition(buffer, formatText(record.rvf_care_giver, 1), 99);        // pos 99
        writeAtPosition(buffer, formatText(record.rvf_protesi, 1), 100);          // pos 100
      }
      break;
      
    case "5": // SOSPENSIONE - Posizioni 101-117 (17 byte)
      writeAtPosition(buffer, formatDateGGMMAAAA(record.dataSosp_I), 101);  // pos 101-108
      writeAtPosition(buffer, formatDateGGMMAAAA(record.dataSosp_F), 109);  // pos 109-116
      writeAtPosition(buffer, formatText(record.motivo_Sosp, 1), 117);      // pos 117
      break;
      
    case "6": // CONCLUSIONE - Posizioni 118-165 (48 byte)
      writeAtPosition(buffer, formatDateGGMMAAAA(record.d_fineciclo), 118); // pos 118-125
      writeAtPosition(buffer, formatText(record.dim_ute, 2), 126);          // pos 126-127
      // Scale finali: GAUSS richiede SPAZI quando vuoti, MAI zeri "00000"
      writeAtPosition(buffer, formatText(record.disFinal_1, 5), 128);       // pos 128-132
      writeAtPosition(buffer, formatText(record.disFinal_2, 5), 133);       // pos 133-137
      writeAtPosition(buffer, formatText(record.disFinal_3, 5), 138);       // pos 138-142
      writeAtPosition(buffer, formatText(record.disFinal_4, 5), 143);       // pos 143-147
      writeAtPosition(buffer, formatText(record.disFinal_5, 5), 148);       // pos 148-152
      writeAtPosition(buffer, formatText(record.disFinal_6, 5), 153);       // pos 153-157
      writeAtPosition(buffer, formatDateGGMMAAAA(record.DriunioneF), 158);  // pos 158-165
      break;
  }
  
  // Ritorna stringa da buffer (esattamente 166 caratteri)
  return buffer.join('');
}

/**
 * Genera file SPR1 con buffer binario a dimensione fissa.
 * CRITICO: Ogni riga è esattamente 361 byte (359 dati + CR + LF)
 * 
 * @param records - Array di record SPR1
 * @param spr2Records - Array opzionale di record SPR2 per auto-fill data_val
 */
export async function generateSPR1File(records: SPR1Record[], spr2Records?: SPR2Record[]): Promise<Uint8Array> {
  // Inizializza dizionari territoriali per auto-fix regresu/uslresu da lures
  await initDizionari();
  const bytesPerRecord = 361; // 359 caratteri + CR + LF
  const totalBytes = records.length * bytesPerRecord;
  const buffer = new Uint8Array(totalBytes);
  
  // Crea mappa nprat -> primo trattamento per data_val fallback
  const firstTreatmentByNprat = new Map<string, string>();
  if (spr2Records) {
    // Raggruppa SPR2 per nprat e trova il primo trattamento (record = '3')
    const spr2ByNprat = new Map<string, SPR2Record[]>();
    for (const spr2 of spr2Records) {
      if (!spr2.nprat) continue;
      const existing = spr2ByNprat.get(spr2.nprat) || [];
      existing.push(spr2);
      spr2ByNprat.set(spr2.nprat, existing);
    }
    
    // Per ogni gruppo, trova il primo trattamento ordinato per dataini
    for (const [nprat, spr2List] of spr2ByNprat) {
      const treatments = spr2List
        .filter(s => s.record === '3' && s.dataini)
        .sort((a, b) => (a.dataini || '').localeCompare(b.dataini || ''));
      
      if (treatments.length > 0 && treatments[0].dataini) {
        firstTreatmentByNprat.set(nprat, treatments[0].dataini);
      }
    }
  }
  
  // Crea mappa nprat -> somma impres per calcolo impatt
  const impresSumByNprat = new Map<string, number>();
  if (spr2Records) {
    for (const spr2 of spr2Records) {
      if (!spr2.nprat || spr2.record !== '3') continue;
      const impres = calculateImpres(spr2.tariffa, spr2.numpres);
      const impresValue = parseCurrency(impres);
      if (impresValue) {
        const current = impresSumByNprat.get(spr2.nprat) || 0;
        impresSumByNprat.set(spr2.nprat, roundFinancial(current + impresValue, 2));
      }
    }
  }
  
  records.forEach((record, index) => {
    // Cerca il primo trattamento per questo paziente (fallback per data_val)
    const firstTreatmentDate = record.nprat ? firstTreatmentByNprat.get(record.nprat) : undefined;
    // FIX GAUSS: data_val obbligatoria → fallback finale a data_PIC se manca anche il primo trattamento
    const dataValFallback = firstTreatmentDate || record.data_PIC;

    // Ricalcola impatt: Σ impres(SPR2 type 3) - imptick - quoric.
    // Se codese non è una esenzione valida (toscana alfanum o 6-cifre), forza non-esente con ticket 38€.
    let recordToExport = record;
    if (record.nprat && impresSumByNprat.has(record.nprat)) {
      const totalImpres = impresSumByNprat.get(record.nprat)!;
      const { isExempt } = normalizeCodese(record.codese);
      const imptick = isExempt ? (parseCurrency(record.imptick) || 0) : 38;
      const quoric = isExempt ? (parseCurrency(record.quoric) || 0) : 0;
      const calculatedImpatt = Math.max(0, roundFinancial(totalImpres - imptick - quoric, 2));
      recordToExport = { ...record, impatt: calculatedImpatt.toFixed(2).replace('.', ',') };
    }

    const line = generateSPR1Line(recordToExport, dataValFallback); // 359 caratteri
    const offset = index * bytesPerRecord;

    // Copia i 359 caratteri della riga nel buffer (byte da 0 a 358)
    for (let i = 0; i < line.length && i < 359; i++) {
      buffer[offset + i] = line.charCodeAt(i) || 0x20;
    }

    // FORZA I TERMINATORI DI RIGA (byte 360 e 361)
    buffer[offset + 359] = 0x0D; // 13 = CR (\r)
    buffer[offset + 360] = 0x0A; // 10 = LF (\n)
  });
  
  return buffer;
}

// Genera file SPR2 con buffer binario a dimensione fissa
// CRITICO: Ogni riga è esattamente 167 byte (166 dati + LF)
export function generateSPR2File(records: SPR2Record[]): Uint8Array {
  const bytesPerRecord = 167; // 166 caratteri + LF
  const totalBytes = records.length * bytesPerRecord;
  const buffer = new Uint8Array(totalBytes);
  
  records.forEach((record, index) => {
    const line = generateSPR2Line(record); // 166 caratteri
    const offset = index * bytesPerRecord;
    
    // Copia i 166 caratteri della riga nel buffer (byte da 0 a 165)
    for (let i = 0; i < line.length && i < 166; i++) {
      buffer[offset + i] = line.charCodeAt(i) || 0x20;
    }
    
    // FORZA IL TERMINATORE UNIX (byte 167)
    buffer[offset + 166] = 0x0A; // 10 = LF (\n) - NIENTE CR!
  });
  
  return buffer;
}

// Converte stringa in Uint8Array con encoding Windows-1252 (1 byte per carattere)
function stringToWindows1252Bytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // ASCII standard (0-127) rimane identico
    if (code <= 0x7F) {
      bytes[i] = code;
    }
    // Spazio e caratteri comuni Windows-1252 (128-255)
    else if (code <= 0xFF) {
      bytes[i] = code;
    }
    // Caratteri fuori range -> spazio (già rimossi da removeAccents, ma safety check)
    else {
      bytes[i] = 0x20; // spazio
    }
  }
  return bytes;
}

// Download con buffer binario pre-costruito (senza conversione stringa)
export function downloadTxtFile(bytes: Uint8Array, filename: string) {
  // Verifica dimensione in byte (debug in console)
  console.log(`[TXT Export] File generato:`);
  console.log(`- Dimensione totale: ${bytes.length} byte`);
  
  // Calcola numero di righe in base alla dimensione
  const isSPR1 = bytes.length % 361 === 0;
  const isSPR2 = bytes.length % 167 === 0;
  
  if (isSPR1) {
    const numRecords = bytes.length / 361;
    console.log(`- Tipo: SPR1 (${numRecords} record x 361 byte/record)`);
    console.log(`- Struttura per record: 359 caratteri + CR + LF`);
  } else if (isSPR2) {
    const numRecords = bytes.length / 167;
    console.log(`- Tipo: SPR2 (${numRecords} record x 167 byte/record)`);
    console.log(`- Struttura per record: 166 caratteri + LF (Unix)`);
  }
  
  // Crea Blob direttamente dal buffer binario
  // Crea un nuovo ArrayBuffer per compatibilità TypeScript
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
