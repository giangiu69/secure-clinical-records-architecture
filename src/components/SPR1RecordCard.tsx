import {
  SPR1Record,
  GENERE_OPTIONS,
  SETTING_OPTIONS,
  ACCESSO_OPTIONS,
  SI_NO_OPTIONS,
  STATO_CIVILE_OPTIONS,
  TITOLO_STUDIO_OPTIONS,
  CONDIZIONE_PROF_OPTIONS,
  RESP_GEN_OPTIONS,
} from "@/types/spr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertCircle, Calculator } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ValidationError } from "@/lib/spr1-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseCodiceFiscale, calculateCodiceFiscale, validateCodiceFiscale, calcolaEta } from "@/lib/cf-parser";
import { useEffect, useRef, useState, memo } from "react";
import { toast } from "sonner";
import { ComuneAutocomplete } from "@/components/ComuneAutocomplete";
import { ComuneRecord } from "@/lib/dizionari-territoriali";

interface SPR1RecordCardProps {
  record: SPR1Record;
  index: number;
  onUpdate: (index: number, field: keyof SPR1Record, value: string) => void;
  onRemove: (index: number) => void;
  errors?: ValidationError[];
}

function SPR1RecordCard({ record, index, onUpdate, onRemove, errors = [] }: SPR1RecordCardProps) {
  const [cfWarning, setCfWarning] = useState<string>("");
  const updateSourceRef = useRef<"cf" | "data" | null>(null);

  const getFieldError = (field: keyof SPR1Record): string | undefined => {
    return errors.find((err) => err.field === field)?.message;
  };

  const hasFieldError = (field: keyof SPR1Record): boolean => {
    return errors.some((err) => err.field === field);
  };

  // Calcolo CF da dati anagrafici (Direzione A)
  useEffect(() => {
    if (updateSourceRef.current === "cf") {
      updateSourceRef.current = null;
      return;
    }

    const { Cognome, Nome, datanasc, genere, comnasu } = record;

    if (Cognome && Nome && datanasc && genere && comnasu) {
      const calculated = calculateCodiceFiscale(Cognome, Nome, datanasc, genere, comnasu);

      if (calculated) {
        if (!record.IDutente || record.IDutente.trim() === "") {
          updateSourceRef.current = "data";
          onUpdate(index, "IDutente", calculated);
        } else if (record.IDutente.toUpperCase() !== calculated) {
          const isValid = validateCodiceFiscale(record.IDutente);
          if (isValid) {
            setCfWarning(
              `Il CF inserito (${record.IDutente}) non corrisponde ai dati anagrafici. CF calcolato: ${calculated}`,
            );
          } else {
            updateSourceRef.current = "data";
            onUpdate(index, "IDutente", calculated);
            setCfWarning("");
          }
        } else {
          setCfWarning("");
        }
      }
    }
  }, [record.Cognome, record.Nome, record.datanasc, record.genere, record.comnasu]);

  // Parsing CF -> Dati anagrafici (Direzione B)
  useEffect(() => {
    if (updateSourceRef.current === "data") {
      updateSourceRef.current = null;
      return;
    }

    if (record.IDutente && record.IDutente.length === 16) {
      const parsed = parseCodiceFiscale(record.IDutente);
      if (parsed) {
        updateSourceRef.current = "cf";

        // Aggiorna genere se non già impostato o diverso
        if (!record.genere || record.genere !== parsed.genere) {
          onUpdate(index, "genere", parsed.genere);
        }
        // Aggiorna data di nascita se non già impostata o diversa
        if (!record.datanasc || record.datanasc !== parsed.dataNascita) {
          onUpdate(index, "datanasc", parsed.dataNascita);
        }
        // Aggiorna codice Belfiore se trovato
        if (parsed.codiceBelfiore && (!record.comnasu || record.comnasu !== parsed.codiceBelfiore)) {
          onUpdate(index, "comnasu", parsed.codiceBelfiore);
        }

        // Mostra il comune trovato
        if (parsed.comuneNascita) {
          toast.success(`Comune di nascita: ${parsed.comuneNascita}`);
        }

        setCfWarning("");
      }
    }
  }, [record.IDutente]);

  // Ricalcolo manuale CF
  const handleCalculateCF = () => {
    const { Cognome, Nome, datanasc, genere, comnasu } = record;

    if (!Cognome || !Nome || !datanasc || !genere || !comnasu) {
      toast.error("Compila tutti i campi anagrafici (Cognome, Nome, Data Nascita, Genere, Comune Nascita)");
      return;
    }

    const calculated = calculateCodiceFiscale(Cognome, Nome, datanasc, genere, comnasu);
    if (calculated) {
      updateSourceRef.current = "data";
      onUpdate(index, "IDutente", calculated);
      toast.success("Codice Fiscale calcolato!");
      setCfWarning("");
    } else {
      toast.error("Errore nel calcolo del Codice Fiscale");
    }
  };

  // Logica geografica: se cittadinanza non è Italia, imposta regresu e uslresu a 999
  useEffect(() => {
    if (record.cittu && record.cittu !== "100") {
      if (record.regresu !== "999") {
        onUpdate(index, "regresu", "999");
      }
      if (record.uslresu !== "999") {
        onUpdate(index, "uslresu", "999");
      }
    }
  }, [record.cittu]);

  // Calcola se l'utente è minorenne e gestisci respGen automaticamente
  const isMinorenne = record.datanasc && record.data_PIC ? calcolaEta(record.datanasc, record.data_PIC) < 18 : false;

  // Auto-gestione respGen: attiva solo se minorenne, altrimenti svuota
  useEffect(() => {
    if (record.datanasc && record.data_PIC) {
      if (isMinorenne) {
        // Se minore e respGen è vuoto, imposta a "9" (Dato Mancante)
        if (!record.respGen || record.respGen.trim() === "") {
          onUpdate(index, "respGen", "9");
        }
      } else {
        // Se maggiorenne, svuota respGen
        if (record.respGen && record.respGen.trim() !== "") {
          onUpdate(index, "respGen", "");
        }
      }
    }
  }, [isMinorenne, record.datanasc, record.data_PIC]);

  // Helper function per normalizzare controllo ticket zero
  const isTicketZero = (value: string): boolean => {
    if (!value || value.trim() === "") return true;
    // Normalizza il valore rimuovendo zeri iniziali e convertendo virgola in punto
    const normalized = value.replace(/,/g, ".").replace(/^0+/, "") || "0";
    const numValue = parseFloat(normalized);
    return numValue === 0 || value === "00000,00";
  };

  // Condizioni per campi condizionali
  const isProrogheRequired = record.accesso === "2";
  const isDProfAltriRequired = record.prof_altri_san === "1";
  const isCodEseRequired = isTicketZero(record.imptick);

  // Condizioni per punteggi scale disabilità 2-6
  const isDisIngr2Required = record.scalaDis_2 && record.scalaDis_2.trim() !== "";
  const isDisIngr3Required = record.scalaDis_3 && record.scalaDis_3.trim() !== "";
  const isDisIngr4Required = record.scalaDis_4 && record.scalaDis_4.trim() !== "";
  const isDisIngr5Required = record.scalaDis_5 && record.scalaDis_5.trim() !== "";
  const isDisIngr6Required = record.scalaDis_6 && record.scalaDis_6.trim() !== "";

  return (
    <Card className={cn("mb-4", errors.length > 0 && "border-destructive")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Record SPR1 #{index + 1}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Questo record ha {errors.length} {errors.length === 1 ? "campo" : "campi"} da correggere prima
              dell'esportazione.
            </AlertDescription>
          </Alert>
        )}

        {/* SEZIONE 1: DATI CRITICI (Priorità Alta) */}
        <div className="border-2 border-primary/20 rounded-lg p-6 bg-background space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-primary">Dati Obbligatori & Anagrafica</h2>
            <p className="text-xs text-muted-foreground mt-1">Campi principali richiesti per la validazione</p>
          </div>

          {/* Sezione Identificazione */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Identificazione Record</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`record-${index}`}>
                  Tipo Record <span className="text-destructive">*</span>
                </Label>
                <Input id={`record-${index}`} value={record.record} disabled className="bg-muted" />
              </div>
              <div>
                <Label htmlFor={`opera-${index}`} className={cn(hasFieldError("opera") && "text-destructive")}>
                  Opera <span className="text-destructive">*</span>
                </Label>
                <Select value={record.opera} onValueChange={(value) => onUpdate(index, "opera", value)}>
                  <SelectTrigger 
                    id={`opera-${index}`}
                    className={cn(
                      "bg-background",
                      hasFieldError("opera") && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="1">1 - Invio</SelectItem>
                  <SelectItem value="3">3 - Sostituzione</SelectItem>
                  <SelectItem value="4">4 - Eliminazione/Modifica</SelectItem>
                </SelectContent>
                </Select>
                {getFieldError("opera") && <p className="text-xs text-destructive mt-1">{getFieldError("opera")}</p>}
              </div>
              <div>
                <Label htmlFor={`codusl-${index}`} className={cn(hasFieldError("codusl") && "text-destructive")}>
                  Cod USL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`codusl-${index}`}
                  value={record.codusl}
                  onChange={(e) => onUpdate(index, "codusl", e.target.value)}
                  maxLength={3}
                  placeholder="010"
                />
                <p className="text-xs text-muted-foreground mt-1">Default: 010 (modificabile)</p>
              </div>
              <div>
                <Label htmlFor={`struttura-${index}`} className={cn(hasFieldError("struttura") && "text-destructive")}>
                  Struttura <span className="text-destructive">*</span>
                </Label>
                <Input id={`struttura-${index}`} value={record.struttura} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Codice Regionale Ass.C.A. (Fisso)</p>
              </div>
              <div>
                <Label htmlFor={`dataPIC-${index}`} className={cn(hasFieldError("data_PIC") && "text-destructive")}>
                  Data PIC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`dataPIC-${index}`}
                  type="date"
                  value={record.data_PIC}
                  onChange={(e) => onUpdate(index, "data_PIC", e.target.value)}
                  className={cn(hasFieldError("data_PIC") && "border-destructive")}
                />
                {getFieldError("data_PIC") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("data_PIC")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`nprat-${index}`} className={cn(hasFieldError("nprat") && "text-destructive")}>
                  N° Pratica <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm font-mono border">
                    FA7
                  </span>
                  <Input
                    id={`nprat-${index}`}
                    value={record.nprat.replace(/^FA7/, "")}
                    onChange={(e) => {
                      const value = e.target.value;
                      const prefixed = value ? `FA7${value}` : "";
                      onUpdate(index, "nprat", prefixed);
                    }}
                    maxLength={10}
                    placeholder="2025001"
                    className={cn(hasFieldError("nprat") && "border-destructive")}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Il prefisso FA7 viene aggiunto automaticamente</p>
                {getFieldError("nprat") && <p className="text-xs text-destructive mt-1">{getFieldError("nprat")}</p>}
              </div>
              <div>
                <Label htmlFor={`tipoindu-${index}`} className={cn(hasFieldError("tipoindu") && "text-destructive")}>
                  Tipo Indu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`tipoindu-${index}`}
                  value={record.tipoindu}
                  onChange={(e) => onUpdate(index, "tipoindu", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                  className={cn(hasFieldError("tipoindu") && "border-destructive")}
                />
                {getFieldError("tipoindu") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("tipoindu")}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Anagrafica Paziente */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Anagrafica Paziente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Label htmlFor={`IDutente-${index}`} className={cn(hasFieldError("IDutente") && "text-destructive")}>
                  ID Utente (CF) <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`IDutente-${index}`}
                    value={record.IDutente}
                    onChange={(e) => onUpdate(index, "IDutente", e.target.value)}
                    maxLength={24}
                    placeholder="Codice fiscale"
                    className={cn(hasFieldError("IDutente") && "border-destructive")}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCalculateCF}
                    title="Calcola CF dai dati anagrafici"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                </div>
                {getFieldError("IDutente") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("IDutente")}</p>
                )}
                {cfWarning && <p className="text-xs text-orange-600 mt-1">{cfWarning}</p>}
              </div>
              <div>
                <Label htmlFor={`genere-${index}`} className={cn(hasFieldError("genere") && "text-destructive")}>
                  Genere <span className="text-destructive">*</span>
                </Label>
                <Select value={record.genere} onValueChange={(value) => onUpdate(index, "genere", value)}>
                  <SelectTrigger
                    id={`genere-${index}`}
                    className={cn("bg-background", hasFieldError("genere") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {GENERE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("genere") && <p className="text-xs text-destructive mt-1">{getFieldError("genere")}</p>}
              </div>
              <div>
                <Label htmlFor={`Cognome-${index}`}>Cognome</Label>
                <Input
                  id={`Cognome-${index}`}
                  value={record.Cognome}
                  onChange={(e) => onUpdate(index, "Cognome", e.target.value)}
                  maxLength={20}
                  placeholder="Rossi"
                />
              </div>
              <div>
                <Label htmlFor={`Nome-${index}`}>Nome</Label>
                <Input
                  id={`Nome-${index}`}
                  value={record.Nome}
                  onChange={(e) => onUpdate(index, "Nome", e.target.value)}
                  maxLength={20}
                  placeholder="Mario"
                />
              </div>
              <div>
                <Label htmlFor={`datanasc-${index}`} className={cn(hasFieldError("datanasc") && "text-destructive")}>
                  Data Nascita <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`datanasc-${index}`}
                  type="date"
                  value={record.datanasc}
                  onChange={(e) => onUpdate(index, "datanasc", e.target.value)}
                  className={cn(hasFieldError("datanasc") && "border-destructive")}
                />
                {getFieldError("datanasc") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("datanasc")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`comnasu-${index}`}>Comune Nascita (Codice Belfiore)</Label>
                <Input
                  id={`comnasu-${index}`}
                  value={record.comnasu}
                  onChange={(e) => onUpdate(index, "comnasu", e.target.value)}
                  maxLength={5}
                  placeholder="H501"
                  title="Esempio: H501 per Roma, F205 per Milano"
                />
                <p className="text-xs text-muted-foreground mt-1">Es: H501 (Roma), F205 (Milano)</p>
              </div>
              <div>
                <Label
                  htmlFor={`respGen-${index}`}
                  className={cn(hasFieldError("respGen") && "text-destructive", isMinorenne && "required-conditional")}
                >
                  Resp. Genitoriale
                </Label>
                <Select
                  value={record.respGen}
                  onValueChange={(value) => onUpdate(index, "respGen", value)}
                  disabled={!isMinorenne}
                >
                  <SelectTrigger
                    id={`respGen-${index}`}
                    className={cn("bg-background", hasFieldError("respGen") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {RESP_GEN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("respGen") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("respGen")}</p>
                )}
                {isMinorenne && <p className="text-xs text-muted-foreground mt-1">Obbligatorio per minorenne</p>}
              </div>
              <div>
                <Label htmlFor={`cittu-${index}`} className={cn(hasFieldError("cittu") && "text-destructive")}>
                  Cittadinanza <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`cittu-${index}`}
                  value={record.cittu}
                  onChange={(e) => onUpdate(index, "cittu", e.target.value)}
                  maxLength={3}
                  placeholder="100"
                  className={cn(hasFieldError("cittu") && "border-destructive")}
                />
                {getFieldError("cittu") && <p className="text-xs text-destructive mt-1">{getFieldError("cittu")}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Residenza */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Residenza</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`lures-${index}`} className={cn(hasFieldError("lures") && "text-destructive")}>
                  Comune Residenza <span className="text-destructive">*</span>
                </Label>
                <ComuneAutocomplete
                  id={`lures-${index}`}
                  value={record.lures}
                  onChange={(codiceIstat) => onUpdate(index, "lures", codiceIstat)}
                  onComuneSelect={(comune: ComuneRecord, aslCode: string | null) => {
                    // Auto-popola regione e USL dal dizionario
                    if (comune.codiceRegione) {
                      onUpdate(index, "regresu", comune.codiceRegione);
                    }
                    if (aslCode) {
                      onUpdate(index, "uslresu", aslCode);
                    }
                  }}
                  placeholder="Cerca comune o inserisci codice ISTAT"
                  hasError={hasFieldError("lures")}
                  referenceDate={record.data_PIC ? new Date(record.data_PIC) : undefined}
                />
                {getFieldError("lures") && <p className="text-xs text-destructive mt-1">{getFieldError("lures")}</p>}
                <p className="text-xs text-muted-foreground mt-1">Cerca per nome o inserisci codice ISTAT (6 cifre)</p>
              </div>
              <div>
                <Label htmlFor={`regresu-${index}`} className={cn(hasFieldError("regresu") && "text-destructive")}>
                  Regione Residenza <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`regresu-${index}`}
                  value={record.regresu}
                  onChange={(e) => onUpdate(index, "regresu", e.target.value)}
                  maxLength={3}
                  placeholder="090"
                  className={cn("bg-muted/50", hasFieldError("regresu") && "border-destructive")}
                  title="Auto-compilato dalla selezione del comune"
                />
                {getFieldError("regresu") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("regresu")}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Auto-compilato dal comune</p>
              </div>
              <div>
                <Label htmlFor={`uslresu-${index}`} className={cn(hasFieldError("uslresu") && "text-destructive")}>
                  USL Residenza <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`uslresu-${index}`}
                  value={record.uslresu}
                  onChange={(e) => onUpdate(index, "uslresu", e.target.value)}
                  maxLength={3}
                  placeholder="001"
                  className={cn("bg-muted/50", hasFieldError("uslresu") && "border-destructive")}
                  title="Auto-compilato dalla selezione del comune"
                />
                {getFieldError("uslresu") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("uslresu")}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Auto-compilato dal comune</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Accesso e Prestazione */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Accesso e Prestazione</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`soggRich-${index}`} className={cn(hasFieldError("soggRich") && "text-destructive")}>
                  Soggetto Richiedente <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`soggRich-${index}`}
                  value={record.soggRich}
                  onChange={(e) => onUpdate(index, "soggRich", e.target.value)}
                  maxLength={2}
                  placeholder="01"
                  className={cn(hasFieldError("soggRich") && "border-destructive")}
                />
                {getFieldError("soggRich") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("soggRich")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`setting-${index}`} className={cn(hasFieldError("setting") && "text-destructive")}>
                  Setting <span className="text-destructive">*</span>
                </Label>
                <Select value={record.setting} onValueChange={(value) => onUpdate(index, "setting", value)}>
                  <SelectTrigger
                    id={`setting-${index}`}
                    className={cn("bg-background", hasFieldError("setting") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {SETTING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("setting") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("setting")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`codpres-${index}`} className={cn(hasFieldError("codpres") && "text-destructive")}>
                  Codice Prestazione <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`codpres-${index}`}
                  value={record.codpres}
                  onChange={(e) => onUpdate(index, "codpres", e.target.value)}
                  maxLength={8}
                  placeholder="93.160.3"
                  className={cn(hasFieldError("codpres") && "border-destructive")}
                />
                {getFieldError("codpres") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("codpres")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`accesso-${index}`} className={cn(hasFieldError("accesso") && "text-destructive")}>
                  Accesso <span className="text-destructive">*</span>
                </Label>
                <Select value={record.accesso} onValueChange={(value) => onUpdate(index, "accesso", value)}>
                  <SelectTrigger
                    id={`accesso-${index}`}
                    className={cn("bg-background", hasFieldError("accesso") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {ACCESSO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("accesso") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("accesso")}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Diagnosi Principale */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Diagnosi Principale</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`ICD9CM-${index}`} className={cn(hasFieldError("ICD9CM") && "text-destructive")}>
                  ICD-9-CM Principale <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`ICD9CM-${index}`}
                  value={record.ICD9CM}
                  onChange={(e) => onUpdate(index, "ICD9CM", e.target.value)}
                  maxLength={5}
                  placeholder="43891"
                  className={cn(hasFieldError("ICD9CM") && "border-destructive")}
                />
                {getFieldError("ICD9CM") && <p className="text-xs text-destructive mt-1">{getFieldError("ICD9CM")}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Pianificazione */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Pianificazione e Valutazione</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label
                  htmlFor={`proroghe-${index}`}
                  className={cn(
                    hasFieldError("proroghe") && "text-destructive",
                    isProrogheRequired && "required-conditional",
                  )}
                >
                  Proroghe
                </Label>
                <Select
                  value={record.proroghe}
                  onValueChange={(value) => onUpdate(index, "proroghe", value)}
                  disabled={!isProrogheRequired}
                >
                  <SelectTrigger
                    id={`proroghe-${index}`}
                    className={cn("bg-background", hasFieldError("proroghe") && "border-destructive")}
                  >
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
                {getFieldError("proroghe") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("proroghe")}</p>
                )}
                {isProrogheRequired && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio per accesso = 2 (Autorizzazione)</p>
                )}
              </div>
              <div>
                <Label htmlFor={`SSN-${index}`}>
                  % SSN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`SSN-${index}`}
                  type="number"
                  value={record.percent_SSN}
                  onChange={(e) => onUpdate(index, "percent_SSN", e.target.value)}
                  min="0"
                  max="100"
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor={`pianif-${index}`}>
                  Pianificazione <span className="text-destructive">*</span>
                </Label>
                <Select value={record.pianif} onValueChange={(value) => onUpdate(index, "pianif", value)}>
                  <SelectTrigger id={`pianif-${index}`} className="bg-background">
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
              <div>
                <Label htmlFor={`dataval-${index}`}>Data Valutazione</Label>
                <Input
                  id={`dataval-${index}`}
                  type="date"
                  value={record.data_val}
                  onChange={(e) => onUpdate(index, "data_val", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`caregiver-${index}`}>Caregiver</Label>
                <Select value={record.care_giver} onValueChange={(value) => onUpdate(index, "care_giver", value)}>
                  <SelectTrigger id={`caregiver-${index}`} className="bg-background">
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
              <div>
                <Label htmlFor={`durataprev-${index}`}>
                  Durata Prevista (gg) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`durataprev-${index}`}
                  type="number"
                  value={record.durata_prev}
                  onChange={(e) => onUpdate(index, "durata_prev", e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor={`oreprev-${index}`}>
                  Ore Previste <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`oreprev-${index}`}
                  type="number"
                  value={record.ore_prev}
                  onChange={(e) => onUpdate(index, "ore_prev", e.target.value)}
                  placeholder="20"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Scale di Disabilità */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Scale di Disabilità (codici 1-9)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num}>
                  <Label htmlFor={`scalaDis_${num}-${index}`}>Scala {num}</Label>
                  <Input
                    id={`scalaDis_${num}-${index}`}
                    value={record[`scalaDis_${num}` as keyof SPR1Record] as string}
                    onChange={(e) => onUpdate(index, `scalaDis_${num}` as keyof SPR1Record, e.target.value)}
                    maxLength={2}
                    placeholder={`0${num}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sezione Punteggi Disabilità Ingresso */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Punteggi Disabilità all'Ingresso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`disIngr_1-${index}`} className={cn(hasFieldError("disIngr_1") && "text-destructive")}>
                  Punteggio Scala 1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`disIngr_1-${index}`}
                  value={record.disIngr_1}
                  onChange={(e) => onUpdate(index, "disIngr_1", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  className={cn(hasFieldError("disIngr_1") && "border-destructive")}
                />
                {getFieldError("disIngr_1") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_1")}</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor={`disIngr_2-${index}`}
                  className={cn(
                    hasFieldError("disIngr_2") && "text-destructive",
                    isDisIngr2Required && "required-conditional",
                  )}
                >
                  Punteggio Scala 2
                </Label>
                <Input
                  id={`disIngr_2-${index}`}
                  value={record.disIngr_2}
                  onChange={(e) => onUpdate(index, "disIngr_2", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  disabled={!isDisIngr2Required}
                  className={cn(hasFieldError("disIngr_2") && "border-destructive")}
                />
                {getFieldError("disIngr_2") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_2")}</p>
                )}
                {isDisIngr2Required && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Scala 2 è compilata</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor={`disIngr_3-${index}`}
                  className={cn(
                    hasFieldError("disIngr_3") && "text-destructive",
                    isDisIngr3Required && "required-conditional",
                  )}
                >
                  Punteggio Scala 3
                </Label>
                <Input
                  id={`disIngr_3-${index}`}
                  value={record.disIngr_3}
                  onChange={(e) => onUpdate(index, "disIngr_3", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  disabled={!isDisIngr3Required}
                  className={cn(hasFieldError("disIngr_3") && "border-destructive")}
                />
                {getFieldError("disIngr_3") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_3")}</p>
                )}
                {isDisIngr3Required && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Scala 3 è compilata</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor={`disIngr_4-${index}`}
                  className={cn(
                    hasFieldError("disIngr_4") && "text-destructive",
                    isDisIngr4Required && "required-conditional",
                  )}
                >
                  Punteggio Scala 4
                </Label>
                <Input
                  id={`disIngr_4-${index}`}
                  value={record.disIngr_4}
                  onChange={(e) => onUpdate(index, "disIngr_4", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  disabled={!isDisIngr4Required}
                  className={cn(hasFieldError("disIngr_4") && "border-destructive")}
                />
                {getFieldError("disIngr_4") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_4")}</p>
                )}
                {isDisIngr4Required && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Scala 4 è compilata</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor={`disIngr_5-${index}`}
                  className={cn(
                    hasFieldError("disIngr_5") && "text-destructive",
                    isDisIngr5Required && "required-conditional",
                  )}
                >
                  Punteggio Scala 5
                </Label>
                <Input
                  id={`disIngr_5-${index}`}
                  value={record.disIngr_5}
                  onChange={(e) => onUpdate(index, "disIngr_5", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  disabled={!isDisIngr5Required}
                  className={cn(hasFieldError("disIngr_5") && "border-destructive")}
                />
                {getFieldError("disIngr_5") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_5")}</p>
                )}
                {isDisIngr5Required && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Scala 5 è compilata</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor={`disIngr_6-${index}`}
                  className={cn(
                    hasFieldError("disIngr_6") && "text-destructive",
                    isDisIngr6Required && "required-conditional",
                  )}
                >
                  Punteggio Scala 6
                </Label>
                <Input
                  id={`disIngr_6-${index}`}
                  value={record.disIngr_6}
                  onChange={(e) => onUpdate(index, "disIngr_6", e.target.value)}
                  maxLength={5}
                  placeholder="00000"
                  disabled={!isDisIngr6Required}
                  className={cn(hasFieldError("disIngr_6") && "border-destructive")}
                />
                {getFieldError("disIngr_6") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("disIngr_6")}</p>
                )}
                {isDisIngr6Required && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Scala 6 è compilata</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Dati Economici */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Dati Economici</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`quoric-${index}`}>Quota Ricovero (€)</Label>
                <Input
                  id={`quoric-${index}`}
                  value={record.quoric}
                  onChange={(e) => onUpdate(index, "quoric", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor={`imptick-${index}`}>
                  Importo Ticket (€) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`imptick-${index}`}
                  value={record.imptick}
                  onChange={(e) => onUpdate(index, "imptick", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor={`impatt-${index}`}>
                  Importo Attività (€) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`impatt-${index}`}
                  value={record.impatt}
                  onChange={(e) => onUpdate(index, "impatt", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label
                  htmlFor={`codese-${index}`}
                  className={cn(
                    hasFieldError("codese") && "text-destructive",
                    isCodEseRequired && "required-conditional",
                  )}
                >
                  Codice Esenzione
                </Label>
                <Input
                  id={`codese-${index}`}
                  value={record.codese}
                  onChange={(e) => onUpdate(index, "codese", e.target.value)}
                  maxLength={6}
                  placeholder="090001"
                  disabled={!isCodEseRequired}
                  className={cn(hasFieldError("codese") && "border-destructive")}
                />
                {getFieldError("codese") && <p className="text-xs text-destructive mt-1">{getFieldError("codese")}</p>}
                {isCodEseRequired && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Ticket = 0</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* FINE SEZIONE 1 */}

        <Separator className="my-8" />

        {/* SEZIONE 2: DATI COMPLEMENTARI (Precompilati) */}
        <div className="rounded-lg p-6 bg-muted/30 space-y-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-primary">Dati Complementari (Precompilati)</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Questi campi sono pre-impostati su "Non Rilevato" (9) per velocizzare l'inserimento. Modificare solo se il
              dato è disponibile.
            </p>
          </div>

          {/* Sezione Dati Socio-Anagrafici */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Dati Socio-Anagrafici</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`statciv-${index}`} className={cn(hasFieldError("statciv") && "text-destructive")}>
                  Stato Civile <span className="text-destructive">*</span>
                </Label>
                <Select value={record.statciv} onValueChange={(value) => onUpdate(index, "statciv", value)}>
                  <SelectTrigger
                    id={`statciv-${index}`}
                    className={cn("bg-background", hasFieldError("statciv") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {STATO_CIVILE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("statciv") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("statciv")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`titstud-${index}`} className={cn(hasFieldError("titstud") && "text-destructive")}>
                  Titolo Studio <span className="text-destructive">*</span>
                </Label>
                <Select value={record.titstud} onValueChange={(value) => onUpdate(index, "titstud", value)}>
                  <SelectTrigger
                    id={`titstud-${index}`}
                    className={cn("bg-background", hasFieldError("titstud") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {TITOLO_STUDIO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("titstud") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("titstud")}</p>
                )}
              </div>
              <div>
                <Label htmlFor={`condprof-${index}`} className={cn(hasFieldError("condprof") && "text-destructive")}>
                  Condizione Professionale <span className="text-destructive">*</span>
                </Label>
                <Select value={record.condprof} onValueChange={(value) => onUpdate(index, "condprof", value)}>
                  <SelectTrigger
                    id={`condprof-${index}`}
                    className={cn("bg-background", hasFieldError("condprof") && "border-destructive")}
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {CONDIZIONE_PROF_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("condprof") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("condprof")}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Diagnosi Concomitante */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Diagnosi Concomitante</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`ICD9CMc-${index}`}>ICD-9-CM Concomitante</Label>
                <Input
                  id={`ICD9CMc-${index}`}
                  value={record.ICD9CM_c}
                  onChange={(e) => onUpdate(index, "ICD9CM_c", e.target.value)}
                  maxLength={5}
                  placeholder="78039"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Valutazione Iniziale */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Valutazione Iniziale (Scale Cliniche)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`vistabclin-${index}`}>Stabilità Clinica</Label>
                <Input
                  id={`vistabclin-${index}`}
                  value={record.vi_stabclin}
                  onChange={(e) => onUpdate(index, "vi_stabclin", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vivitaq-${index}`}>Vita Quotidiana</Label>
                <Input
                  id={`vivitaq-${index}`}
                  value={record.vi_vitaq}
                  onChange={(e) => onUpdate(index, "vi_vitaq", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vimob-${index}`}>Mobilità</Label>
                <Input
                  id={`vimob-${index}`}
                  value={record.vi_mob}
                  onChange={(e) => onUpdate(index, "vi_mob", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vicogn-${index}`}>Cognitività</Label>
                <Input
                  id={`vicogn-${index}`}
                  value={record.vi_cogn}
                  onChange={(e) => onUpdate(index, "vi_cogn", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vicomp-${index}`}>Comportamento</Label>
                <Input
                  id={`vicomp-${index}`}
                  value={record.vi_comp}
                  onChange={(e) => onUpdate(index, "vi_comp", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vicomu-${index}`}>Comunicazione</Label>
                <Input
                  id={`vicomu-${index}`}
                  value={record.vi_comu}
                  onChange={(e) => onUpdate(index, "vi_comu", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`visensor-${index}`}>Funzioni Sensoriali</Label>
                <Input
                  id={`visensor-${index}`}
                  value={record.vi_sensor}
                  onChange={(e) => onUpdate(index, "vi_sensor", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`vibisogni-${index}`}>Bisogni Particolari</Label>
                <Input
                  id={`vibisogni-${index}`}
                  value={record.vi_bisogni}
                  onChange={(e) => onUpdate(index, "vi_bisogni", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`visupsoc-${index}`}>Supporto Sociale</Label>
                <Input
                  id={`visupsoc-${index}`}
                  value={record.vi_supsoc}
                  onChange={(e) => onUpdate(index, "vi_supsoc", e.target.value)}
                  maxLength={1}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`protesi-${index}`}>
                  Protesi/Ausili <span className="text-destructive">*</span>
                </Label>
                <Select value={record.protesi} onValueChange={(value) => onUpdate(index, "protesi", value)}>
                  <SelectTrigger id={`protesi-${index}`} className="bg-background">
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
          </div>

          <Separator />

          {/* Sezione Interventi PRI/PAI */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Interventi PRI/PAI (codici 1-10)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num}>
                  <Label htmlFor={`IntPRIPAI_${num}-${index}`}>Intervento {num}</Label>
                  <Input
                    id={`IntPRIPAI_${num}-${index}`}
                    value={record[`IntPRIPAI_${num}` as keyof SPR1Record] as string}
                    onChange={(e) => onUpdate(index, `IntPRIPAI_${num}` as keyof SPR1Record, e.target.value)}
                    maxLength={2}
                    placeholder={`0${num}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sezione Professionisti */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Professionisti Coinvolti (S/N)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: "prof_MMGPLS", label: "MMG/PLS" },
                { key: "prof_spec", label: "Specialista" },
                { key: "prof_inf", label: "Infermiere" },
                { key: "prof_oss", label: "OSS" },
                { key: "prof_fisiot", label: "Fisioterapista" },
                { key: "prof_log", label: "Logopedista" },
                { key: "prof_terap_ev", label: "Terapista Evolutivo" },
                { key: "prof_occup", label: "Terapista Occup." },
                { key: "prof_psic", label: "Psicologo" },
                { key: "prof_as", label: "Assistente Sociale" },
                { key: "prof_educ", label: "Educatore" },
                { key: "prof_altri_san", label: "Altri Sanitari" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={`${key}-${index}`}>{label}</Label>
                  <Select
                    value={record[key as keyof SPR1Record] as string}
                    onValueChange={(value) => onUpdate(index, key as keyof SPR1Record, value)}
                  >
                    <SelectTrigger id={`${key}-${index}`} className="bg-background">
                      <SelectValue placeholder="S/N" />
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
              ))}
              <div>
                <Label
                  htmlFor={`dprofaltri-${index}`}
                  className={cn(
                    hasFieldError("d_prof_altri") && "text-destructive",
                    isDProfAltriRequired && "required-conditional",
                  )}
                >
                  Descrizione Altri
                </Label>
                <Input
                  id={`dprofaltri-${index}`}
                  value={record.d_prof_altri}
                  onChange={(e) => onUpdate(index, "d_prof_altri", e.target.value)}
                  maxLength={30}
                  disabled={!isDProfAltriRequired}
                  className={cn(hasFieldError("d_prof_altri") && "border-destructive")}
                />
                {getFieldError("d_prof_altri") && (
                  <p className="text-xs text-destructive mt-1">{getFieldError("d_prof_altri")}</p>
                )}
                {isDProfAltriRequired && (
                  <p className="text-xs text-muted-foreground mt-1">Obbligatorio quando Altri Sanitari = Sì</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sezione Campi Aggiuntivi */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-primary">Campi Aggiuntivi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor={`Progetto-${index}`}>Progetto</Label>
                <Input
                  id={`Progetto-${index}`}
                  value={record.Progetto || "SM"}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">SM - Progetto Fisso</p>
              </div>
              <div>
                <Label htmlFor={`Pacchetto-${index}`}>Pacchetto</Label>
                <Input
                  id={`Pacchetto-${index}`}
                  value={record.Pacchetto}
                  onChange={(e) => onUpdate(index, "Pacchetto", e.target.value)}
                  maxLength={2}
                  placeholder="P1"
                />
              </div>
              <div>
                <Label htmlFor={`Pres_inviante-${index}`}>Pres. Inviante</Label>
                <Input
                  id={`Pres_inviante-${index}`}
                  value={record.Pres_inviante}
                  onChange={(e) => onUpdate(index, "Pres_inviante", e.target.value)}
                  maxLength={8}
                  placeholder="93180101"
                />
              </div>
              <div>
                <Label htmlFor={`Distr_inviante-${index}`}>Distr. Inviante</Label>
                <Input
                  id={`Distr_inviante-${index}`}
                  value={record.Distr_inviante}
                  onChange={(e) => onUpdate(index, "Distr_inviante", e.target.value)}
                  maxLength={2}
                  placeholder="01"
                />
              </div>
              <div>
                <Label htmlFor={`Evento-${index}`}>Evento</Label>
                <Input
                  id={`Evento-${index}`}
                  value={record.Evento}
                  onChange={(e) => onUpdate(index, "Evento", e.target.value)}
                  maxLength={10}
                  placeholder="EVT0000001"
                />
              </div>
              <div>
                <Label htmlFor={`Quota-${index}`}>Quota</Label>
                <Input id={`Quota-${index}`} value={record.Quota || "2"} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">2 - Quota Fissa (Fisso)</p>
              </div>
              <div>
                <Label htmlFor={`Chiusura-${index}`}>Chiusura</Label>
                <Select value={record.Chiusura || "3"} onValueChange={(value) => onUpdate(index, "Chiusura", value)}>
                  <SelectTrigger 
                    id={`Chiusura-${index}`}
                    className="bg-background"
                  >
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="3">3 - Caricamento standard</SelectItem>
                    <SelectItem value="0">0 - Caricamento iniziale e finale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor={`Localizzazione-${index}`}>Localizzazione</Label>
                <Input
                  id={`Localizzazione-${index}`}
                  value={record.Localizzazione}
                  onChange={(e) => onUpdate(index, "Localizzazione", e.target.value)}
                  maxLength={8}
                  placeholder="LOC00001"
                />
              </div>
              <div>
                <Label htmlFor={`Gest_Tetto-${index}`}>Gest. Tetto</Label>
                <Input id={`Gest_Tetto-${index}`} value={record.Gest_Tetto} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">0 (Fisso)</p>
              </div>
              <div>
                <Label htmlFor={`Num_verbale-${index}`}>N° Verbale</Label>
                <Input
                  id={`Num_verbale-${index}`}
                  value={record.Num_verbale}
                  onChange={(e) => onUpdate(index, "Num_verbale", e.target.value)}
                  maxLength={12}
                  placeholder="VB2024000001"
                />
              </div>
              <div>
                <Label htmlFor={`Data_verbale-${index}`}>Data Verbale</Label>
                <Input
                  id={`Data_verbale-${index}`}
                  type="date"
                  value={record.Data_verbale}
                  onChange={(e) => onUpdate(index, "Data_verbale", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        {/* FINE SEZIONE 2 */}
      </CardContent>
    </Card>
  );
}

// Memoize per evitare re-render quando altri record cambiano
export default memo(SPR1RecordCard, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.record === nextProps.record &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.errors === nextProps.errors
  );
});
