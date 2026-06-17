import { supabase } from "@/integrations/supabase/client";

/**
 * Prefisso GAUSS per nprat (chiave UDO 090MA7 → prefisso "FA7")
 */
export const NPRAT_PREFIX = "FA7";
export const NPRAT_TOTAL_LENGTH = 10; // FA7 + 7 cifre = 10

/**
 * Genera il prossimo nprat in formato GAUSS: FA7 + 7 cifre progressive (es. FA70000001).
 * Il numero rimane invariato per tutto il percorso riabilitativo del paziente.
 */
export async function getNextNprat(): Promise<string> {
  const { data, error } = await supabase
    .from('spr1_records')
    .select('nprat')
    .like('nprat', `${NPRAT_PREFIX}%`)
    .order('nprat', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Errore ricerca ultimo nprat:", error);
    return `${NPRAT_PREFIX}0000001`;
  }

  if (!data?.nprat) {
    return `${NPRAT_PREFIX}0000001`;
  }

  const numericPart = data.nprat.substring(NPRAT_PREFIX.length);
  const lastNumber = parseInt(numericPart, 10);

  if (isNaN(lastNumber)) {
    return `${NPRAT_PREFIX}0000001`;
  }

  const nextNumber = lastNumber + 1;
  const padLen = NPRAT_TOTAL_LENGTH - NPRAT_PREFIX.length;
  return `${NPRAT_PREFIX}${nextNumber.toString().padStart(padLen, '0')}`;
}

/**
 * Normalizza un nprat legacy (es. "2025001") al formato GAUSS (es. "FA70000001"),
 * preservando la parte numerica progressiva.
 */
export function normalizeNpratForGauss(nprat: string | null | undefined): string {
  if (!nprat) return '';
  const trimmed = nprat.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(NPRAT_PREFIX)) {
    return trimmed.substring(0, NPRAT_TOTAL_LENGTH);
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  const padLen = NPRAT_TOTAL_LENGTH - NPRAT_PREFIX.length;
  const padded = digits.slice(-padLen).padStart(padLen, '0');
  return `${NPRAT_PREFIX}${padded}`;
}

/**
 * Incrementa la parte numerica di un nprat GAUSS di `offset` unità.
 * Es. incrementNprat("FA70000010", 2) -> "FA70000012".
 * Se nprat non è in formato GAUSS, prima lo normalizza. Idempotente con offset=0.
 */
export function incrementNprat(nprat: string | null | undefined, offset: number): string {
  const normalized = normalizeNpratForGauss(nprat);
  if (!normalized || !offset) return normalized;
  const numericPart = normalized.substring(NPRAT_PREFIX.length);
  const n = parseInt(numericPart, 10);
  if (isNaN(n)) return normalized;
  const padLen = NPRAT_TOTAL_LENGTH - NPRAT_PREFIX.length;
  return `${NPRAT_PREFIX}${(n + offset).toString().padStart(padLen, '0')}`;
}



/**
 * Assegna nprat progressivi a tutti i record SPR1 che non ne hanno uno.
 * Restituisce il numero di record aggiornati.
 */
