// Auto-generated from SOGGETTO_RICHIEDENTE.xlsx - Regione Toscana

export interface SoggettoRichiedente {
  codice: string;
  descrizione: string;
}

export const SOGGETTI_RICHIEDENTI: SoggettoRichiedente[] = [
  { codice: "AA", descrizione: "Altro" },
  { codice: "C1", descrizione: "Accesso spontaneo" },
  { codice: "C2", descrizione: "Programmato in precedente accesso" },
  { codice: "C3", descrizione: "MMG/PLS" },
  { codice: "C4", descrizione: "Ostetricia-ginecologia ospedale" },
  { codice: "C5", descrizione: "Servizi sociali/centri per le famiglie" },
  { codice: "C6", descrizione: "Screening" },
  { codice: "C7", descrizione: "Tribunale" },
  { codice: "C8", descrizione: "Altri servizi sanitari/sociosanitari" },
  { codice: "C9", descrizione: "Associazioni del terzo settore" },
  { codice: "NN", descrizione: "Non noto" },
  { codice: "R1", descrizione: "Specialista ambulatoriale" },
  { codice: "R2", descrizione: "MMG/PLS" },
  { codice: "R3", descrizione: "Ospedale reparto acuti" },
  { codice: "R4", descrizione: "Ospedale reparto riabilitazione/lungodegenza" },
  { codice: "R5", descrizione: "Struttura residenziale o semiresidenziale riabilitativa" },
  { codice: "R6", descrizione: "Servizi territoriali (disabilità, NPI, salute mentale, consultori)" },
  { codice: "R7", descrizione: "Centrale Operativa Territoriale" },
  { codice: "R9", descrizione: "Dato mancante" },
];

export function isValidSoggettoRichiedente(codice: string): boolean {
  return SOGGETTI_RICHIEDENTI.some(s => s.codice === codice.toUpperCase());
}
