import { supabase } from "@/integrations/supabase/client";
import { TARIFFE_CODPRES } from "@/lib/codpres-tariffe";

export interface ManualSplitEntry {
  code: "405.1" | "417.1";
  numpres: number;
  durata: number;
}

export interface OriginalSpr2Row {
  id: string;
  spr1_id: string | null;
  codusl: string | null;
  struttura: string | null;
  data_pic: string | null;
  nprat: string | null;
  record: string | null;
  dataini: string | null;
  datafine: string | null;
  compensa: string | null;
  is_remote: boolean | null;
}

/**
 * Applica lo split manuale di un record SPR2 con codpres concatenato.
 * Crea N nuovi record (uno per ogni entry con numpres>0) con tariffa ufficiale,
 * poi cancella il record originale.
 */
export async function applyManualSplit(
  original: OriginalSpr2Row,
  entries: ManualSplitEntry[],
): Promise<void> {
  const valid = entries.filter(e => e.numpres > 0);
  if (valid.length === 0) {
    throw new Error("Almeno una voce deve avere numpres > 0");
  }

  const inserts = valid.map(e => {
    const tariffa = TARIFFE_CODPRES[e.code];
    const impres = +(tariffa * e.numpres).toFixed(2);
    return {
      spr1_id: original.spr1_id,
      codusl: original.codusl,
      struttura: original.struttura,
      data_pic: original.data_pic,
      nprat: original.nprat,
      record: original.record || "3",
      dataini: original.dataini,
      datafine: original.datafine,
      compensa: original.compensa ?? "0",
      is_remote: original.is_remote ?? false,
      codpres: e.code,
      tariffa,
      numpres: e.numpres,
      durata: e.durata,
      impres,
    };
  });

  const { error: insErr } = await supabase.from("spr2_records").insert(inserts);
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

  const { error: delErr } = await supabase
    .from("spr2_records")
    .delete()
    .eq("id", original.id);
  if (delErr) throw new Error(`Delete originale fallita: ${delErr.message}`);
}
