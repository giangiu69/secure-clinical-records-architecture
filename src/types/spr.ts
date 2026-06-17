// Tipi per i record SPR1 e SPR2

export interface SPR1Record {
  record: string; opera: string; codusl: string; struttura: string; data_PIC: string; nprat: string;
  tipoindu: string; IDutente: string; genere: string; datanasc: string; respGen: string; cittu: string;
  lures: string; regresu: string; uslresu: string; statciv: string; titstud: string; condprof: string;
  soggRich: string; setting: string; codpres: string; accesso: string; ICD9CM: string; ICD9CM_c: string;
  proroghe: string; percent_SSN: string; pianif: string; data_val: string; care_giver: string;
  IntPRIPAI_1: string; IntPRIPAI_2: string; IntPRIPAI_3: string; IntPRIPAI_4: string; IntPRIPAI_5: string; IntPRIPAI_6: string;
  scalaDis_1: string; disIngr_1: string; scalaDis_2: string; disIngr_2: string; scalaDis_3: string; disIngr_3: string;
  scalaDis_4: string; disIngr_4: string; scalaDis_5: string; disIngr_5: string; scalaDis_6: string; disIngr_6: string;
  vi_stabclin: string; vi_vitaq: string; vi_mob: string; vi_cogn: string; vi_comp: string; vi_comu: string;
  vi_sensor: string; vi_bisogni: string; vi_supsoc: string; protesi: string; durata_prev: string; ore_prev: string;
  prof_MMGPLS: string; prof_spec: string; prof_inf: string; prof_oss: string; prof_fisiot: string; prof_log: string;
  prof_terap_ev: string; prof_occup: string; prof_psic: string; prof_as: string; prof_educ: string; prof_altri_san: string;
  d_prof_altri: string; quoric: string; imptick: string; impatt: string; codese: string;
  Cognome: string; Nome: string; comnasu: string; Progetto: string; Pacchetto: string; Pres_inviante: string; Distr_inviante: string;
  Evento: string; Quota: string; Chiusura: string; Localizzazione: string; Gest_Tetto: string; Num_verbale: string; Data_verbale: string;
  // Campi interni (non esportati in TXT)
  _excelTipologia?: string;
  _excelSpecifica?: string;
  _orePreviste?: number;
  _importoPrevisto?: number;
  _dbId?: string;
}

export interface SPR2Record {
  record: string; codusl: string; struttura: string; data_PIC: string; nprat: string;
  dataini?: string; datafine?: string; numpres?: string; tariffa?: string; impres?: string; compensa?: string; durata?: string;
  codpres?: string;  // Codice prestazione (405.1 o 417.1)
  dt_Rival_ValF?: string; motiv_RivalValF?: string; confValPrec?: string; R_ICD9CM?: string; R_ICD9CM_c?: string; trSocioRiab?: string;
  rvf_stabclin?: string; rvf_vitaq?: string; rvf_mob?: string; rvf_cogn?: string; rvf_comp?: string; rvf_comu?: string;
  rvf_sensor?: string; rvf_bisogni?: string; rvf_supsoc?: string; rvf_care_giver?: string; rvf_protesi?: string;
  dataSosp_I?: string; dataSosp_F?: string; motivo_Sosp?: string;
  d_fineciclo?: string; dim_ute?: string; disFinal_1?: string; disFinal_2?: string; disFinal_3?: string;
  disFinal_4?: string; disFinal_5?: string; disFinal_6?: string; DriunioneF?: string;
  // Campi interni (non esportati in TXT)
  _remoteHours?: number;
  _inPersonHours?: number;
  _spr1Id?: string;
  _dbId?: string;
  is_remote?: boolean;  // Flag per sessioni erogate da remoto (non esportato in TXT)
}

// ========================================
// OPZIONI CONFORMI ALLE SPECIFICHE GAUSS
// ========================================

export const GENERE_OPTIONS = [
  { value: "1", label: "1 - Maschio" }, 
  { value: "2", label: "2 - Femmina" }
];

export const SI_NO_OPTIONS = [
  { value: "1", label: "1 - Sì" }, 
  { value: "2", label: "2 - No" }
];

export const RESP_GEN_OPTIONS = [
  { value: "1", label: "1 - Madre" }, 
  { value: "2", label: "2 - Padre" }, 
  { value: "9", label: "9 - Dato Mancante" }, 
  { value: " ", label: "Vuoto (maggiorenne)" }
];

// SETTING - Codifica GAUSS corretta
export const SETTING_OPTIONS = [
  { value: "1", label: "1 - Ricovero ospedaliero" },
  { value: "2", label: "2 - Day Hospital" },
  { value: "3", label: "3 - Domiciliare" },
  { value: "4", label: "4 - Residenziale" },
  { value: "5", label: "5 - Semiresidenziale" },
  { value: "8", label: "8 - Ambulatoriale" },
  { value: "9", label: "9 - Altro" }
];

