/**
 * GAUSS Validator - Pre-export validation for SPR1/SPR2 records
 * Ensures data integrity before generating TXT files
 */

import { SPR1Record, SPR2Record } from "@/types/spr";
import { validateMathConsistency, parseCurrency } from "./financial-utils";
import { findComuneByIstat } from "./dizionari-territoriali";
import { validateCodpresTariffa } from "./activity-classifier";

export interface ValidationError {
  type: string;
  recordIndex: number;
  recordType: "SPR1" | "SPR2";
  field?: string;
  message: string;
  severity: "error" | "warning";
  blocking: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  canExport: boolean;
}

/**
 * Find parent SPR1 record using composite key
 */
export function findParentSPR1(
  spr1Records: SPR1Record[],
  codusl: string,
  struttura: string,
  data_PIC: string,
  nprat: string
): SPR1Record | null {
  return (
    spr1Records.find(
      (spr1) =>
        spr1.codusl === codusl &&
        spr1.struttura === struttura &&
        spr1.data_PIC === data_PIC &&
        spr1.nprat === nprat
    ) || null
  );
}

/**
 * Generate composite key for SPR1-SPR2 linking
 */
export function generateCompositeKey(
  codusl: string,
  struttura: string,
  data_PIC: string,
  nprat: string
): string {
  return `${codusl}-${struttura}-${data_PIC}-${nprat}`;
}

/**
 * Verifica se una data produce un formato GGMMAAAA valido
 */
function isValidDateForExport(dateStr: string | undefined): boolean {
  if (!dateStr) return true; // campo vuoto è ok
  const cleaned = dateStr.replace(/[-/]/g, "");
  if (!/^\d{8}$/.test(cleaned)) return false;
  return true;
}

/**
 * Verifica se codese contiene solo caratteri alfanumerici
 */
function isValidCodiceEsenzione(codese: string | undefined): boolean {
  if (!codese || codese.trim() === '') return true;
  return /^[A-Za-z0-9]+$/.test(codese.trim());
}

/**
 * Comprehensive validation before GAUSS export
 */
