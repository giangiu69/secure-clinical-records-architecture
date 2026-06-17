/**
 * Mappatura zone/distretti per il report prestazioni.
 * Assegna i pazienti alla zona in base al codice ISTAT (lures) o codice ASL (uslresu).
 * 
 * Dal 2016, la Toscana Centro ha un unico codice ASL = 201 che raggruppa:
 * - Vecchia ASL 110 (Firenze) → zone: fiorentina, fiorentina_no, fiorentina_se, mugello
 * - Vecchia ASL 111 (Empoli) → zona: empolese
 * - Vecchia ASL 103 (Pistoia) → zone: pistoiese, val_nievole
 * - Vecchia ASL 104 (Prato) → zona: pratese
 * 
 * Per i pazienti con ASL 201, la zona viene determinata dal codice ISTAT del comune (lures).
 */

export interface ZonaInfo {
  id: string;
  nome: string;
  distretti: string;
  centroDiPrelievo: string;
}

export const ZONE_CONFIG: ZonaInfo[] = [
  { id: "fiorentina", nome: "Fiorentina", distretti: "1, 2, 3, 4, 5", centroDiPrelievo: "1101119D01" },
  { id: "fiorentina_no", nome: "Fiorentina Nord Ovest", distretti: "6, 7, 8", centroDiPrelievo: "1102229D01" },
  { id: "fiorentina_se", nome: "Fiorentina Sud Est", distretti: "9, 10, 11", centroDiPrelievo: "1103339D01" },
  { id: "mugello", nome: "Mugello", distretti: "12", centroDiPrelievo: "1104449D01" },
  { id: "empolese", nome: "Empolese Valdarno Inf.", distretti: "-", centroDiPrelievo: "1118XX400" },
  { id: "pistoiese", nome: "Pistoiese", distretti: "-", centroDiPrelievo: "103110225" },
  { id: "val_nievole", nome: "Val di Nievole", distretti: "-", centroDiPrelievo: "103009352" },
  { id: "pratese", nome: "Pratese", distretti: "-", centroDiPrelievo: "104017001" },
];

// ============================================================
// ISTAT → Zona mapping per ASL 201 (Toscana Centro)
// ============================================================

// Comuni della vecchia ASL 111 (Empolese Valdarno Inferiore)
const EMPOLESE_ISTAT = new Set([
  "048008", // Castelfiorentino
  "048010", // Cerreto Guidi
  "048011", // Certaldo
  "048012", // Empoli (Capraia e Limite → fuso con Empoli? comunque ex-111)
  "048014", // Fucecchio
  "048019", // Gambassi Terme
  "048020", // Montaione
  "048027", // Montelupo Fiorentino
  "048028", // Montespertoli
  "048030", // Vinci
  "048050", // Capraia e Limite
  "050009", // Castelfranco di Sotto
  "050022", // Montopoli in Val d'Arno
  "050032", // San Miniato
  "050033", // Santa Croce sull'Arno
]);

// Comuni zona Fiorentina Nord Ovest (distretti 6-8)
// Sesto Fiorentino, Campi Bisenzio, Calenzano, Signa, Lastra a Signa, Scandicci
const FIORENTINA_NO_ISTAT = new Set([
  "048041", // Sesto Fiorentino
  "048006", // Campi Bisenzio
  "048005", // Calenzano
  "048043", // Signa
  "048024", // Lastra a Signa
  "048039", // Scandicci
]);

// Comuni zona Fiorentina Sud Est (distretti 9-11)
// Comuni del Chianti, Valdarno superiore fiorentino
const FIORENTINA_SE_ISTAT = new Set([
  "048022", // Greve in Chianti
  "048038", // San Casciano in Val di Pesa
  "048046", // Tavarnelle Val di Pesa (ora Barberino Tavarnelle)
  "048053", // Barberino Tavarnelle
  "048025", // Impruneta
  "048033", // Pontassieve
  "048036", // Rignano sull'Arno
  "048035", // Reggello
  "048021", // Figline e Incisa Valdarno
  "048026", // Londa
  "048037", // Rufina
  "048031", // Pelago
]);

// Comuni zona Mugello (distretto 12)
const MUGELLO_ISTAT = new Set([
  "048002", // Barberino di Mugello
  "048003", // Borgo San Lorenzo
  "048018", // Firenzuola
  "048032", // Scarperia e San Piero (Palazzuolo sul Senio)
  "048044", // Scarperia e San Piero
  "048049", // Vicchio
  "048013", // Dicomano
  "048001", // Marradi
  "048054", // Barberino di Mugello (nuovo codice)
  "048052", // Vaglia
]);

