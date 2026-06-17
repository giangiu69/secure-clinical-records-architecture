import { SPR1Record } from "@/types/spr";
import { isValidICD9 } from "./icd9-lookup";
import { SCALE_DISABILITA } from "./scale-disabilita";

export interface ValidationError {
  field: keyof SPR1Record;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  recordIndex: number;
}

/**
 * Calcola l'età in anni tra due date in formato ggmmaaaa
 */
const calculateAge = (birthDate: string, referenceDate: string): number => {
  if (!birthDate || !referenceDate || birthDate.length !== 8 || referenceDate.length !== 8) {
    return 0;
  }
  
  const birthDay = parseInt(birthDate.substring(0, 2));
  const birthMonth = parseInt(birthDate.substring(2, 4));
  const birthYear = parseInt(birthDate.substring(4, 8));
  
  const refDay = parseInt(referenceDate.substring(0, 2));
  const refMonth = parseInt(referenceDate.substring(2, 4));
  const refYear = parseInt(referenceDate.substring(4, 8));
  
  let age = refYear - birthYear;
  
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age--;
  }
  
  return age;
};

/**
 * Converte data da formato YYYY-MM-DD a ggmmaaaa
 * Se la data è già in formato ggmmaaaa (8 cifre), la restituisce così com'è
 */
const convertDateToGGMMAAAA = (date: string): string => {
  if (!date) return "";
  
  // Se è già in formato ggmmaaaa (8 cifre senza separatori)
  if (/^\d{8}$/.test(date)) {
    return date;
  }
  
  // Altrimenti converte da YYYY-MM-DD
  const parts = date.split("-");
  if (parts.length !== 3) return "";
  return parts[2] + parts[1] + parts[0];
};

/**
 * Valida un singolo record SPR1 secondo le regole di obbligatorietà
 */