export function validateForGauss(
  spr1Records: SPR1Record[],
  spr2Records: SPR2Record[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Validate SPR1-SPR2 key integrity
  spr2Records.forEach((spr2, idx) => {
    const parent = findParentSPR1(
      spr1Records,
      spr2.codusl || "",
      spr2.struttura || "",
      spr2.data_PIC || "",
      spr2.nprat || ""
    );

    if (!parent) {
      errors.push({
        type: "ORPHAN_SPR2",
        recordIndex: idx,
        recordType: "SPR2",
        message: `SPR2 #${idx + 1} (Tipo ${spr2.record}): Nessun SPR1 corrispondente trovato per chiave ${generateCompositeKey(spr2.codusl || "", spr2.struttura || "", spr2.data_PIC || "", spr2.nprat || "")}`,
        severity: "error",
        blocking: true,
      });
    }
  });

  // 2. Validate SPR2 has valid tariffa (not NULL/undefined) for Type 3
  spr2Records
    .filter((r) => r.record === "3")
    .forEach((spr2, idx) => {
      if (!spr2.tariffa || spr2.tariffa.trim() === "") {
        warnings.push({
          type: "MISSING_TARIFFA",
          recordIndex: idx,
          recordType: "SPR2",
          field: "tariffa",
          message: `SPR2 #${idx + 1} (Trattamento): Tariffa mancante, deve essere compilata manualmente`,
          severity: "warning",
          blocking: true,
        });
      }
    });

  // 3. Validate required fields for SPR1
  spr1Records.forEach((spr1, idx) => {
    if (!spr1.codusl || !spr1.struttura || !spr1.data_PIC || !spr1.nprat) {
      errors.push({
        type: "MISSING_KEY_FIELD",
        recordIndex: idx,
        recordType: "SPR1",
        message: `SPR1 #${idx + 1}: Campi chiave mancanti (codusl, struttura, data_PIC, nprat)`,
        severity: "error",
        blocking: true,
      });
    }

    if (!spr1.IDutente || spr1.IDutente.length !== 16) {
      errors.push({
        type: "INVALID_CF",
        recordIndex: idx,
        recordType: "SPR1",
        field: "IDutente",
        message: `SPR1 #${idx + 1}: Codice Fiscale mancante o non valido (richiesti 16 caratteri)`,
        severity: "error",
        blocking: true,
      });
    }

    // FIX: Validazione datanasc formato
    if (spr1.datanasc && !isValidDateForExport(spr1.datanasc)) {
      warnings.push({
        type: "INVALID_DATANASC",
        recordIndex: idx,
        recordType: "SPR1",
        field: "datanasc",
        message: `SPR1 #${idx + 1} (${spr1.Cognome}): Data nascita '${spr1.datanasc}' non convertibile a formato GGMMAAAA`,
        severity: "warning",
        blocking: false,
      });
    }

    // FIX: Validazione codese contiene solo alfanumerici
    if (spr1.codese && !isValidCodiceEsenzione(spr1.codese)) {
      warnings.push({
        type: "INVALID_CODESE",
        recordIndex: idx,
        recordType: "SPR1",
        field: "codese",
        message: `SPR1 #${idx + 1} (${spr1.Cognome}): Codice esenzione '${spr1.codese}' contiene caratteri non validi (punti, trattini). Verrà normalizzato in export.`,
        severity: "warning",
        blocking: false,
      });
    }

    // FIX: Validazione coerenza territoriale usando dizionario
    if (spr1.lures && spr1.regresu) {
      const comuneFromDict = findComuneByIstat(spr1.lures);
      const regioneCorretta = comuneFromDict?.codiceRegione;
      if (regioneCorretta && regioneCorretta !== spr1.regresu && spr1.regresu !== "999") {
        warnings.push({
          type: "TERRITORIAL_MISMATCH",
          recordIndex: idx,
          recordType: "SPR1",
          field: "lures/regresu",
          message: `SPR1 #${idx + 1} (${spr1.Cognome}): Incoerenza territoriale - comune '${spr1.lures}' ha regione '${regioneCorretta}' ma record ha '${spr1.regresu}'. Verrà corretto automaticamente in export.`,
          severity: "warning",
          blocking: false,
        });
      }
    }
  });

  // 4. Validate codese/imptick consistency
  spr1Records.forEach((spr1, idx) => {
    const imptickVal = parseFloat((spr1.imptick || '0').replace(',', '.'));
    const codese = (spr1.codese || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const isEsente = imptickVal === 0;
    
    if (isEsente && (!codese || codese === '0' || codese === '000000' || /^NONESE?$/i.test(spr1.codese || ''))) {
      warnings.push({
        type: "MISSING_CODESE_FOR_ESENTE",
        recordIndex: idx,
        recordType: "SPR1",
        field: "codese",
        message: `SPR1 #${idx + 1} (${spr1.Cognome}): Ticket=0 (esente) ma codice esenzione mancante o invalido`,
        severity: "warning",
        blocking: true,
      });
    }
    
    if (!isEsente && imptickVal <= 0 && (!codese || codese === '000000')) {
      warnings.push({
        type: "MISSING_TICKET_NON_ESENTE",
        recordIndex: idx,
        recordType: "SPR1",
        field: "imptick",
        message: `SPR1 #${idx + 1} (${spr1.Cognome}): Non esente ma ticket=0. Il ticket deve essere > 0 per soggetti senza esenzione`,
        severity: "warning",
        blocking: true,
      });
    }
  });

  // 5. Validate SPR2 dataini >= data_PIC
  spr2Records
    .filter((r) => r.record === "3")
    .forEach((spr2, idx) => {
      if (spr2.dataini && spr2.data_PIC) {
        const dini = spr2.dataini.replace(/[-/]/g, '');
        const dpic = spr2.data_PIC.replace(/[-/]/g, '');
        if (dini < dpic) {
          warnings.push({
            type: "DATAINI_BEFORE_PIC",
            recordIndex: idx,
            recordType: "SPR2",
            field: "dataini",
            message: `SPR2 #${idx + 1}: Data inizio (${spr2.dataini}) precedente a data PIC (${spr2.data_PIC}). Verrà corretta automaticamente in export.`,
            severity: "warning",
            blocking: false,
          });
        }
      }
    });

  // 6. Validate codpres/tariffa consistency for SPR2 Type 3
  spr2Records
    .filter((r) => r.record === "3")
    .forEach((spr2, idx) => {
      // 6a. Blocco esplicito: codpres concatenato in SPR2 non è ammesso
      if ((spr2.codpres || "").includes(";")) {
        errors.push({
          type: "SPR2_MULTI_CODPRES",
          recordIndex: idx,
          recordType: "SPR2",
          field: "codpres",
          message: `SPR2 #${idx + 1}: codpres concatenato ('${spr2.codpres}') non ammesso. Apri "Revisione SPR2 multi-codpres" nel Database Manager per splittare il record prima di esportare.`,
          severity: "error",
          blocking: true,
        });
        return;
      }
      const tariffaNum = parseCurrency(spr2.tariffa);
      const codpres = spr2.codpres || '';
      if (codpres && tariffaNum !== undefined) {
        const { isConsistent, expectedTariffa, message } = validateCodpresTariffa(codpres, tariffaNum);
        if (!isConsistent) {
          warnings.push({
            type: "CODPRES_TARIFFA_MISMATCH",
            recordIndex: idx,
            recordType: "SPR2",
            field: "tariffa/codpres",
            message: `SPR2 #${idx + 1}: ${message}`,
            severity: "warning",
            blocking: true,
          });
        }
      }
    });

  // 7. Validate required fields for SPR2 by type
  spr2Records.forEach((spr2, idx) => {
    // Compensa: valori ammessi per direttiva regionale: '0' (non soggetto) o '1' (soggetto a compensazione)
    if (spr2.compensa && spr2.compensa !== '0' && spr2.compensa !== '1') {
      warnings.push({
        type: "INVALID_COMPENSA",
        recordIndex: idx,
        recordType: "SPR2",
        field: "compensa",
        message: `SPR2 #${idx + 1}: Compensa='${spr2.compensa}' non valido. Valori ammessi: 0 (non soggetto) o 1 (soggetto a compensazione).`,
        severity: "warning",
        blocking: true,
      });
    }

    switch (spr2.record) {
      case "3": // Treatment
        if (!spr2.dataini || !spr2.datafine) {
          errors.push({
            type: "MISSING_REQUIRED_FIELD",
            recordIndex: idx,
            recordType: "SPR2",
            field: "dataini/datafine",
            message: `SPR2 #${idx + 1} (Trattamento): Date inizio/fine mancanti`,
            severity: "error",
            blocking: true,
          });
        }
        if (!spr2.numpres || parseInt(spr2.numpres) <= 0) {
          warnings.push({
            type: "INVALID_NUMPRES",
            recordIndex: idx,
            recordType: "SPR2",
            field: "numpres",
            message: `SPR2 #${idx + 1} (Trattamento): Numero prestazioni mancante o invalido`,
            severity: "warning",
            blocking: false,
          });
        }
        break;

      case "4": // Evaluation
        if (!spr2.dt_Rival_ValF) {
          errors.push({
            type: "MISSING_REQUIRED_FIELD",
            recordIndex: idx,
            recordType: "SPR2",
            field: "dt_Rival_ValF",
            message: `SPR2 #${idx + 1} (Rivalutazione): Data valutazione mancante`,
            severity: "error",
            blocking: true,
          });
        }
        break;

      case "5": // Suspension
        if (!spr2.dataSosp_I || !spr2.dataSosp_F) {
          errors.push({
            type: "MISSING_REQUIRED_FIELD",
            recordIndex: idx,
            recordType: "SPR2",
            field: "dataSosp_I/dataSosp_F",
            message: `SPR2 #${idx + 1} (Sospensione): Date sospensione mancanti`,
            severity: "error",
            blocking: true,
          });
        }
        break;

      case "6": // Conclusion
        if (!spr2.d_fineciclo) {
          errors.push({
            type: "MISSING_REQUIRED_FIELD",
            recordIndex: idx,
            recordType: "SPR2",
            field: "d_fineciclo",
            message: `SPR2 #${idx + 1} (Conclusione): Data fine ciclo mancante`,
            severity: "error",
            blocking: true,
          });
        }
        break;
    }
  });

  const blockingErrors = errors.filter((e) => e.blocking);
  const blockingWarnings = warnings.filter((w) => w.blocking);

  return {
    isValid: blockingErrors.length === 0 && blockingWarnings.length === 0,
    errors,
    warnings,
    canExport: blockingErrors.length === 0 && blockingWarnings.length === 0,
  };
}
