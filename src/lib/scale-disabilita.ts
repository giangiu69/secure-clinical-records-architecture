// Auto-generated from SCALEDIS.xlsx - Regione Toscana
// Dizionario ufficiale delle scale di disabilità per GAUSS

export interface ScalaDisabilita {
  codice: string;
  nome: string;
  min: number | string;
  max: number | string;
}

export const SCALE_DISABILITA: Record<string, ScalaDisabilita> = {
  "01": { codice: "01", nome: "Level of Activity in Profound/Severe Mental Retardation", min: 0, max: 13 },
  "02": { codice: "02", nome: "Indice di Barthel", min: 0, max: 100 },
  "03": { codice: "03", nome: "Indice di Katz", min: 0, max: 6 },
  "04": { codice: "04", nome: "Instrumental activities daily living", min: 0, max: 8 },
  "05": { codice: "05", nome: "Mini-Mental State Examination", min: 0, max: 30 },
  "06": { codice: "06", nome: "Scala di valutazione del dolore", min: 0, max: 10 },
  "07": { codice: "07", nome: "American Spinal Injury Association", min: "C01A", max: "T12E" },
  "08": { codice: "08", nome: "Walking Index for Spinal Cord Injury", min: 0, max: 20 },
  "09": { codice: "09", nome: "Spinal Cord Independence Measure", min: 0, max: 100 },
  "10": { codice: "10", nome: "Scala Level of cognitive functioning", min: 1, max: 8 },
  "11": { codice: "11", nome: "Disability Rating Scale", min: 0, max: 29 },
  "12": { codice: "12", nome: "Test del cammino dei 6 minuti", min: 0, max: 800 },
  "13": { codice: "13", nome: "Scala Barthel - Dispnea", min: 0, max: 100 },
  "14": { codice: "14", nome: "Glasgow Coma Scale", min: 3, max: 15 },
  "15": { codice: "15", nome: "Glasgow Coma Scale Extended", min: 1, max: 8 },
  "16": { codice: "16", nome: "Scala di Rankin", min: 0, max: 5 },
  "17": { codice: "17", nome: "Rehabilitation Complexity Scale", min: 0, max: 26 },
  "18": { codice: "18", nome: "Pediatric Evaluation of Disability Inventory", min: 0, max: 100 },
  "19": { codice: "19", nome: "Gross Motor Function Classification System", min: 1, max: 5 },
  "20": { codice: "20", nome: "Scala Tinetti", min: 0, max: 28 },
  "21": { codice: "21", nome: "Scheda di Valutazione Multidimensionale della Disabilità", min: 0, max: 22 },
  "22": { codice: "22", nome: "altro", min: 0, max: 99999 },
  "99": { codice: "99", nome: "dato mancante", min: 0, max: 0 },
};

/**
 * Valida il codice di una scala di disabilità.
 */
export function isValidScala(codice: string): boolean {
  return codice.padStart(2, "0") in SCALE_DISABILITA;
}

/**
 * Valida un punteggio rispetto ai limiti MIN/MAX della scala.
 * Restituisce null se valido, messaggio d'errore se fuori range.
 */
export function validateScalaPunteggio(codiceSc: string, punteggio: number): string | null {
  const scala = SCALE_DISABILITA[codiceSc.padStart(2, "0")];
  if (!scala) return `Scala "${codiceSc}" non trovata nel dizionario ufficiale`;
  if (typeof scala.min === "string" || typeof scala.max === "string") return null; // scale non numeriche (es. ASIA)
  if (punteggio < scala.min || punteggio > scala.max) {
    return `Punteggio ${punteggio} fuori range per ${scala.nome} (${scala.min}-${scala.max})`;
  }
  return null;
}

/**
 * Default per l'export GAUSS quando il paziente non ha valutazione clinica.
 * Scala 1: Glasgow Coma Scale (14), score default 15 (normale)
 * Scala 2: Dolore (06), score default 0 (nessun dolore)
 * Scala 3: MMSE (05), score default 30 (normale)
 */
export const SCALE_DEFAULTS = {
  scala_1: { codice: "14", score: "00015" }, // Glasgow: 15 = normale
  scala_2: { codice: "06", score: "00000" }, // Dolore: 0 = no dolore
  scala_3: { codice: "05", score: "00030" }, // MMSE: 30 = normale
} as const;
