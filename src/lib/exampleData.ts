import { SPR1Record, SPR2Record } from "@/types/spr";

/**
 * Esempio semplificato validato GAUSS - Paziente Mario Rossi
 * Dati conformi alle specifiche SPR v2.1 con valori "salvagente" (9)
 */

export const exampleSPR1: SPR1Record = {
  // Campi identificativi
  record: "1",
  opera: "1",
  codusl: "104", // USL Toscana Centro (FISSO)
  struttura: "090MA7", // Codice Regionale Ass.C.A. (FISSO)
  data_PIC: "2024-06-15", // ISO format per input type="date"
  nprat: "20240001",
  
  // Dati anagrafici utente
  tipoindu: "1",
  IDutente: "RSSMRA80A01H501X",
  genere: "1",
  datanasc: "1980-01-01", // ISO format
  Cognome: "ROSSI",
  Nome: "MARIO",
  comnasu: "H501", // Roma
  respGen: "", // VUOTO (Maggiorenne)
  cittu: "100", // Italia
  lures: "048017", // Firenze (ISTAT) - Default Modificabile
  regresu: "090", // Toscana - Default Modificabile
  uslresu: "104", // USL Toscana Centro - Default Modificabile
  statciv: "9", // Non Rilevato
  
  // Dati socio-culturali
  titstud: "9", // Default: Non Rilevato
  condprof: "9", // Default: Non Rilevato
  soggRich: "01",
  
  // Dati riabilitativi
  setting: "8", // Ambulatoriale - Default Modificabile
  codpres: "93111",
  accesso: "1", // Programmato - Default Modificabile
  ICD9CM: "7159", // Diagnosi semplificata
  ICD9CM_c: "", // Nessuna concomitante
  proroghe: "", // Non applicabile (accesso = 1)
  percent_SSN: "100",
  pianif: "1",
  data_val: "2024-06-15", // ISO format
  
  // Valutazione iniziale
  care_giver: "1",
  IntPRIPAI_1: "b7",
  IntPRIPAI_2: "",
  IntPRIPAI_3: "",
  IntPRIPAI_4: "",
  IntPRIPAI_5: "",
  IntPRIPAI_6: "",
  scalaDis_1: "01",
  disIngr_1: "00090",
  scalaDis_2: "",
  disIngr_2: "",
  scalaDis_3: "",
  disIngr_3: "",
  scalaDis_4: "",
  disIngr_4: "",
  scalaDis_5: "",
  disIngr_5: "",
  scalaDis_6: "",
  disIngr_6: "",
  vi_stabclin: "9", // Default salvagente
  vi_vitaq: "9",
  vi_mob: "9",
  vi_cogn: "9",
  vi_comp: "9",
  vi_comu: "9",
  vi_sensor: "9",
  vi_bisogni: "9",
  vi_supsoc: "9",
  protesi: "2", // No
  
  // Programmazione (Team Standard Ass.C.A.)
  durata_prev: "10",
  ore_prev: "10",
  prof_MMGPLS: "2", // No
  prof_spec: "2",
  prof_inf: "2",
  prof_oss: "2",
  prof_fisiot: "1", // Sì - Team Standard
  prof_log: "1", // Sì - Team Standard
  prof_terap_ev: "2",
  prof_occup: "2",
  prof_psic: "1", // Sì - Team Standard
  prof_as: "2",
  prof_educ: "1", // Sì - Team Standard
  prof_altri_san: "2",
  d_prof_altri: "",
  
  // Dati economici
  quoric: "0.00",
  imptick: "0.00",
  impatt: "200.00",
  codese: "E01000", // Obbligatorio se ticket = 0
  
  // Campi aggiuntivi
  Progetto: "SM",
  Pacchetto: "00",
  Pres_inviante: "00000000",
  Distr_inviante: "00",
  Evento: "0000000000",
  Quota: "2", // FISSO: Quota Fissa
  Chiusura: "3",
  Localizzazione: "00000000",
  Gest_Tetto: "0", // FISSO
  Num_verbale: "",
  Data_verbale: "",
};

export const exampleSPR2: SPR2Record[] = [
  // Record tipo 3: Trattamento semplice validato GAUSS
  {
    record: "3",
    // Le chiavi saranno sincronizzate da SPR1 al momento del caricamento
    codusl: "104", // USL Toscana Centro (sincronizzato da SPR1)
    struttura: "090MA7", // Codice Regionale Ass.C.A. (sincronizzato da SPR1)
    data_PIC: "2024-06-15", // ISO format
    nprat: "20240001",
    dataini: "2024-06-15",
    datafine: "2024-06-25",
    numpres: "10",
    tariffa: "20.00",
    impres: "200.00",
    compensa: "0",
    durata: "600", // 10 ore * 60 min
  },
];
