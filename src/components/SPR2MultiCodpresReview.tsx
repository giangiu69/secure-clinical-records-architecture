import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { applyManualSplit, type OriginalSpr2Row } from "@/lib/spr2-manual-split";
import { TARIFFE_CODPRES } from "@/lib/codpres-tariffe";
import { Loader2, Split } from "lucide-react";

interface RowData extends OriginalSpr2Row {
  numpres: number;
  durata: number;
  impres: number;
  tariffa: number;
  codpres: string;
  // joined
  cognome: string | null;
  nome: string | null;
  id_utente: string | null;
}

interface SplitInputs {
  n405: string;
  n417: string;
  d405: string;
  d417: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export default function SPR2MultiCodpresReview({ open, onOpenChange, onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<RowData[]>([]);
  const [inputs, setInputs] = useState<Record<string, SplitInputs>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("spr2_records")
        .select("*, spr1_records!inner(cognome, nome, id_utente)")
        .like("codpres", "%;%");
      if (error) throw error;

      const mapped: RowData[] = (data || []).map((r: any) => ({
        id: r.id,
        spr1_id: r.spr1_id,
        codusl: r.codusl,
        struttura: r.struttura,
        data_pic: r.data_pic,
        nprat: r.nprat,
        record: r.record,
        dataini: r.dataini,
        datafine: r.datafine,
        compensa: r.compensa,
        is_remote: r.is_remote,
        numpres: Number(r.numpres) || 0,
        durata: Number(r.durata) || 0,
        impres: Number(r.impres) || 0,
        tariffa: Number(r.tariffa) || 0,
        codpres: r.codpres,
        cognome: r.spr1_records?.cognome ?? null,
        nome: r.spr1_records?.nome ?? null,
        id_utente: r.spr1_records?.id_utente ?? null,
      }));
      mapped.sort((a, b) => (a.cognome || "").localeCompare(b.cognome || ""));
      setRows(mapped);

      // Precompila: default tutto su 405.1 (sessioni totali derivate da impres/44,90)
      const init: Record<string, SplitInputs> = {};
      for (const r of mapped) {
        const tot405 = r.tariffa > 0 ? Math.round(r.impres / r.tariffa) : r.numpres;
        init[r.id] = {
          n405: String(tot405),
          n417: "0",
          d405: String(r.durata),
          d417: "0",
        };
      }
      setInputs(init);
    } catch (e: any) {
      console.error(e);
      toast.error(`Errore caricamento: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const setField = (id: string, field: keyof SplitInputs, value: string) => {
    setInputs(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const previewImpres = (n: string, code: "405.1" | "417.1") => {
    const num = parseInt(n, 10) || 0;
    return (num * TARIFFE_CODPRES[code]).toFixed(2);
  };

  const validate = (): string | null => {
    for (const r of rows) {
      const i = inputs[r.id];
      if (!i) continue;
      const n405 = parseInt(i.n405, 10) || 0;
      const n417 = parseInt(i.n417, 10) || 0;
      if (n405 + n417 <= 0) {
        return `${r.cognome} ${r.nome}: somma sessioni deve essere > 0`;
      }
      if (n405 < 0 || n417 < 0) {
        return `${r.cognome} ${r.nome}: valori negativi non ammessi`;
      }
    }
    return null;
  };

  const handleSplitAll = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (!confirm(`Splitto ${rows.length} record in record distinti per codpres. L'operazione cancella i record concatenati originali. Procedo?`)) return;

    setSaving(true);
    let ok = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const i = inputs[r.id];
      const entries = [
        { code: "405.1" as const, numpres: parseInt(i.n405, 10) || 0, durata: parseFloat(i.d405) || 0 },
        { code: "417.1" as const, numpres: parseInt(i.n417, 10) || 0, durata: parseFloat(i.d417) || 0 },
      ];
      try {
        await applyManualSplit(r, entries);
        ok++;
      } catch (e: any) {
        errors.push(`${r.cognome} ${r.nome}: ${e.message || e}`);
      }
    }
    setSaving(false);
    if (errors.length) {
      console.error("Errori split:", errors);
      toast.warning(`Splittati ${ok}/${rows.length}, ${errors.length} errori (vedi console)`);
    } else {
      toast.success(`Splittati ${ok} record SPR2`);
    }
    onDone?.();
    if (errors.length === 0) onOpenChange(false);
    else await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Revisione SPR2 multi-codpres
            {!loading && <Badge variant="secondary">{rows.length}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Per ogni paziente inserisci quante sessioni sono <b>405.1</b> (sostegno familiare, 44,90€) e quante <b>417.1</b> (sostegno educativo, 54,25€).
            Le ore sono pre-popolate pro-quota. Lo split crea record SPR2 distinti e cancella il record concatenato originale.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun record SPR2 con codpres concatenato.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paziente</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Originale</TableHead>
                  <TableHead className="text-center">405.1 (sess / ore)</TableHead>
                  <TableHead className="text-center">417.1 (sess / ore)</TableHead>
                  <TableHead className="text-right">Anteprima € totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const i = inputs[r.id] || { n405: "0", n417: "0", d405: "0", d417: "0" };
                  const imp405 = parseFloat(previewImpres(i.n405, "405.1"));
                  const imp417 = parseFloat(previewImpres(i.n417, "417.1"));
                  const tot = imp405 + imp417;
                  const stimato = r.tariffa > 0 ? Math.round(r.impres / r.tariffa) : r.numpres;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.cognome} {r.nome}</div>
                        <div className="text-muted-foreground">{r.id_utente}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.dataini} → {r.datafine}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <div>npr: {r.numpres} · h: {r.durata}</div>
                        <div className="text-muted-foreground">€{r.impres.toFixed(2)} · stim. {stimato} sess</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            type="number" min="0" className="h-8 w-16"
                            value={i.n405}
                            onChange={e => setField(r.id, "n405", e.target.value)}
                          />
                          <Input
                            type="number" min="0" step="0.5" className="h-8 w-16"
                            value={i.d405}
                            onChange={e => setField(r.id, "d405", e.target.value)}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">€{imp405.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            type="number" min="0" className="h-8 w-16"
                            value={i.n417}
                            onChange={e => setField(r.id, "n417", e.target.value)}
                          />
                          <Input
                            type="number" min="0" step="0.5" className="h-8 w-16"
                            value={i.d417}
                            onChange={e => setField(r.id, "d417", e.target.value)}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">€{imp417.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        €{tot.toFixed(2)}
                        {Math.abs(tot - r.impres) > 0.01 && (
                          <div className="text-[10px] text-amber-600">Δ {(tot - r.impres).toFixed(2)}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSplitAll} disabled={saving || loading || rows.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salva e splitta tutti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
