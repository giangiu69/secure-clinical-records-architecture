import type { SPR1Record, SPR2Record } from "@/types/spr";
import { incrementNprat } from "@/lib/nprat-utils";

/**
 * Aggiunge `days` giorni a una data in formato YYYY-MM-DD senza shift di timezone.
 */
function addDaysSafe(isoDate: string, days: number): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  // Usa UTC per evitare TZ shift
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Identifica il record SPR1 padre per un dato SPR2.
 */
function findParent(spr2: SPR2Record, spr1Records: SPR1Record[]): SPR1Record | null {
  if (spr2._spr1Id) {
    const byId = spr1Records.find(s => s._dbId === spr2._spr1Id);
    if (byId) return byId;
  }
  if (spr2.nprat) {
    const byNprat = spr1Records.find(s => s.nprat === spr2.nprat);
    if (byNprat) return byNprat;
  }
  return null;
}

/**
 * Stagger di data_PIC per SPR2 con codpres multipli sullo stesso paziente.
 *
 * Regole:
 * - Solo record type "3" partecipano allo stagger.
 * - Per ogni SPR1 padre con ≥2 codpres distinti tra i suoi SPR2 type 3:
 *   - Codpres ordinati crescenti (alfanumerico).
 *   - i-esimo codpres → data_PIC = padre.data_PIC + i giorni.
 * - Singolo codpres → data_PIC = padre.data_PIC (allineato).
 * - Record non-type-3 → data_PIC = padre.data_PIC (allineato, no stagger).
 * - Idempotente: parte sempre da padre.data_PIC come base.
 */
export function staggerDataPicByCodpres(
  spr2Records: SPR2Record[],
  spr1Records: SPR1Record[],
): SPR2Record[] {
  // Raggruppa indici per SPR1 padre
  const groups = new Map<string, number[]>();
  spr2Records.forEach((spr2, idx) => {
    const parent = findParent(spr2, spr1Records);
    if (!parent) return;
    const key = parent._dbId || parent.nprat || `${parent.codusl}-${parent.data_PIC}-${parent.nprat}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(idx);
  });

  const result = spr2Records.map(r => ({ ...r }));

  groups.forEach(indices => {
    const firstIdx = indices[0];
    const parent = findParent(spr2Records[firstIdx], spr1Records)!;
    const basePic = parent.data_PIC;
    if (!basePic) return;

    // Codpres distinti tra i record type "3" del gruppo (ordinati crescenti)
    const type3Indices = indices.filter(i => result[i].record === "3");
    const distinctCodpres = Array.from(
      new Set(type3Indices.map(i => (result[i].codpres || "").trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    const codpresOffset = new Map<string, number>();
    if (distinctCodpres.length >= 2) {
      distinctCodpres.forEach((cp, i) => codpresOffset.set(cp, i));
    } else if (distinctCodpres.length === 1) {
      codpresOffset.set(distinctCodpres[0], 0);
    }

    indices.forEach(i => {
      const rec = result[i];
      if (rec.record === "3") {
        const cp = (rec.codpres || "").trim();
        const offset = codpresOffset.get(cp) ?? 0;
        rec.data_PIC = offset === 0 ? basePic : addDaysSafe(basePic, offset);
        // Stagger anche nprat: ogni codpres aggiuntivo riceve nprat progressivo (+offset)
        // così la chiave GAUSS (codusl+struttura+dataPIC+nprat) resta univoca
        // e c'è uno SPR1 padre clonato corrispondente.
        if (offset > 0 && parent.nprat) {
          rec.nprat = incrementNprat(parent.nprat, offset);
        }
      } else {
        rec.data_PIC = basePic;
      }
    });
  });

  return result;
}
