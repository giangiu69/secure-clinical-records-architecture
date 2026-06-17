import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RefreshCw, Check, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SPR1Record } from "@/types/spr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PendingRecord {
  id: string;
  record_type: string;
  patient_name: string | null;
  raw_data: any;
  error_reason: string | null;
  reference_month: string | null;
  status: string;
  created_at: string;
}

interface PendingRecordsProps {
  spr1Records: SPR1Record[];
}

export default function PendingRecords({ spr1Records }: PendingRecordsProps) {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [clearing, setClearing] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pending_records')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (filterMonth !== "all") {
        query = query.eq('reference_month', filterMonth);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords((data || []) as PendingRecord[]);
    } catch (e) {
      console.error('Errore caricamento pending:', e);
      toast.error('Errore caricamento record parcheggiati');
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Normalizza per matching
  const normalizeNoSpaces = (name: string): string => {
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z]/g, '');
  };

  const calculateMatchScore = (
    pdfName: string,
    spr1Cognome: string,
    spr1Nome: string
  ): number => {
    const pdfNoSpaces = normalizeNoSpaces(pdfName);
    const cogNoSpaces = normalizeNoSpaces(spr1Cognome);
    const nomeNoSpaces = normalizeNoSpaces(spr1Nome);
    const fullNoSpaces = `${nomeNoSpaces}${cogNoSpaces}`;
    const reverseNoSpaces = `${cogNoSpaces}${nomeNoSpaces}`;

    if (fullNoSpaces === pdfNoSpaces || reverseNoSpaces === pdfNoSpaces) return 95;
    if (pdfNoSpaces.includes(cogNoSpaces) && pdfNoSpaces.includes(nomeNoSpaces)) return 70;
    return 0;
  };

  const findMatch = (name: string): SPR1Record | null => {
    let best: { spr1: SPR1Record; score: number } | null = null;
    for (const spr1 of spr1Records) {
      if (!spr1.Cognome && !spr1.Nome) continue;
      const score = calculateMatchScore(name, spr1.Cognome || '', spr1.Nome || '');
      if (score >= 70 && (!best || score > best.score)) {
        best = { spr1, score };
      }
    }
    return best?.spr1 || null;
  };

  const handleRetryMatch = async (record: PendingRecord) => {
    const name = editingNames[record.id] || record.patient_name || '';
    const match = findMatch(name);

    if (match) {
      // Salva alias per usi futuri
      const normalizedPdf = normalizeNoSpaces(name);
      await supabase.from('name_aliases').upsert({
        pdf_name: normalizedPdf,
        spr1_cf: match.IDutente || '',
        spr1_cognome: match.Cognome || '',
        spr1_nome: match.Nome || '',
      }, { onConflict: 'pdf_name' });

      // Marca come risolto
      await supabase.from('pending_records')
        .update({ status: 'resolved' })
        .eq('id', record.id);

      toast.success(`"${name}" abbinato a ${match.Cognome} ${match.Nome} - Alias salvato`);
      loadRecords();
    } else {
      toast.error(`Nessun match trovato per "${name}"`);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pending_records').delete().eq('id', id);
    if (error) {
      toast.error('Errore eliminazione');
    } else {
      toast.success('Record eliminato');
      loadRecords();
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Eliminare tutti i ${records.length} record parcheggiati?`)) return;
    setClearing(true);
    try {
      const { error } = await supabase.from('pending_records').delete().eq('status', 'pending');
      if (error) throw error;
      toast.success('Tutti i record parcheggiati sono stati eliminati');
      loadRecords();
    } catch (e) {
      toast.error('Errore durante lo svuotamento');
    } finally {
      setClearing(false);
    }
  };

  // Estrai mesi unici per filtro
  const months = [...new Set(records.map(r => r.reference_month).filter(Boolean))] as string[];

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Caricamento...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Record Parcheggiati
          </CardTitle>
          <Badge variant="secondary">{records.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtra per mese" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i mesi</SelectItem>
              {months.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {records.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleClearAll} disabled={clearing}>
              <Trash2 className="h-4 w-4 mr-1" />
              {clearing ? 'Svuotamento...' : 'Svuota Tutto'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadRecords}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nessun record parcheggiato</p>
            <p className="text-sm mt-1">I record non abbinati durante l'importazione PDF appariranno qui</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div>Paziente</div>
                <div>Mese</div>
                <div>Errore</div>
                <div>Tipo</div>
                <div>Azioni</div>
              </div>

              {records.map(record => (
                <div
                  key={record.id}
                  className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 items-center p-3 rounded border bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingNames[record.id] ?? record.patient_name ?? ''}
                      onChange={(e) => setEditingNames(prev => ({ ...prev, [record.id]: e.target.value }))}
                      className="h-8 text-sm font-medium"
                      placeholder="Nome paziente"
                    />
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {record.reference_month || '-'}
                  </Badge>
                  <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={record.error_reason || ''}>
                    {record.error_reason || '-'}
                  </span>
                  <Badge variant="secondary">{record.record_type.toUpperCase()}</Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleRetryMatch(record)}
                      title="Riprova abbinamento"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(record.id)}
                      title="Elimina"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