export const validateSPR1Record = (record: SPR1Record, index: number): ValidationResult => {
  const errors: ValidationError[] = [];

  // Campi sempre obbligatori
  const requiredFields: Array<{ field: keyof SPR1Record; label: string }> = [
    { field: "record", label: "Tipo Record" },
    { field: "opera", label: "Opera" },
    { field: "codusl", label: "Cod USL" },
    { field: "struttura", label: "Struttura" },
    { field: "data_PIC", label: "Data PIC" },
    { field: "nprat", label: "N° Pratica" },
    { field: "tipoindu", label: "Tipo Indu" },
    { field: "IDutente", label: "ID Utente" },
    { field: "genere", label: "Genere" },
    { field: "datanasc", label: "Data Nascita" },
    { field: "cittu", label: "Cittadinanza" },
    { field: "lures", label: "Comune Residenza" },
    { field: "regresu", label: "Regione Residenza" },
    { field: "uslresu", label: "USL Residenza" },
    { field: "statciv", label: "Stato Civile" },
    { field: "titstud", label: "Titolo Studio" },
    { field: "condprof", label: "Condizione Professionale" },
    { field: "soggRich", label: "Soggetto Richiedente" },
    { field: "setting", label: "Setting" },
    { field: "codpres", label: "Codice Prestazione" },
    { field: "accesso", label: "Accesso" },
    { field: "ICD9CM", label: "ICD9-CM Principale" },
    { field: "percent_SSN", label: "% SSN" },
    { field: "pianif", label: "Pianificazione" },
    { field: "data_val", label: "Data Valutazione" },
    { field: "care_giver", label: "Care Giver" },
    { field: "IntPRIPAI_1", label: "Primo Ambito Intervento" },
    { field: "scalaDis_1", label: "Prima Scala Disabilità" },
    { field: "disIngr_1", label: "Primo Punteggio Ingresso" },
    { field: "vi_stabclin", label: "VI Stabilità Clinica" },
    { field: "vi_vitaq", label: "VI Qualità Vita" },
    { field: "vi_mob", label: "VI Mobilità" },
    { field: "vi_cogn", label: "VI Cognitivo" },
    { field: "vi_comp", label: "VI Comportamento" },
    { field: "vi_comu", label: "VI Comunicazione" },
    { field: "vi_sensor", label: "VI Sensoriale" },
    { field: "vi_bisogni", label: "VI Bisogni" },
    { field: "vi_supsoc", label: "VI Supporto Sociale" },
    { field: "protesi", label: "Protesi" },
    { field: "durata_prev", label: "Durata Prevista" },
    { field: "ore_prev", label: "Ore Previste" },
    { field: "prof_MMGPLS", label: "MMG/PLS" },
    { field: "prof_spec", label: "Specialista" },
    { field: "prof_inf", label: "Infermiere" },
    { field: "prof_oss", label: "OSS" },
    { field: "prof_fisiot", label: "Fisioterapista" },
    { field: "prof_log", label: "Logopedista" },
    { field: "prof_terap_ev", label: "Terapista Evolutivo" },
    { field: "prof_occup", label: "Terapista Occupazionale" },
    { field: "prof_psic", label: "Psicologo" },
    { field: "prof_as", label: "Assistente Sociale" },
    { field: "prof_educ", label: "Educatore" },
    { field: "prof_altri_san", label: "Altri Sanitari" },
    { field: "quoric", label: "Quota Ricetta" },
    { field: "imptick", label: "Importo Ticket" },
    { field: "impatt", label: "Importo Netto" },
  ];

  // Verifica campi sempre obbligatori
  requiredFields.forEach(({ field, label }) => {
    const value = record[field];
    const strValue = value != null ? String(value) : '';
    if (!value || strValue.trim() === "") {
      errors.push({ field, message: `${label} è obbligatorio` });
    }
  });

  // Validazione condizionale: respGen obbligatorio se minorenne
  if (record.datanasc && record.data_PIC) {
    const birthDateGGMMAAAA = convertDateToGGMMAAAA(record.datanasc);
    const picDateGGMMAAAA = convertDateToGGMMAAAA(record.data_PIC);
    const age = calculateAge(birthDateGGMMAAAA, picDateGGMMAAAA);
    
    if (age < 18 && (!record.respGen || record.respGen.trim() === "")) {
      errors.push({ 
        field: "respGen", 
        message: "Responsabile Genitoriale è obbligatorio per i minorenni" 
      });
    }
  }

  // Validazione condizionale: proroghe obbligatorio se accesso = 2
  if (record.accesso === "2" && (!record.proroghe || record.proroghe.trim() === "")) {
    errors.push({ 
      field: "proroghe", 
      message: "Proroghe è obbligatorio quando Accesso = 2 (autorizzazione)" 
    });
  }

  // Validazione ICD9-CM: verifica che il codice esista nel dizionario ufficiale
  if (record.ICD9CM && record.ICD9CM.trim() !== "") {
    const icd9Clean = record.ICD9CM.trim().replace(/\./g, '').toUpperCase();
    if (!isValidICD9(icd9Clean)) {
      errors.push({
        field: "ICD9CM",
        message: `Codice ICD9-CM "${record.ICD9CM}" non trovato nel dizionario ufficiale`
      });
    }
  }

  if (record.ICD9CM_c && record.ICD9CM_c.trim() !== "") {
    const icd9cClean = record.ICD9CM_c.trim().replace(/\./g, '').toUpperCase();
    if (!isValidICD9(icd9cClean)) {
      errors.push({
        field: "ICD9CM_c",
        message: `Codice ICD9-CM concomitante "${record.ICD9CM_c}" non trovato nel dizionario ufficiale`
      });
    }
  }

  // Validazione condizionale: scale disabilità 2-6
  const scaleFields: Array<{ scala: keyof SPR1Record; punteggio: keyof SPR1Record }> = [
    { scala: "scalaDis_2", punteggio: "disIngr_2" },
    { scala: "scalaDis_3", punteggio: "disIngr_3" },
    { scala: "scalaDis_4", punteggio: "disIngr_4" },
    { scala: "scalaDis_5", punteggio: "disIngr_5" },
    { scala: "scalaDis_6", punteggio: "disIngr_6" },
  ];

  scaleFields.forEach(({ scala, punteggio }) => {
    const scalaValue = record[scala] != null ? String(record[scala]) : '';
    const punteggioValue = record[punteggio] != null ? String(record[punteggio]) : '';
    if (scalaValue.trim() !== "" && punteggioValue.trim() === "") {
      errors.push({ 
        field: punteggio, 
        message: `Punteggio obbligatorio quando ${scala} è compilato` 
      });
    }
  });

  // Validazione MIN/MAX punteggi scale disabilità (da SCALEDIS.xlsx ufficiale)
  const allScaleFields: Array<{ scala: keyof SPR1Record; punteggio: keyof SPR1Record; label: string }> = [
    { scala: "scalaDis_1", punteggio: "disIngr_1", label: "Scala 1" },
    { scala: "scalaDis_2", punteggio: "disIngr_2", label: "Scala 2" },
    { scala: "scalaDis_3", punteggio: "disIngr_3", label: "Scala 3" },
    { scala: "scalaDis_4", punteggio: "disIngr_4", label: "Scala 4" },
    { scala: "scalaDis_5", punteggio: "disIngr_5", label: "Scala 5" },
    { scala: "scalaDis_6", punteggio: "disIngr_6", label: "Scala 6" },
  ];

  allScaleFields.forEach(({ scala, punteggio, label }) => {
    const scalaCode = record[scala] != null ? String(record[scala]).trim() : '';
    const punteggioStr = record[punteggio] != null ? String(record[punteggio]).trim() : '';
    
    if (scalaCode && punteggioStr) {
      const scaleInfo = SCALE_DISABILITA[scalaCode.padStart(2, "0")];
      if (scaleInfo && typeof scaleInfo.min === 'number' && typeof scaleInfo.max === 'number') {
        const score = parseInt(punteggioStr, 10);
        if (!isNaN(score) && (score < scaleInfo.min || score > scaleInfo.max)) {
          errors.push({
            field: punteggio,
            message: `${label} (${scaleInfo.nome}): punteggio ${score} fuori range ${scaleInfo.min}-${scaleInfo.max}`
          });
        }
      }
    }
  });

  // Validazione condizionale: d_prof_altri obbligatorio se prof_altri_san = 1
  if (record.prof_altri_san === "1" && (!record.d_prof_altri || record.d_prof_altri.trim() === "")) {
    errors.push({ 
      field: "d_prof_altri", 
      message: "Descrizione Altri Sanitari è obbligatoria quando Altri Sanitari = Sì" 
    });
  }

  // Helper function per normalizzare controllo ticket zero
  const isTicketZero = (value: string): boolean => {
    if (!value || value.trim() === "") return true;
    const normalized = value.replace(/,/g, '.').replace(/^0+/, '') || '0';
    const numValue = parseFloat(normalized);
    return numValue === 0 || value === "00000,00";
  };

  // Validazione condizionale: codese obbligatorio se imptick = 0
  if (isTicketZero(record.imptick) && (!record.codese || record.codese.trim() === "" || record.codese === "000000")) {
    errors.push({ 
      field: "codese", 
      message: "Codice Esenzione è obbligatorio quando Importo Ticket = 0" 
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    recordIndex: index,
  };
};

/**
 * Valida tutti i record SPR1
 */
export const validateAllSPR1Records = (records: SPR1Record[]): ValidationResult[] => {
  return records.map((record, index) => validateSPR1Record(record, index));
};