// Comuni zona Val di Nievole (ex-ASL 103, area Montecatini/Pescia)
const VAL_NIEVOLE_ISTAT = new Set([
  "047005", // Buggiano
  "047010", // Lamporecchio
  "047011", // Larciano
  "047013", // Massa e Cozzile
  "047014", // Monsummano Terme
  "047015", // Montecatini-Terme
  "047017", // Pescia
  "047018", // Pieve a Nievole
  "047019", // Ponte Buggianese
  "047022", // Uzzano
]);

/**
 * Determina la zona dal codice ISTAT del comune di residenza.
 * Questa è la funzione principale per ASL 201 (Toscana Centro).
 */
export function getZonaByIstat(istatCode: string): ZonaInfo | null {
  if (!istatCode) return null;
  const code = istatCode.trim();
  
  // Check set specifici
  if (EMPOLESE_ISTAT.has(code)) return ZONE_CONFIG.find(z => z.id === "empolese")!;
  if (FIORENTINA_NO_ISTAT.has(code)) return ZONE_CONFIG.find(z => z.id === "fiorentina_no")!;
  if (FIORENTINA_SE_ISTAT.has(code)) return ZONE_CONFIG.find(z => z.id === "fiorentina_se")!;
  if (MUGELLO_ISTAT.has(code)) return ZONE_CONFIG.find(z => z.id === "mugello")!;
  if (VAL_NIEVOLE_ISTAT.has(code)) return ZONE_CONFIG.find(z => z.id === "val_nievole")!;
  
  // Mapping per prefisso ISTAT
  const prefix3 = code.substring(0, 3);
  
  // 048 = Provincia di Firenze (non catturato sopra → default fiorentina)
  if (prefix3 === "048") return ZONE_CONFIG.find(z => z.id === "fiorentina")!;
  
  // 100 = Provincia di Prato → pratese
  if (prefix3 === "100") return ZONE_CONFIG.find(z => z.id === "pratese")!;
  
  // 047 = Provincia di Pistoia (non catturato da Val di Nievole → pistoiese)
  if (prefix3 === "047") return ZONE_CONFIG.find(z => z.id === "pistoiese")!;
  
  // 050 = Provincia di Pisa (alcuni comuni ex-ASL 111 non catturati → empolese)
  if (prefix3 === "050") return ZONE_CONFIG.find(z => z.id === "empolese")!;
  
  return null;
}

// Mappa codice ASL (vecchio o nuovo) → zona di default
const ASL_TO_ZONA: Record<string, string> = {
  // Nuove ASL (post-2016) — fallback quando non abbiamo ISTAT
  "201": "fiorentina",  // Toscana Centro (da raffinare con ISTAT)
  "202": "fiorentina",  // Toscana Nord Ovest (fuori area, fallback)
  "203": "fiorentina",  // Toscana Sud Est (fuori area, fallback)
  // Vecchie ASL (pre-2016)
  "110": "fiorentina",
  "111": "empolese",
  "103": "pistoiese",
  "104": "pratese",
};

/**
 * Restituisce la zona in base al codice ASL (uslresu) e opzionalmente il codice ISTAT (lures).
 * Per ASL 201, usa il codice ISTAT per determinare la sotto-zona.
 */
export function getZonaByUslResu(uslresu: string, lures?: string): ZonaInfo | null {
  if (!uslresu && !lures) return null;
  
  // Se abbiamo il codice ISTAT, prova prima il mapping diretto (più preciso)
  if (lures) {
    const zonaByIstat = getZonaByIstat(lures);
    if (zonaByIstat) return zonaByIstat;
  }
  
  // Fallback: mapping da codice ASL
  if (uslresu) {
    const code = uslresu.trim();
    const zonaId = ASL_TO_ZONA[code];
    if (zonaId) {
      return ZONE_CONFIG.find(z => z.id === zonaId) || null;
    }
  }
  
  return null;
}

/**
 * Restituisce la zona data la ASL code dal dizionario territoriale.
 */
export function getZonaByAslCode(aslCode: string, lures?: string): ZonaInfo | null {
  if (!aslCode) return null;
  return getZonaByUslResu(aslCode, lures);
}

/**
 * Restituisce tutte le zone configurate
 */
export function getAllZone(): ZonaInfo[] {
  return ZONE_CONFIG;
}