// ACCESSO - Codifica GAUSS corretta
export const ACCESSO_OPTIONS = [
  { value: "1", label: "1 - Programmato" }, 
  { value: "2", label: "2 - Con autorizzazione" },
  { value: "3", label: "3 - Extraregionale" },
  { value: "4", label: "4 - Altro" }
];

// STATO CIVILE - Codifica GAUSS completa
export const STATO_CIVILE_OPTIONS = [
  { value: "1", label: "1 - Celibe/nubile" }, 
  { value: "2", label: "2 - Coniugato/a" }, 
  { value: "3", label: "3 - Vedovo/a" },
  { value: "4", label: "4 - Divorziato/a" },
  { value: "5", label: "5 - Separato/a" },
  { value: "9", label: "9 - Non Rilevato / Ignoto" }
];

// TITOLO STUDIO - Codifica GAUSS completa
export const TITOLO_STUDIO_OPTIONS = [
  { value: "1", label: "1 - Nessuno" }, 
  { value: "2", label: "2 - Licenza elementare" }, 
  { value: "3", label: "3 - Licenza media" },
  { value: "4", label: "4 - Diploma" },
  { value: "5", label: "5 - Laurea" },
  { value: "9", label: "9 - Non Rilevato / Ignoto" }
];

// CONDIZIONE PROFESSIONALE - Codifica GAUSS completa
export const CONDIZIONE_PROF_OPTIONS = [
  { value: "1", label: "1 - Occupato" }, 
  { value: "2", label: "2 - Disoccupato" }, 
  { value: "3", label: "3 - Studente" },
  { value: "4", label: "4 - Pensionato" },
  { value: "5", label: "5 - Casalinga" },
  { value: "9", label: "9 - Non Rilevato / Ignoto" }
];

// SOGGETTO RICHIEDENTE - Codifica ufficiale Regione Toscana (da SOGGETTO_RICHIEDENTE.xlsx)
export const SOGG_RICH_OPTIONS = [
  { value: "AA", label: "AA - Altro" },
  { value: "C1", label: "C1 - Accesso spontaneo" },
  { value: "C2", label: "C2 - Programmato in precedente accesso" },
  { value: "C3", label: "C3 - MMG/PLS" },
  { value: "C4", label: "C4 - Ostetricia-ginecologia ospedale" },
  { value: "C5", label: "C5 - Servizi sociali/centri per le famiglie" },
  { value: "C6", label: "C6 - Screening" },
  { value: "C7", label: "C7 - Tribunale" },
  { value: "C8", label: "C8 - Altri servizi sanitari/sociosanitari" },
  { value: "C9", label: "C9 - Associazioni del terzo settore" },
  { value: "NN", label: "NN - Non noto" },
  { value: "R1", label: "R1 - Specialista ambulatoriale" },
  { value: "R2", label: "R2 - MMG/PLS" },
  { value: "R3", label: "R3 - Ospedale reparto acuti" },
  { value: "R4", label: "R4 - Ospedale reparto riabilitazione/lungodegenza" },
  { value: "R5", label: "R5 - Struttura residenziale/semiresidenziale riabilitativa" },
  { value: "R6", label: "R6 - Servizi territoriali (disabilità, NPI, salute mentale)" },
  { value: "R7", label: "R7 - Centrale Operativa Territoriale" },
  { value: "R9", label: "R9 - Dato mancante" },
];

export const RECORD_TYPE_OPTIONS = [
  { value: "3", label: "3 - Trattamento" }, 
  { value: "4", label: "4 - Rivalutazione" }, 
  { value: "5", label: "5 - Sospensione" }, 
  { value: "6", label: "6 - Conclusione" }
];

export const MOTIVO_RIVAL_OPTIONS = [
  { value: "1", label: "1 - Rivalutazione" }, 
  { value: "2", label: "2 - Valutazione finale" }
];

// MOTIVO SOSPENSIONE - Codifica GAUSS Toscana
export const MOTIVO_SOSP_OPTIONS = [
  { value: "1", label: "1 - Ricovero temporaneo in ospedale" },
  { value: "2", label: "2 - Allontanamento temporaneo" },
  { value: "3", label: "3 - Altro" }
];

// DIMISSIONE UTENTE - Codifica GAUSS Toscana completa
export const DIM_UTE_OPTIONS = [
  { value: "00", label: "00 - Dimissione a seguito di pieno recupero" },
  { value: "01", label: "01 - Dimissione ordinaria per conclusione ciclo" },
  { value: "02", label: "02 - Dimissione con attivazione assistenza domiciliare" },
  { value: "03", label: "03 - Dimissione con invio cure ambulatoriali specialistiche" },
  { value: "04", label: "04 - Dimissione con invio presso struttura semiresidenziale" },
  { value: "05", label: "05 - Dimissioni con invio presso struttura residenziale" },
  { value: "06", label: "06 - Dimissioni con invio presso struttura ospedaliera" },
  { value: "07", label: "07 - Decesso" },
  { value: "08", label: "08 - Inserimento in programmi di Sanità di iniziativa" },
  { value: "09", label: "09 - Altro" },
  { value: "10", label: "10 - Dimissione con attivazione trattamenti a distanza" }
];
