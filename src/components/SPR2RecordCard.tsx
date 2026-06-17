import { SPR2Record, SI_NO_OPTIONS, MOTIVO_RIVAL_OPTIONS, MOTIVO_SOSP_OPTIONS, DIM_UTE_OPTIONS } from "@/types/spr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Trash2, Check, ChevronsUpDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { calculateImpres, checkMathConsistency } from "@/lib/financial-utils";
import { useState, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SPR2RecordCardProps {
  record: SPR2Record;
  index: number;
  onUpdate: (index: number, field: keyof SPR2Record, value: string) => void;
  onRemove: (index: number) => void;
  parentCF?: string;  // Codice Fiscale del paziente SPR1 collegato
}

function SPR2RecordCard({ record, index, onUpdate, onRemove, parentCF }: SPR2RecordCardProps) {
  const [dimUteOpen, setDimUteOpen] = useState(false);

  // Check mathematical consistency for display
  const mathConsistency = useMemo(() => {
    if (record.record !== "3") return null;
    // GAUSS: impres deve essere tariffa x numpres (giorni)
    return checkMathConsistency(record.tariffa, record.numpres, record.impres);
  }, [record.tariffa, record.numpres, record.impres, record.record]);

  // Suggerisci impres calcolato quando tariffa o numpres cambiano, ma NON sovrascrivere modifiche manuali
  const suggestedImpres = useMemo(() => {
    if (record.record !== "3") return null;
    return calculateImpres(record.tariffa, record.numpres);
  }, [record.tariffa, record.numpres, record.record]);

  const getRecordTypeName = () => {
    switch (record.record) {
      case "3":
        return "Trattamento";
      case "4":
        return "Rivalutazione/Valutazione Finale";
      case "5":
        return "Sospensione";
      case "6":
        return "Conclusione";
      default:
        return "Tipo sconosciuto";
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              Record #{index + 1} - {getRecordTypeName()}
            </CardTitle>
            {record.is_remote && (
              <Badge variant="secondary" className="text-[10px]">🏠 Remoto</Badge>
            )}
            {/* Mathematical consistency indicator */}
            {record.record === "3" && mathConsistency && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {mathConsistency.isConsistent ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {mathConsistency.isConsistent ? (
                      <p className="text-sm">✓ Coerenza matematica OK: tariffa × numpres = impres</p>
                    ) : (
                      <div className="text-sm">
                        <p className="font-semibold text-amber-600">⚠ Discrepanza rilevata</p>
                        <p>Atteso: {mathConsistency.expectedImpres}€</p>
                        <p>Attuale: {mathConsistency.actualImpres}€</p>
                        <p className="text-muted-foreground">Diff: {mathConsistency.difference.toFixed(2)}€</p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header fields - Always visible and read-only (inherited from SPR1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b">
          <div className="space-y-2">
            <Label>Codice USL *</Label>
            <Input value={record.codusl} readOnly maxLength={3} placeholder="001" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Struttura *</Label>
            <Input
              value={record.struttura}
              onChange={(e) => onUpdate(index, "struttura", e.target.value)}
              maxLength={6}
              placeholder="STR001"
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label>Data PIC *</Label>
            <Input
              type="date"
              value={record.data_PIC}
              onChange={(e) => onUpdate(index, "data_PIC", e.target.value)}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label>N° Pratica *</Label>
            <Input
              value={record.nprat}
              onChange={(e) => onUpdate(index, "nprat", e.target.value)}
              maxLength={20}
              placeholder="PRAT001"
              disabled
              className="bg-muted"
            />
          </div>
          {/* Campo CF Read-Only - SEMPRE VISIBILE */}
          <div className="space-y-2 col-span-full lg:col-span-1">
            <Label className="flex items-center gap-1">
              <span>Codice Fiscale (SPR1)</span>
              {!parentCF && <span className="text-destructive">⚠</span>}
            </Label>
            <Input 
              value={parentCF || "Non collegato"} 
              readOnly 
              disabled 
              className={`font-mono text-xs ${parentCF ? 'bg-muted' : 'bg-destructive/10 text-destructive border-destructive/50'}`}
              title={parentCF ? "Codice Fiscale del paziente collegato" : "Record SPR2 non collegato a SPR1"}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          🔒 Questi campi sono ereditati da SPR1 e non modificabili
        </p>

        {/* Type 3: Trattamento */}
        {record.record === "3" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Dati Trattamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Codice Prestazione - read-only, derivato dalla tariffa */}
              <div className="space-y-2">
                <Label>Codice Prestazione</Label>
                <Input
                  value={record.codpres || (parseFloat(String(record.tariffa || '0').replace(',', '.')) > 50 ? '417.1' : '405.1')}
                  readOnly
                  disabled
                  className="bg-muted font-mono"
                  title="Derivato dalla tariffa: 417.1 (AC) = 54,25€, 405.1 (AA) = 44,90€"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Inizio *</Label>
                <Input
                  type="date"
                  value={record.dataini || ""}
                  onChange={(e) => onUpdate(index, "dataini", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fine *</Label>
                <Input
                  type="date"
                  value={record.datafine || ""}
                  onChange={(e) => onUpdate(index, "datafine", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>N° Prestazioni *</Label>
                <Input
                  type="number"
                  min="1"
                  value={record.numpres || ""}
                  onChange={(e) => onUpdate(index, "numpres", e.target.value)}
                  placeholder="10"
                  className="required-conditional"
                />
              </div>

              <div className="space-y-2">
                <Label>Tariffa (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={record.tariffa ?? ""}
                  onChange={(e) => {
                    let raw = e.target.value;
                    raw = raw.replace(/[^0-9.,]/g, "");
                    const parts = raw.split(/[,\.]/);
                    if (parts.length > 2) {
                      raw = parts[0] + "," + parts.slice(1).join("");
                    }
                    onUpdate(index, "tariffa", raw);
                  }}
                  placeholder="20,00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Importo Prestazione (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={record.impres ?? ""}
                    onChange={(e) => {
                      let raw = e.target.value;
                      raw = raw.replace(/[^0-9.,]/g, "");
                      const parts = raw.split(/[,\.]/);
                      if (parts.length > 2) {
                        raw = parts[0] + "," + parts.slice(1).join("");
                      }
                      onUpdate(index, "impres", raw);
                    }}
                    placeholder="0,00"
                    className="font-mono text-sm"
                  />
                  {suggestedImpres && suggestedImpres !== record.impres && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs whitespace-nowrap"
                            onClick={() => onUpdate(index, "impres", suggestedImpres)}
                          >
                            = {suggestedImpres}€
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Applica calcolo: Tariffa × Num. Prestazioni</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Modificabile. Suggerimento: Tariffa × Num. Prestazioni
                </p>
              </div>
              <div className="space-y-2">
                <Label>Durata (ore)</Label>
                <Input
                  type="number"
                  value={record.durata || ""}
                  onChange={(e) => onUpdate(index, "durata", e.target.value)}
                  placeholder="45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`compensa-${index}`}>Prestazione Compensabile</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id={`compensa-${index}`}
                    checked={record.compensa === "1"}
                    onCheckedChange={(checked) => onUpdate(index, "compensa", checked ? "1" : "0")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {record.compensa === "1" ? "Sì (Rimborsabile)" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type 4: Rivalutazione */}
        {record.record === "4" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Dati Rivalutazione</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Valutazione *</Label>
                <Input
                  type="date"
                  value={record.dt_Rival_ValF || ""}
                  onChange={(e) => onUpdate(index, "dt_Rival_ValF", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo *</label>
                <Select
                  value={record.motiv_RivalValF || ""}
                  onValueChange={(value) => onUpdate(index, "motiv_RivalValF", value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {MOTIVO_RIVAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conferma Valutazione Precedente</label>
                <Select
                  value={record.confValPrec || ""}
                  onValueChange={(value) => onUpdate(index, "confValPrec", value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {SI_NO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clinical fields - Only if Conferma = 2 (No) */}
            {record.confValPrec === "2" && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-sm text-muted-foreground">Dati Clinici (Nuova Valutazione)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diagnosi ICD9-CM</Label>
                    <Input
                      value={record.R_ICD9CM || ""}
                      onChange={(e) => onUpdate(index, "R_ICD9CM", e.target.value)}
                      maxLength={6}
                      placeholder="36200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Diagnosi ICD9-CM Comorbidità</Label>
                    <Input
                      value={record.R_ICD9CM_c || ""}
                      onChange={(e) => onUpdate(index, "R_ICD9CM_c", e.target.value)}
                      maxLength={6}
                      placeholder="36201"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stabilità Clinica</label>
                    <Select
                      value={record.rvf_stabclin || ""}
                      onValueChange={(value) => onUpdate(index, "rvf_stabclin", value)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Qualità Vita</label>
                    <Select
                      value={record.rvf_vitaq || ""}
                      onValueChange={(value) => onUpdate(index, "rvf_vitaq", value)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mobilità</label>
                    <Select value={record.rvf_mob || ""} onValueChange={(value) => onUpdate(index, "rvf_mob", value)}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cognitivo</label>
                    <Select value={record.rvf_cogn || ""} onValueChange={(value) => onUpdate(index, "rvf_cogn", value)}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comportamento</label>
                    <Select value={record.rvf_comp || ""} onValueChange={(value) => onUpdate(index, "rvf_comp", value)}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comunicazione</label>
                    <Select value={record.rvf_comu || ""} onValueChange={(value) => onUpdate(index, "rvf_comu", value)}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {SI_NO_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Type 5: Sospensione */}
        {record.record === "5" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Dati Sospensione</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Inizio Sospensione *</Label>
                <Input
                  type="date"
                  value={record.dataSosp_I || ""}
                  onChange={(e) => onUpdate(index, "dataSosp_I", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fine Sospensione *</Label>
                <Input
                  type="date"
                  value={record.dataSosp_F || ""}
                  onChange={(e) => onUpdate(index, "dataSosp_F", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo Sospensione *</label>
                <Select
                  value={record.motivo_Sosp || ""}
                  onValueChange={(value) => onUpdate(index, "motivo_Sosp", value)}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {MOTIVO_SOSP_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Type 6: Conclusione */}
        {record.record === "6" && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Dati Conclusione</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Fine Ciclo *</Label>
                <Input
                  type="date"
                  value={record.d_fineciclo || ""}
                  onChange={(e) => onUpdate(index, "d_fineciclo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo Dimissione *</label>
                <Popover open={dimUteOpen} onOpenChange={setDimUteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={dimUteOpen}
                      className="w-full justify-between bg-background"
                    >
                      {record.dim_ute
                        ? DIM_UTE_OPTIONS.find((opt) => opt.value === record.dim_ute)?.label
                        : "Seleziona motivo dimissione..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-popover border-border z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca motivo dimissione..." />
                      <CommandList>
                        <CommandEmpty>Nessun risultato trovato.</CommandEmpty>
                        <CommandGroup>
                          {DIM_UTE_OPTIONS.map((opt) => (
                            <CommandItem
                              key={opt.value}
                              value={opt.label}
                              onSelect={() => {
                                onUpdate(index, "dim_ute", opt.value);
                                setDimUteOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  record.dim_ute === opt.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {opt.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Riunione Equipe Finale</Label>
                <Input
                  type="date"
                  value={record.DriunioneF || ""}
                  onChange={(e) => onUpdate(index, "DriunioneF", e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <h5 className="font-medium text-sm mb-3">Scale Disabilità in Uscita</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Scala 1</Label>
                  <Input
                    value={record.disFinal_1 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_1", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scala 2</Label>
                  <Input
                    value={record.disFinal_2 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_2", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scala 3</Label>
                  <Input
                    value={record.disFinal_3 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_3", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scala 4</Label>
                  <Input
                    value={record.disFinal_4 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_4", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scala 5</Label>
                  <Input
                    value={record.disFinal_5 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_5", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scala 6</Label>
                  <Input
                    value={record.disFinal_6 || ""}
                    onChange={(e) => onUpdate(index, "disFinal_6", e.target.value)}
                    placeholder="0-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize per evitare re-render quando altri record cambiano
export default memo(SPR2RecordCard, (prevProps, nextProps) => {
  // Solo re-render se il record specifico o i suoi handler cambiano
  return (
    prevProps.index === nextProps.index &&
    prevProps.record === nextProps.record &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onRemove === nextProps.onRemove
  );
});
