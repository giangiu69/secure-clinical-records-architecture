import type { SPR2Record } from "@/types/spr";
import {
  TARIFFE_CODPRES,
  findCodpresByTariffa,
  splitCodpresString,
  getTariffaForCodpres,
} from "@/lib/codpres-tariffe";

/**
 * Splitta i record SPR2 con codpres concatenato (es. "405.1;417.1") in record distinti
 * per singolo codpres, applicando la tariffa ufficiale.
 *
 * Regola attribuzione sessioni quando un record SPR2 contiene più codpres:
 * 1. Se la tariffa del record corrisponde a uno dei codpres in lista (±0,01€):
 *    → 1 SOLO record risultante con quel codpres (tariffa originale invariata).
 *      Gli altri codpres vengono ignorati: non abbiamo dati per ricostruirli.
 *      Vanno aggiunti manualmente o reimportando il PDF.
 * 2. Se la tariffa non corrisponde a nessuno dei codpres:
 *    → split fallback: 1 record per codpres con tariffa da TARIFFE_CODPRES,
 *      numpres/durata divisi equamente (arrotondato per eccesso al primo),
 *      impres ricalcolato = tariffa × numpres.
 *
 * Record con codpres singolo (no `;`) passano invariati.
 */
export function splitSPR2ByCodpres(records: SPR2Record[]): SPR2Record[] {
  const result: SPR2Record[] = [];

  for (const rec of records) {
    const codes = splitCodpresString(rec.codpres);

    if (codes.length <= 1) {
      result.push(rec);
      continue;
    }

    // Multi-codpres: applica regola di split
    const tariffaNum = parseFloat(String(rec.tariffa || "0").replace(",", "."));
    const matched = findCodpresByTariffa(tariffaNum);

    if (matched && codes.includes(matched)) {
      // Caso 1: tariffa corrisponde a uno dei codici → tieni solo quello
      result.push({ ...rec, codpres: matched });
      continue;
    }

    // Caso 2: fallback split equo
    const numpresTotal = parseInt(String(rec.numpres || "1"), 10) || 1;
    const durataTotal = parseFloat(String(rec.durata || "0").replace(",", "."));
    const n = codes.length;

    codes.forEach((code, i) => {
      const tariffa = getTariffaForCodpres(code);
      if (tariffa === undefined) {
        // Codice sconosciuto: passa invariato con codpres singolo
        result.push({ ...rec, codpres: code });
        return;
      }
      // Distribuzione: primo riceve il resto
      const base = Math.floor(numpresTotal / n);
      const extra = i === 0 ? numpresTotal - base * n : 0;
      const numpres = base + extra;
      if (numpres <= 0) return;
      const durata = durataTotal > 0 ? (durataTotal * numpres) / numpresTotal : 0;
      const impres = +(tariffa * numpres).toFixed(2);

      result.push({
        ...rec,
        codpres: code,
        tariffa: String(tariffa.toFixed(2)),
        numpres: String(numpres),
        durata: durata > 0 ? String(durata.toFixed(2)) : rec.durata,
        impres: String(impres.toFixed(2)),
      });
    });
  }

  return result;
}
