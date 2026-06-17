import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SPR1Record, SPR2Record } from "@/types/spr";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// === MOTORE DI EXPORT (CONFIGURAZIONE USL 201 + SPAZI) ===
// ==========================================

const charMap: { [key: string]: number } = {
  à: 0xe0,
  è: 0xe8,
  é: 0xe9,
  ì: 0xec,
  ò: 0xf2,
  ù: 0xf9,
  À: 0xc0,
  È: 0xc8,
  É: 0xc9,
  Ì: 0xcc,
  Ò: 0xd2,
  Ù: 0xd9,
  "°": 0xb0,
  "€": 0x80,
  "'": 0x27,
};

const stringToBytes = (
  str: string | undefined | null,
  length: number,
  align: "left" | "right",
  padChar: number,
): Uint8Array => {
  const buffer = new Uint8Array(length).fill(padChar);
  const safeStr = str ? String(str) : "";
  const cleanStr = safeStr.substring(0, length);
  const strBytes = new Uint8Array(cleanStr.length);
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    strBytes[i] = charMap[char] || char.charCodeAt(0);
  }
  if (align === "left") {
    buffer.set(strBytes, 0);
  } else {
    buffer.set(strBytes, length - strBytes.length);
  }
  return buffer;
};

const formatDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`;
  return isoDate.replace(/[^0-9]/g, "");
};

const formatMoney = (val: string | undefined): string => {
  if (!val || val === "0") return "00000,00";
  let clean = val.replace(".", ",");
  if (!clean.includes(",")) clean += ",00";
  else {
    const parts = clean.split(",");
    if (parts[1].length === 1) clean += "0";
  }
  return clean;
};

// Helpers: TXT usa spazio (32), NUM usa zero (48)
const txt = (val: any, len: number) => stringToBytes(val, len, "left", 32);
const num = (val: any, len: number) => stringToBytes(val, len, "right", 48);
const date = (val: any) => stringToBytes(formatDate(val), 8, "left", 32);
const eur = (val: any, len: number) => stringToBytes(formatMoney(val), len, "right", 48);

// --- GENERATORE SPR1 ---
export const generateBatchSPR1 = (records: SPR1Record[]): Blob => {
  // MATEMATICA: 359 Dati + 2 CRLF = 361 Byte.
  // (Come il file SPR1-2.txt che funzionava)
  const ROW_SIZE = 361;
  const totalSize = records.length * ROW_SIZE;
  const buffer = new Uint8Array(totalSize);

  records.forEach((r, index) => {
    const offset = index * ROW_SIZE;
    const row = new Uint8Array(ROW_SIZE).fill(32);

    let isMaggiorenne = true;
    if (r.datanasc && r.data_PIC) {
      const nascita = new Date(r.datanasc);
      const pic = new Date(r.data_PIC);
      let age = pic.getFullYear() - nascita.getFullYear();
      const m = pic.getMonth() - nascita.getMonth();
      if (m < 0 || (m === 0 && pic.getDate() < nascita.getDate())) age--;
      isMaggiorenne = age >= 18;
    }

    const respGenValue = isMaggiorenne ? " " : r.respGen || "9";
    // PREFISSO FA7 AUTOMATICO
    const nprat = r.nprat?.startsWith("FA7") ? r.nprat : "FA7" + (r.nprat || "");
    const percSSN = (r as any).percent_SSN || (r as any).percentuale_SSN || "100";

    // MAPPATURA CAMPI
    row.set(txt("1", 1), 0);
    row.set(txt("1", 1), 1);
    row.set(txt(r.codusl || "201", 3), 2); // AGGIORNATO: USL 201
    row.set(txt(r.struttura || "090MA7", 6), 5); // AGGIORNATO: 090MA7
    row.set(date(r.data_PIC), 11);
    row.set(txt(nprat, 10), 19);
    row.set(txt(r.tipoindu, 1), 29);
    row.set(txt(r.IDutente, 24), 30);
    row.set(txt(r.genere, 1), 54);
    row.set(date(r.datanasc), 55);
    row.set(txt(respGenValue, 1), 63);
    row.set(txt(r.cittu, 3), 64);
    row.set(txt(r.lures, 6), 67);
    row.set(txt(r.regresu, 3), 73);
    row.set(txt(r.uslresu, 3), 76);
    row.set(txt(r.statciv || "9", 2), 79);
    row.set(txt(r.titstud || "9", 1), 81);
    row.set(txt(r.condprof || "9", 1), 82);
    row.set(txt(r.soggRich, 2), 83);
    row.set(txt(r.setting, 1), 85);
    row.set(txt(r.codpres, 8), 86);
    row.set(txt(r.accesso, 1), 94);
    row.set(txt(r.ICD9CM, 5), 95);
    row.set(txt(r.ICD9CM_c, 5), 100);

    // Proroghe: SPAZI (Confermato da 'spazi' per numerici opzionali)
    row.set(txt(r.proroghe, 3), 105);

    row.set(num(percSSN, 3), 108);
    row.set(txt(r.pianif, 1), 111);
    row.set(date(r.data_val), 112);
    row.set(txt(r.care_giver, 1), 120);

    row.set(txt(r.IntPRIPAI_1, 2), 121);
    row.set(txt(r.IntPRIPAI_2, 2), 123);
    row.set(txt(r.IntPRIPAI_3, 2), 125);
    row.set(txt(r.IntPRIPAI_4, 2), 127);
    row.set(txt(r.IntPRIPAI_5, 2), 129);
    row.set(txt(r.IntPRIPAI_6, 2), 131);

    // AGGIORNAMENTO: SCALE NON USATE = SPAZI (Come da mail USL)
    // Usiamo 'txt' invece di 'num' per i valori vuoti/default

    // Scala 1 è obbligatoria (Num)
    row.set(num(r.scalaDis_1, 2), 133);
    row.set(num(r.disIngr_1, 5), 135);

    // Scale 2-6: Se vuote ("00"), scrivi SPAZI
    const scaleCode = (v: string | undefined) => txt(v === "00" ? "" : v, 2);
    const scaleVal = (v: string | undefined) => txt(v === "00000" ? "" : v, 5);

    row.set(scaleCode(r.scalaDis_2), 140);
    row.set(scaleVal(r.disIngr_2), 142);
    row.set(scaleCode(r.scalaDis_3), 147);
    row.set(scaleVal(r.disIngr_3), 149);
    row.set(scaleCode(r.scalaDis_4), 154);
    row.set(scaleVal(r.disIngr_4), 156);
    row.set(scaleCode(r.scalaDis_5), 161);
    row.set(scaleVal(r.disIngr_5), 163);
    row.set(scaleCode(r.scalaDis_6), 168);
    row.set(scaleVal(r.disIngr_6), 170);

    const vi = (v: string | undefined) => txt(v || "9", 1);
    row.set(vi(r.vi_stabclin), 175);
    row.set(vi(r.vi_vitaq), 176);
    row.set(vi(r.vi_mob), 177);
    row.set(vi(r.vi_cogn), 178);
    row.set(vi(r.vi_comp), 179);
    row.set(vi(r.vi_comu), 180);
    row.set(vi(r.vi_sensor), 181);
    row.set(vi(r.vi_bisogni), 182);
    row.set(vi(r.vi_supsoc), 183);

    row.set(txt(r.protesi, 1), 184);
    row.set(num(r.durata_prev, 3), 185);

    // ORE: 4 Cifre (Standard)
    row.set(num(r.ore_prev, 4), 188);

    const prof = [
      r.prof_MMGPLS,
      r.prof_spec,
      r.prof_inf,
      r.prof_oss,
      r.prof_fisiot,
      r.prof_log,
      r.prof_terap_ev,
      r.prof_occup,
      r.prof_psic,
      r.prof_as,
      r.prof_educ,
      r.prof_altri_san,
    ];
    prof.forEach((p, i) => row.set(txt(p || "2", 1), 192 + i));

    row.set(txt(r.d_prof_altri, 30), 204);
    row.set(eur(r.quoric, 8), 234);
    row.set(eur(r.imptick, 8), 242);
    row.set(eur(r.impatt, 8), 250);

    // ESENZIONE: 6 CARATTERI
    row.set(txt(r.codese?.substring(0, 6) || "000000", 6), 258);

    // CAMPI AGGIUNTIVI (Iniziano a 264)
    row.set(txt(r.Cognome, 20), 264);
    row.set(txt(r.Nome, 20), 284);
    row.set(txt(r.Progetto || "00", 2), 304);
    row.set(txt(r.Pacchetto || "00", 2), 306);
    row.set(txt(r.Pres_inviante || "00000000", 8), 308);
    row.set(txt(r.Distr_inviante || "00", 2), 316);
    row.set(txt(r.Evento || "0000000000", 10), 318);
    row.set(txt(r.Quota || "2", 1), 328);
    row.set(txt(r.Chiusura || "0", 1), 329);
    row.set(txt(r.Localizzazione || "00000000", 8), 330);
    row.set(txt(r.Gest_Tetto || "0", 1), 338);
    row.set(txt(r.Num_verbale, 12), 339);
    row.set(date(r.Data_verbale), 351);

    // CHIUSURA RIGA (359 dati + CRLF = 361 byte)
    row[359] = 13; // CR
    row[360] = 10; // LF

    buffer.set(row, offset);
  });

  return new Blob([buffer], { type: "text/plain;charset=windows-1252" });
};

const calcImpres = (tariffa?: string, numpres?: string): string => {
  const t = parseFloat((tariffa || "0").toString().replace(",", "."));
  const n = parseInt(numpres || "0", 10);
  if (isNaN(t) || isNaN(n) || n <= 0) return "00000,00";
  const val = (t * n).toFixed(2).replace(".", ",");
  return val;
};

// --- GENERATORE SPR2 ---
export const generateBatchSPR2 = (records: SPR2Record[]): Blob => {
  const ROW_SIZE = 168; // 166 dati + 2 CRLF
  const totalSize = records.length * ROW_SIZE;
  const buffer = new Uint8Array(totalSize);

  records.forEach((r, index) => {
    const offset = index * ROW_SIZE;
    const row = new Uint8Array(ROW_SIZE).fill(32);

    row.set(txt(r.record, 1), 0);
    row.set(txt(r.codusl || "201", 3), 1); // AGGIORNATO USL 201
    row.set(txt(r.struttura || "090MA7", 6), 4); // AGGIORNATO 090MA7
    row.set(date(r.data_PIC), 10);
    const nprat = r.nprat?.startsWith("FA7") ? r.nprat : "FA7" + (r.nprat || "");
    row.set(txt(nprat, 10), 18);

    if (r.record === "3") {
      row.set(date(r.dataini), 28);
      row.set(date(r.datafine), 36);
      row.set(num(r.numpres, 3), 44);

      // Tariffa così come inserita dall'operatore (verrà solo formattata)
      row.set(eur(r.tariffa, 8), 47);

      // IMPORTO LORDO: SEMPRE ricalcolato da tariffa × numpres
      const impresCalc = calcImpres(r.tariffa, r.numpres);
      row.set(eur(impresCalc, 8), 55);

      row.set(txt(r.compensa, 1), 63);
      row.set(txt(r.durata, 5), 64);
    } else if (r.record === "4") {
      row.set(date(r.dt_Rival_ValF), 69);
      row.set(txt(r.motiv_RivalValF, 1), 77);
      row.set(txt(r.confValPrec, 1), 78);
      if (r.confValPrec === "2") {
        row.set(txt(r.R_ICD9CM, 5), 79);
      }
    } else if (r.record === "5") {
      row.set(date(r.dataSosp_I), 101);
      row.set(date(r.dataSosp_F), 109);
      row.set(txt(r.motivo_Sosp, 1), 117);
    } else if (r.record === "6") {
      row.set(date(r.d_fineciclo), 118);
      row.set(txt(r.dim_ute, 2), 126);

      // Scale Finali: SPAZI se vuote (come SPR1)
      const finalScore = (v: string | undefined) => txt(v === "00000" ? "" : v, 5);

      row.set(finalScore(r.disFinal_1), 128);
      row.set(finalScore(r.disFinal_2), 133);
      row.set(finalScore(r.disFinal_3), 138);
      row.set(finalScore(r.disFinal_4), 143);
      row.set(finalScore(r.disFinal_5), 148);
      row.set(finalScore(r.disFinal_6), 153);

      row.set(date(r.DriunioneF || "99999999"), 158);
    }

    // CHIUSURA RIGA
    row[166] = 13; // CR
    row[167] = 10; // LF

    buffer.set(row, offset);
  });

  return new Blob([buffer], { type: "text/plain;charset=windows-1252" });
};
