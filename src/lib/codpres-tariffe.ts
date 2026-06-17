/**
 * Tariffario ufficiale codici prestazione UDO 090MA7 (Ass.C.A.)
 * Comunicato dalla Regione Toscana.
 */
export const TARIFFE_CODPRES: Record<string, number> = {
  "405.1": 44.90,
  "417.1": 54.25,
};

export function getTariffaForCodpres(codpres: string | undefined | null): number | undefined {
  if (!codpres) return undefined;
  const key = String(codpres).trim();
  return TARIFFE_CODPRES[key];
}

/**
 * Restituisce il codpres il cui tariffario corrisponde (tolleranza 0.01€) alla tariffa data.
 * Restituisce undefined se nessun codice combacia.
 */
export function findCodpresByTariffa(tariffa: number | string | undefined): string | undefined {
  const t = typeof tariffa === "string" ? parseFloat(tariffa.replace(",", ".")) : tariffa;
  if (t === undefined || !Number.isFinite(t)) return undefined;
  for (const [code, val] of Object.entries(TARIFFE_CODPRES)) {
    if (Math.abs(val - t) < 0.01) return code;
  }
  return undefined;
}

/**
 * Splitta una stringa codpres concatenata (es. "405.1;417.1") in array di codici unici trimmati.
 */
export function splitCodpresString(codpres: string | undefined | null): string[] {
  if (!codpres) return [];
  return Array.from(
    new Set(
      String(codpres)
        .split(/[;,]/)
        .map(c => c.trim())
        .filter(Boolean),
    ),
  );
}
