/**
 * Patient Data Merge Logic
 * Merges data from Excel and PDF sources using Codice Fiscale as key
 */

import { SPR1Record, SPR2Record } from "@/types/spr";
import { DraftPatient } from "@/components/DraftsSidebar";

export type DataSource = 'excel' | 'pdf';

/**
 * Merge new SPR1 data into existing records
 * - Excel priorità: dati economici (ore_prev, impatt, codpres, prestazioni)
 * - PDF priorità: dati anagrafici (nome completo, date, indirizzi)
 */
export function mergeSPR1Records(
  existing: SPR1Record[],
  incoming: SPR1Record[],
  source: DataSource
): SPR1Record[] {
  const result = [...existing];

  for (const newRecord of incoming) {
    const cf = newRecord.IDutente;
    if (!cf) continue;

    const existingIndex = result.findIndex(r => r.IDutente === cf);

    if (existingIndex >= 0) {
      // MERGE: combina campi in base alla source
      const merged = { ...result[existingIndex] };

      if (source === 'excel') {
        // Excel ha priorità su dati economici
        if (newRecord.ore_prev) merged.ore_prev = newRecord.ore_prev;
        if (newRecord.impatt) merged.impatt = newRecord.impatt;
        if (newRecord.codpres) merged.codpres = newRecord.codpres;
        // Aggiorna nome/cognome solo se mancanti
        if (!merged.Cognome && newRecord.Cognome) merged.Cognome = newRecord.Cognome;
        if (!merged.Nome && newRecord.Nome) merged.Nome = newRecord.Nome;
      } else if (source === 'pdf') {
        // PDF ha priorità su dati anagrafici E ORE (Single Source of Truth)
        if (newRecord.Cognome) merged.Cognome = newRecord.Cognome;
        if (newRecord.Nome) merged.Nome = newRecord.Nome;
        if (newRecord.datanasc) merged.datanasc = newRecord.datanasc;
        if (newRecord.genere) merged.genere = newRecord.genere;
        if (newRecord.comnasu) merged.comnasu = newRecord.comnasu;
        // PDF SOVRASCRIVE SEMPRE le ore (priorità assoluta)
        if (newRecord.ore_prev) merged.ore_prev = newRecord.ore_prev;
      }

      result[existingIndex] = merged;
    } else {
      // NUOVO: aggiungi record
      result.push(newRecord);
    }
  }

  return result;
}

/**
 * Merge SPR2 records - UN SPR2 PER SPR1
 * Se esiste già un SPR2 per lo stesso nprat, SOSTITUISCE (aggregazione già fatta nel PDFImporter)
 * Altrimenti aggiunge nuovo record
 */
export function mergeSPR2Records(
  existing: SPR2Record[],
  incoming: SPR2Record[]
): SPR2Record[] {
  const result = [...existing];

  for (const newRecord of incoming) {
    // Cerca SPR2 esistente per stesso SPR1 (stessa chiave: nprat + codusl + struttura)
    const existingIndex = result.findIndex(r => 
      r.nprat === newRecord.nprat &&
      r.codusl === newRecord.codusl &&
      r.struttura === newRecord.struttura
    );

    if (existingIndex >= 0) {
      // AGGIORNA: sostituisce con dati aggregati (già calcolati nel PDFImporter)
      result[existingIndex] = newRecord;
    } else {
      // NUOVO: aggiungi record
      result.push(newRecord);
    }
  }

  return result;
}

/**
 * Genera lista bozze per sidebar da SPR1 + SPR2
 */
export function generateDrafts(
  spr1Records: SPR1Record[],
  spr2Records: SPR2Record[],
  excelCFs: Set<string>,
  pdfCFs: Set<string>
): DraftPatient[] {
  return spr1Records.map(spr1 => {
    const cf = spr1.IDutente || '';
    const hasExcel = excelCFs.has(cf);
    const hasPDF = pdfCFs.has(cf);

    // Conta SPR2 collegati
    const spr2Count = spr2Records.filter(s2 => s2.nprat === spr1.nprat).length;

    // Determina source
    let source: DraftPatient['source'] = 'excel';
    if (hasExcel && hasPDF) {
      source = 'merged';
    } else if (hasPDF) {
      source = 'pdf';
    }

    return {
      codiceFiscale: cf,
      cognome: spr1.Cognome || '',
      nome: spr1.Nome || '',
      ore_prev: spr1.ore_prev || '',
      impatt: spr1.impatt || '',
      source,
      spr2Count,
    };
  });
}

/**
 * Aggiorna dati anagrafici SPR1 da PDF (per merge callback)
 */
export function updateSPR1Anagraphics(
  records: SPR1Record[],
  cf: string,
  updates: Partial<SPR1Record>
): SPR1Record[] {
  return records.map(r => {
    if (r.IDutente === cf) {
      return {
        ...r,
        // Solo campi anagrafici
        Cognome: updates.Cognome || r.Cognome,
        Nome: updates.Nome || r.Nome,
        datanasc: updates.datanasc || r.datanasc,
        genere: updates.genere || r.genere,
        comnasu: updates.comnasu || r.comnasu,
      };
    }
    return r;
  });
}