export async function assignMissingNprat(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  // Trova tutti i record senza nprat
  const { data: recordsSenzaNprat, error: fetchError } = await supabase
    .from('spr1_records')
    .select('id, cognome, nome, id_utente')
    .or('nprat.is.null,nprat.eq.')
    .order('created_at', { ascending: true });

  if (fetchError) {
    return { updated: 0, errors: [fetchError.message] };
  }

  if (!recordsSenzaNprat || recordsSenzaNprat.length === 0) {
    return { updated: 0, errors: [] };
  }

  // Assegna nprat progressivi
  for (const record of recordsSenzaNprat) {
    const nextNprat = await getNextNprat();
    
    const { error: updateError } = await supabase
      .from('spr1_records')
      .update({ nprat: nextNprat })
      .eq('id', record.id);

    if (updateError) {
      errors.push(`${record.cognome} ${record.nome}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  return { updated, errors };
}

/**
 * Auto-compila data_val con dataini del primo trattamento (SPR2 tipo 3) se vuota.
 * Restituisce il numero di record aggiornati.
 */
export async function autoFillDataVal(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  // Trova tutti i record SPR1 senza data_val (non possiamo query su data_val direttamente poiché non è nel DB)
  // Dobbiamo farlo in modo diverso: cercare SPR1 e i loro SPR2 collegati
  const { data: spr1Records, error: spr1Error } = await supabase
    .from('spr1_records')
    .select('id, cognome, nome, data_pic')
    .order('created_at', { ascending: true });

  if (spr1Error) {
    return { updated: 0, errors: [spr1Error.message] };
  }

  if (!spr1Records || spr1Records.length === 0) {
    return { updated: 0, errors: [] };
  }

  // Per ogni SPR1, cerca il primo SPR2 di tipo trattamento (record = '3')
  for (const spr1 of spr1Records) {
    // Se data_pic è già presente, salta (data_val nel frontend viene da data_pic + logica)
    // In realtà data_val non è nel DB, quindi dobbiamo gestirlo diversamente
    // Per ora, aggiorniamo data_pic se vuota con il primo dataini di SPR2 tipo 3
    if (spr1.data_pic) continue;

    const { data: spr2Records, error: spr2Error } = await supabase
      .from('spr2_records')
      .select('dataini')
      .eq('spr1_id', spr1.id)
      .eq('record', '3')
      .not('dataini', 'is', null)
      .order('dataini', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (spr2Error) {
      errors.push(`${spr1.cognome}: ${spr2Error.message}`);
      continue;
    }

    if (!spr2Records?.dataini) continue;

    // Aggiorna data_pic con dataini del primo trattamento
    const { error: updateError } = await supabase
      .from('spr1_records')
      .update({ data_pic: spr2Records.dataini })
      .eq('id', spr1.id);

    if (updateError) {
      errors.push(`${spr1.cognome}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  return { updated, errors };
}

/**
 * Ottiene la data del primo trattamento per un SPR1 specifico
 */
export async function getFirstTreatmentDate(spr1Id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('spr2_records')
    .select('dataini')
    .eq('spr1_id', spr1Id)
    .eq('record', '3')
    .not('dataini', 'is', null)
    .order('dataini', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.dataini) {
    return null;
  }

  return data.dataini;
}

/**
 * Converte TUTTI i nprat legacy (es. "2025001") nel DB al formato GAUSS (es. "FA70000001").
 * Mantiene la parte numerica progressiva: 2025001 → FA70025001.
 * Idempotente: i record già in formato FA7 vengono ignorati.
 * Aggiorna SPR1 e i relativi SPR2 in cascata per preservare la chiave composta.
 */
export async function convertAllNpratToGauss(): Promise<{ updated: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;

  const { data: spr1List, error: fetchError } = await supabase
    .from('spr1_records')
    .select('id, nprat, cognome, nome');

  if (fetchError) return { updated: 0, skipped: 0, errors: [fetchError.message] };
  if (!spr1List) return { updated: 0, skipped: 0, errors: [] };

  for (const rec of spr1List) {
    const oldNprat = rec.nprat?.trim();
    if (!oldNprat) { skipped++; continue; }
    if (oldNprat.startsWith(NPRAT_PREFIX)) { skipped++; continue; }

    const newNprat = normalizeNpratForGauss(oldNprat);
    if (!newNprat || newNprat === oldNprat) { skipped++; continue; }

    // Update SPR1
    const { error: u1 } = await supabase
      .from('spr1_records')
      .update({ nprat: newNprat })
      .eq('id', rec.id);
    if (u1) {
      errors.push(`${rec.cognome} ${rec.nome}: ${u1.message}`);
      continue;
    }

    // Update SPR2 collegati (chiave composta)
    const { error: u2 } = await supabase
      .from('spr2_records')
      .update({ nprat: newNprat })
      .eq('spr1_id', rec.id);
    if (u2) {
      errors.push(`${rec.cognome} ${rec.nome} (SPR2): ${u2.message}`);
    }

    updated++;
  }

  return { updated, skipped, errors };
}

