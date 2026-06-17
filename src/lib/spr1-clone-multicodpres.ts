import type { SPR1Record, SPR2Record } from "@/types/spr";
import { incrementNprat } from "@/lib/nprat-utils";

/**
 * Aggiunge `days` giorni a una data YYYY-MM-DD senza shift di timezone.
 */
function addDaysSafe(isoDate: string, days: number): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Clona record SPR1 per pazienti con codpres multipli (workaround GAUSS).
 *
 * GAUSS richiede 1 record SPR1 per chiave (codusl+struttura+dataPIC+nprat).
 * Quando un SPR1 ha SPR2 type 3 con codpres distinti multipli (es. 405.1 + 417.1),
 * sfalsiamo data_PIC e nprat per ogni codpres > primo. Serve quindi un SPR1 padre
 * per ciascuna nuova chiave.
 *
 * Regole:
 * - Codpres ordinati crescenti (alfanumerico).
 * - Primo codpres: SPR1 originale invariato (codpres = primo della lista).
 * - i-esimo codpres (i ≥ 1): clone con
 *     data_PIC = originale + i giorni,
 *     nprat    = incrementNprat(originale, i),
 *     codpres  = i-esimo codpres,
 *     tutti gli altri campi copiati identici.
 *
 * Idempotente: parte sempre dai valori del padre originale.
 */
export function cloneSPR1ForMultiCodpres(
  spr1Records: SPR1Record[],
  spr2Records: SPR2Record[],
): SPR1Record[] {
  const result: SPR1Record[] = [];

  for (const parent of spr1Records) {
    // Trova SPR2 type "3" associati a questo SPR1
    const childrenType3 = spr2Records.filter(s2 => {
      if (s2.record !== "3") return false;
      if (s2._spr1Id && parent._dbId && s2._spr1Id === parent._dbId) return true;
      if (s2.nprat && parent.nprat && s2.nprat === parent.nprat) return true;
      return false;
    });

    const distinctCodpres = Array.from(
      new Set(childrenType3.map(c => (c.codpres || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    if (distinctCodpres.length <= 1) {
      // Singolo codpres (o nessuno): SPR1 originale invariato, ma forza codpres a quello del SPR2
      if (distinctCodpres.length === 1) {
        result.push({ ...parent, codpres: distinctCodpres[0] });
      } else {
        result.push({ ...parent });
      }
      continue;
    }

    // Multi-codpres: originale + N-1 cloni staggered
    const basePic = parent.data_PIC;
    distinctCodpres.forEach((cp, i) => {
      const clone: SPR1Record = {
        ...parent,
        codpres: cp,
        data_PIC: i === 0 ? basePic : addDaysSafe(basePic, i),
        nprat: i === 0 ? parent.nprat : incrementNprat(parent.nprat, i),
      };
      result.push(clone);
    });
  }

  return result;
}
