import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Euro, AlertTriangle, MapPin, Edit2, CheckCircle2, RefreshCw } from "lucide-react";
import { SPR1Record, SPR2Record } from "@/types/spr";
import { getZonaByUslResu, getAllZone, ZonaInfo, getZonaByIstat } from "@/lib/district-mapping";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { findComuneByIstat, findAslByComune, ComuneRecord, searchComuniByNome, initDizionari } from "@/lib/dizionari-territoriali";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportDistrettoProps {
  spr1Records: SPR1Record[];
  spr2Records: SPR2Record[];
  onRecordsChange: (records: SPR1Record[]) => void;
}

interface PatientRow {
  spr1: SPR1Record;
  spr1Index: number;
  spr2List: SPR2Record[];
  zona: ZonaInfo | null;
  hasError: boolean;
  errorType?: "missing_lures" | "unknown_zona";
  totalImporto: number;
  totalPrestazioni: number;
}

const ZONE_COLORS = [
  "hsl(210, 100%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(160, 60%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(20, 80%, 55%)",
  "hsl(120, 50%, 40%)",
  "hsl(0, 60%, 50%)",
];

function parseNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const str = String(val).replace(",", ".");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function ReportDistretto({ spr1Records, spr2Records, onRecordsChange }: ReportDistrettoProps) {
  const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);
  const [editLures, setEditLures] = useState("");
  const [batchFixing, setBatchFixing] = useState(false);

  // Batch fix: update all records with missing lures in the database
  const handleBatchFix = async () => {
    setBatchFixing(true);
    try {
      await initDizionari();
      
      // Find records missing lures
      const missingLures = spr1Records.filter(r => !r.lures);
      if (missingLures.length === 0) {
        toast.info("Tutti i record hanno già il codice ISTAT residenza.");
        setBatchFixing(false);
        return;
      }

      let fixedCount = 0;
      const updatedRecords = [...spr1Records];

      for (let i = 0; i < updatedRecords.length; i++) {
        const rec = updatedRecords[i];
        if (rec.lures) continue;

        // Default: Firenze (048017) for ASL 201 without better info
        const defaultLures = "048017";
        const defaultRegresu = "090";
        const defaultUslresu = "201";

        updatedRecords[i] = {
          ...rec,
          lures: defaultLures,
          regresu: rec.regresu || defaultRegresu,
          uslresu: rec.uslresu || defaultUslresu,
        };

        // Update in database if record has a DB id
        const dbId = (rec as any)._dbId;
        if (dbId) {
          await supabase
            .from('spr1_records')
            .update({ lures: defaultLures, regresu: defaultRegresu, uslresu: defaultUslresu })
            .eq('id', dbId);
        }

        fixedCount++;
      }

      onRecordsChange(updatedRecords);
      toast.success(`Aggiornati ${fixedCount} record con residenza default (Firenze, ASL 201).`);
    } catch (error) {
      console.error('Errore batch fix:', error);
      toast.error('Errore durante la correzione batch.');
    } finally {
      setBatchFixing(false);
    }
  };
  // Build patient rows with zone assignment
  const patientRows = useMemo<PatientRow[]>(() => {
    return spr1Records.map((spr1, idx) => {
      // Find associated SPR2 records
      const spr2List = spr2Records.filter(s2 => {
        if ((s2 as any)._spr1Id && (spr1 as any)._dbId) {
          return (s2 as any)._spr1Id === (spr1 as any)._dbId;
        }
        return s2.codusl === spr1.codusl && s2.struttura === spr1.struttura &&
               s2.data_PIC === spr1.data_PIC && s2.nprat === spr1.nprat;
      });

      // Zone assignment: usa uslresu (con fallback a codusl) e lures per massima precisione
      const effectiveUslResu = spr1.uslresu || spr1.codusl || "";
      const zona = getZonaByUslResu(effectiveUslResu, spr1.lures || "");
      
      let hasError = false;
      let errorType: PatientRow["errorType"];
      if (!spr1.lures && effectiveUslResu === "201") {
        // Ha ASL 201 ma senza ISTAT non possiamo raffinare la sotto-zona
        hasError = true;
        errorType = "missing_lures";
      } else if (!spr1.lures && !zona) {
        hasError = true;
        errorType = "missing_lures";
      } else if (spr1.lures && !zona) {
        hasError = true;
        errorType = "unknown_zona";
      }

      // Calculate totals from SPR2
      const totalImporto = spr2List.reduce((sum, s2) => sum + parseNumber(s2.impres), 0);
      const totalPrestazioni = spr2List.reduce((sum, s2) => sum + parseNumber(s2.numpres), 0);

      return { spr1, spr1Index: idx, spr2List, zona, hasError, errorType, totalImporto, totalPrestazioni };
    });
  }, [spr1Records, spr2Records]);

  // Group by zone
  const groupedByZone = useMemo(() => {
    const allZone = getAllZone();
    const groups: Record<string, PatientRow[]> = {};
    
    for (const z of allZone) {
      groups[z.id] = [];
    }
    groups["__no_zona"] = [];

    for (const row of patientRows) {
      if (row.zona) {
        if (!groups[row.zona.id]) groups[row.zona.id] = [];
        groups[row.zona.id].push(row);
      } else {
        groups["__no_zona"].push(row);
      }
    }

    return groups;
  }, [patientRows]);

  // Summary stats
  const stats = useMemo(() => {
    const withSpr2 = patientRows.filter(p => p.spr2List.length > 0);
    const totalImporto = patientRows.reduce((s, p) => s + p.totalImporto, 0);
    const totalPrestazioni = patientRows.reduce((s, p) => s + p.totalPrestazioni, 0);
    const errorCount = patientRows.filter(p => p.hasError).length;
    return { totalPatients: withSpr2.length, totalImporto, totalPrestazioni, errorCount };
  }, [patientRows]);

  // Pie chart data
  const pieData = useMemo(() => {
    const allZone = getAllZone();
    const data = allZone
      .map(z => ({
        name: z.nome,
        value: (groupedByZone[z.id] || []).reduce((s, p) => s + p.totalImporto, 0),
      }))
      .filter(d => d.value > 0);
    
    const noZonaTotal = (groupedByZone["__no_zona"] || []).reduce((s, p) => s + p.totalImporto, 0);
    if (noZonaTotal > 0) {
      data.push({ name: "Senza Zona", value: noZonaTotal });
    }
    return data;
  }, [groupedByZone]);

  // Handle correction
  const handleSaveCorrection = () => {
    if (!editingPatient || !editLures) return;

    const comune = findComuneByIstat(editLures);
    const aslCode = findAslByComune(editLures);

    const updatedRecords = [...spr1Records];
    const idx = editingPatient.spr1Index;
    updatedRecords[idx] = {
      ...updatedRecords[idx],
      lures: editLures,
      regresu: comune?.codiceRegione || updatedRecords[idx].regresu,
      uslresu: aslCode || updatedRecords[idx].uslresu,
    };
    onRecordsChange(updatedRecords);
    setEditingPatient(null);
    setEditLures("");
  };

  const openEditDialog = (patient: PatientRow) => {
    setEditingPatient(patient);
    setEditLures(patient.spr1.lures || "");
  };

  if (spr1Records.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">Nessun dato disponibile</p>
          <p className="text-sm mt-1">Carica i dati SPR1 e SPR2 per generare il report per distretto.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pazienti con SPR2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.totalPatients}</span>
              <span className="text-sm text-muted-foreground">/ {spr1Records.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totale Prestazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <span className="text-2xl font-bold">{stats.totalPrestazioni}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Importo Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatCurrency(stats.totalImporto)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.errorCount > 0 ? "border-amber-400 bg-amber-50/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errori da Correggere</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${stats.errorCount > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              <span className={`text-2xl font-bold ${stats.errorCount > 0 ? "text-amber-700" : ""}`}>{stats.errorCount}</span>
            </div>
            {stats.errorCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={handleBatchFix}
                disabled={batchFixing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${batchFixing ? "animate-spin" : ""}`} />
                {batchFixing ? "Correzione..." : "Fix Automatico"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuzione Importi per Zona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone Accordion */}
      <Accordion type="multiple" defaultValue={getAllZone().map(z => z.id)} className="space-y-3">
        {getAllZone().map((zona) => {
          const rows = groupedByZone[zona.id] || [];
          const zonaTotal = rows.reduce((s, p) => s + p.totalImporto, 0);
          const zonaPrestazioni = rows.reduce((s, p) => s + p.totalPrestazioni, 0);

          return (
            <AccordionItem key={zona.id} value={zona.id} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 w-full mr-4">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">{zona.nome}</span>
                  <Badge variant="secondary" className="ml-auto">{rows.length} paz.</Badge>
                  <Badge variant="outline">{zonaPrestazioni} prest.</Badge>
                  <span className="text-sm font-medium text-green-700">{formatCurrency(zonaTotal)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nessun paziente in questa zona</p>
                ) : (
                  <ZoneTable rows={rows} onEdit={openEditDialog} />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}

        {/* No-zone group */}
        {(groupedByZone["__no_zona"] || []).length > 0 && (
          <AccordionItem value="__no_zona" className="border rounded-lg bg-card border-amber-400">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 w-full mr-4">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-700">Senza Zona Assegnata</span>
                <Badge variant="destructive" className="ml-auto">{groupedByZone["__no_zona"].length} paz.</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ZoneTable rows={groupedByZone["__no_zona"]} onEdit={openEditDialog} showErrors />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Grand Total */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Totale Generale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Pazienti</p>
              <p className="text-xl font-bold">{spr1Records.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prestazioni</p>
              <p className="text-xl font-bold">{stats.totalPrestazioni}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Importo</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totalImporto)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correggi Residenza Paziente</DialogTitle>
            <DialogDescription>
              {editingPatient && `${editingPatient.spr1.Cognome} ${editingPatient.spr1.Nome} — CF: ${editingPatient.spr1.IDutente}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Comune di Residenza</label>
              <ComuneAutocomplete
                value={editLures}
                onChange={setEditLures}
                onComuneSelect={(comune: ComuneRecord, aslCode: string | null) => {
                  setEditLures(comune.codiceIstat);
                }}
                placeholder="Cerca comune..."
              />
            </div>
            {editLures && (
              <div className="text-sm text-muted-foreground">
                <p>Codice ISTAT: <span className="font-mono">{editLures}</span></p>
                {(() => {
                  const c = findComuneByIstat(editLures);
                  const a = findAslByComune(editLures);
                  const z = getZonaByUslResu(a || "", editLures);
                  return (
                    <>
                      {c && <p>Comune: <strong>{c.nome}</strong></p>}
                      {a && <p>ASL: <span className="font-mono">{a}</span></p>}
                      {z && <p>Zona: <strong>{z.nome}</strong></p>}
                      {a && !z && <p className="text-amber-600">⚠ Zona non riconosciuta per ASL {a}</p>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPatient(null)}>Annulla</Button>
            <Button onClick={handleSaveCorrection} disabled={!editLures}>Salva Correzione</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component: table for a zone
function ZoneTable({ rows, onEdit, showErrors }: { rows: PatientRow[]; onEdit: (p: PatientRow) => void; showErrors?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Cognome</TableHead>
            <TableHead className="w-[140px]">Nome</TableHead>
            <TableHead className="w-[140px]">Codice Fiscale</TableHead>
            <TableHead className="w-[140px]">Comune Res.</TableHead>
            <TableHead className="text-right">Prestazioni</TableHead>
            <TableHead className="text-right">Importo</TableHead>
            {showErrors && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => {
            const comuneInfo = row.spr1.lures ? findComuneByIstat(row.spr1.lures) : null;
            const rowClass = row.errorType === "missing_lures"
              ? "bg-amber-50 hover:bg-amber-100"
              : row.errorType === "unknown_zona"
                ? "bg-red-50 hover:bg-red-100"
                : "";
            return (
              <TableRow key={i} className={rowClass}>
                <TableCell className="font-medium">{row.spr1.Cognome || "—"}</TableCell>
                <TableCell>{row.spr1.Nome || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{row.spr1.IDutente || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {comuneInfo ? (
                      <span className="text-sm">{comuneInfo.nome}</span>
                    ) : row.spr1.lures ? (
                      <span className="text-sm font-mono">{row.spr1.lures}</span>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Mancante</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => onEdit(row)} title="Modifica residenza">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">{row.totalPrestazioni || "—"}</TableCell>
                <TableCell className="text-right font-medium">{row.totalImporto > 0 ? formatCurrency(row.totalImporto) : "—"}</TableCell>
                {showErrors && (
                  <TableCell>
                    {row.errorType === "missing_lures" && (
                      <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">Res.</Badge>
                    )}
                    {row.errorType === "unknown_zona" && (
                      <Badge variant="outline" className="text-red-600 border-red-400 text-xs">Zona</Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-semibold">Subtotale</TableCell>
            <TableCell className="text-right font-semibold">{rows.reduce((s, r) => s + r.totalPrestazioni, 0)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(rows.reduce((s, r) => s + r.totalImporto, 0))}</TableCell>
            {showErrors && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
