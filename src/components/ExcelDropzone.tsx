import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { SPR1Record, SPR2Record } from "@/types/spr";
import { supabase } from "@/integrations/supabase/client";
import {
  parsePrestazioni,
  extractCodiceFiscale,
  parseNomeCognome,
  parseGenere,
  parseExcelDate,
  parseResidenza,
  smartFillFromCF,
  formatCurrencyForSPR,
  formatOreForSPR,
  buildColumnMap,
  cleanPatientName,
  normalizeICD9,
  normalizeEsenzione,
  ImportedPatient,
  ResidenzaResult,
} from "@/lib/excelParser";
import { roundFinancial } from "@/lib/financial-utils";
import { initDizionari } from "@/lib/dizionari-territoriali";

interface ExcelDropzoneProps {
  spr1Records: SPR1Record[];
  onSPR1Generated: (records: SPR1Record[]) => void;
  onSPR2Generated: (records: SPR2Record[]) => void;
}

interface ImportResult {
  patients: ImportedPatient[];
  errors: string[];
  warnings: string[];
}

export default function ExcelDropzone({ spr1Records, onSPR1Generated, onSPR2Generated }: ExcelDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [savingToCloud, setSavingToCloud] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Formato file non supportato. Usa Excel (.xlsx, .xls) o CSV.");
      return;
    }

    setIsLoading(true);
    setImportResult(null);

    try {
      // Initialize territorial dictionaries
      await initDizionari();
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays for index-based access
      const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { 
        header: 1,
        defval: '',
        raw: false,
      });

      if (rawData.length < 2) {
        toast.error("Il file è vuoto o non contiene dati validi");
        setIsLoading(false);
        return;
      }

      const headers = (rawData[0] as string[]).map(h => String(h || ''));
      const dataRows = rawData.slice(1);
      
      // Build dynamic column map
      const columnMap = buildColumnMap(headers);
      console.log('[ExcelDropzone] Headers trovati:', headers);
      console.log('[ExcelDropzone] Column map:', columnMap);
      
      // Fallback indices for Ass.C.A. Excel format
      const COL_CF = columnMap.codiceFiscale ?? 2;
      const COL_DATA_NASCITA = columnMap.dataNascita ?? 1;
      const COL_GENERE = columnMap.genere ?? 8;
      const COL_RESIDENZA = columnMap.residenza ?? 3;
      const COL_TIPOLOGIA = columnMap.tipologia ?? 5;
      const COL_SPECIFICA = columnMap.specifica ?? 6;
      const COL_PRESTAZIONI = columnMap.prestazioni ?? 7;
      const COL_DATA_PIC = columnMap.dataPIC ?? -1;
      const COL_CODICE_MALATTIA = columnMap.codiceMalattia ?? -1;
      const COL_CODICE_ESENZIONE = columnMap.codiceEsenzione ?? -1;
      const COL_GRADI_DISABILITA = columnMap.gradiDisabilita ?? -1;
      const COL_FAMILIARE = columnMap.familiare ?? -1;
      
      const errors: string[] = [];
      const warnings: string[] = [];
      const patientsByCF = new Map<string, ImportedPatient>();

      // Process each row
      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const rowNum = rowIndex + 2; // +2 for header and 0-index

        // Extract CF
        const cfValue = String(row[COL_CF] || '');
        let cf = extractCodiceFiscale(cfValue);

        // Fallback: search CF in any column
        if (!cf) {
          for (const value of row) {
            if (value && typeof value === 'string') {
              const extracted = extractCodiceFiscale(value);
              if (extracted) {
                cf = extracted;
                break;
              }
            }
          }
        }

        if (!cf) {
          if (cfValue.trim()) {
            warnings.push(`Riga ${rowNum}: CF non valido: "${cfValue}"`);
          }
          continue;
        }

        // Parse name from first column, with familiare cleanup
        const firstColValue = String(row[0] || '');
        const familiareValue = COL_FAMILIARE >= 0 ? String(row[COL_FAMILIARE] || '') : undefined;
        const { cognome, nome } = cleanPatientName(firstColValue, familiareValue);

        // Parse optional fields from dynamic columns
        const excelDataNascita = COL_DATA_NASCITA >= 0 
          ? parseExcelDate(row[COL_DATA_NASCITA]) 
          : undefined;
        const excelGenere = COL_GENERE >= 0 
          ? parseGenere(String(row[COL_GENERE] || '')) 
          : null;
        const excelTipologia = COL_TIPOLOGIA >= 0 
          ? String(row[COL_TIPOLOGIA] || '') 
          : undefined;
        const excelSpecifica = COL_SPECIFICA >= 0 
          ? String(row[COL_SPECIFICA] || '') 
          : undefined;

        // Parse residenza and resolve territorial codes
        let residenzaData: ResidenzaResult | null = null;
        if (COL_RESIDENZA >= 0 && row[COL_RESIDENZA]) {
          const residenzaValue = String(row[COL_RESIDENZA]);
          console.log(`[DEBUG] Riga ${rowNum}: Parsing residenza: "${residenzaValue}"`);
          residenzaData = await parseResidenza(residenzaValue);
          if (residenzaData) {
            console.log(`[DEBUG] ✓ Comune trovato: "${residenzaValue}" → ISTAT: ${residenzaData.lures}, REG: ${residenzaData.regresu}, USL: ${residenzaData.uslresu}`);
            if (residenzaData.fuzzyMatch) {
              warnings.push(
                `Riga ${rowNum}: "${residenzaData.fuzzyMatch.originalTerm}" → usato "${residenzaData.fuzzyMatch.matchedName}" (${residenzaData.fuzzyMatch.similarity}% match)`
              );
            }
          } else if (residenzaValue.trim()) {
            console.log(`[DEBUG] ✗ Comune NON trovato: "${residenzaValue}"`);
            warnings.push(`Riga ${rowNum}: Comune non trovato: "${residenzaValue}"`);
          }
        }

        // Smart fill from CF if data missing
        const smartFilled = smartFillFromCF(cf, {
          dataNascita: excelDataNascita || undefined,
          genere: excelGenere || undefined,
        });

        // Estrai data presa in carico se presente
        const rawDataPIC = COL_DATA_PIC >= 0 ? row[COL_DATA_PIC] : undefined;
        const excelDataPIC = COL_DATA_PIC >= 0 
          ? parseExcelDate(rawDataPIC) 
          : undefined;
        console.log(`[ExcelDropzone] Riga ${rowNum}: COL_DATA_PIC=${COL_DATA_PIC}, raw="${rawDataPIC}" (type: ${typeof rawDataPIC}), parsed="${excelDataPIC}"`);

        // Estrai nuove colonne: malattia, esenzione, disabilità
        const excelCodiceMalattia = COL_CODICE_MALATTIA >= 0 
          ? String(row[COL_CODICE_MALATTIA] || '').trim() 
          : undefined;
        const excelCodiceEsenzione = COL_CODICE_ESENZIONE >= 0 
          ? String(row[COL_CODICE_ESENZIONE] || '').trim() 
          : undefined;
        const excelGradiDisabilita = COL_GRADI_DISABILITA >= 0 
          ? String(row[COL_GRADI_DISABILITA] || '').trim() 
          : undefined;

        // Leggi direttamente dalla colonna prestazioni (no concatenazione)
        const numeroPrestazioni = String(row[COL_PRESTAZIONI] || '');
        
        // Parse prestazioni
        const prestazioni = parsePrestazioni(numeroPrestazioni);

        if (prestazioni.length === 0 && numeroPrestazioni.trim()) {
          warnings.push(`Riga ${rowNum}: Pattern prestazioni non riconosciuto: "${numeroPrestazioni}"`);
        }

        // Aggregate by CF
        if (!patientsByCF.has(cf)) {
          patientsByCF.set(cf, {
            codiceFiscale: cf,
            cognome,
            nome,
            dataNascita: smartFilled.dataNascita,
            genere: smartFilled.genere,
            tipoindu: smartFilled.tipoindu,
            lures: residenzaData?.lures,
            regresu: residenzaData?.regresu,
            uslresu: residenzaData?.uslresu,
            _excelTipologia: excelTipologia,
            _excelSpecifica: excelSpecifica,
            _dataPIC: excelDataPIC,
            codiceMalattia: excelCodiceMalattia,
            codiceEsenzione: excelCodiceEsenzione,
            gradiDisabilita: excelGradiDisabilita,
            totalOre: 0,
            totalImporto: 0,
            codpres: prestazioni[0]?.codice || '405.1',
            prestazioni: [],
          });
        }

        const patient = patientsByCF.get(cf)!;
        
        // Add each prestazione
        for (const p of prestazioni) {
          patient.prestazioni.push(p);
          patient.totalOre += p.quantitaOre;
          patient.totalImporto = roundFinancial(patient.totalImporto + p.importo, 2);
        }

        // Update name if not already set
        if (!patient.cognome && cognome) patient.cognome = cognome;
        if (!patient.nome && nome) patient.nome = nome;
        
        // Update territorial data if not set but found in this row
        if (residenzaData) {
          if (!patient.lures) patient.lures = residenzaData.lures;
          if (!patient.regresu) patient.regresu = residenzaData.regresu;
          if (!patient.uslresu) patient.uslresu = residenzaData.uslresu;
        }
      }

      const patients = Array.from(patientsByCF.values());

      if (patients.length === 0) {
        errors.push("Nessun paziente valido trovato nel file");
      }

      setImportResult({ patients, errors, warnings });

      if (patients.length > 0) {
        const totalPrestazioni = patients.reduce((sum, p) => sum + p.prestazioni.length, 0);
        const totalOre = patients.reduce((sum, p) => sum + p.totalOre, 0);
        const totalImporto = patients.reduce((sum, p) => sum + p.totalImporto, 0);
        toast.success(`Trovati ${patients.length} pazienti, ${totalPrestazioni} prestazioni, ${totalOre} ore, €${totalImporto.toFixed(2)}`);
      }

    } catch (error) {
      console.error("Errore parsing Excel:", error);
      toast.error("Errore durante la lettura del file Excel");
      setImportResult({ patients: [], errors: [String(error)], warnings: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importResult || importResult.patients.length === 0) return;

    const newSPR1Records: SPR1Record[] = [];
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    // Calcola numero pratica progressivo: 2025001, 2025002, etc.
    // Trova il massimo nprat esistente per l'anno corrente
    const existingNprats = spr1Records
      .map(r => r.nprat)
      .filter(nprat => nprat && nprat.startsWith(`FA7${currentYear}`))
      .map(nprat => parseInt(nprat?.replace('FA7', '') || '0'))
      .filter(n => !isNaN(n));
    
    let nextNpratNum = existingNprats.length > 0 
      ? Math.max(...existingNprats) + 1 
      : currentYear * 1000 + 1; // Es. 2025001

    for (const patient of importResult.patients) {
      // Accesso = 3 solo se extraregionale
      const regresu = patient.regresu || "090";
      const accesso = (regresu !== "090" && regresu !== "999") ? "3" : "2";
      
      // Usa data_PIC da Excel se disponibile, altrimenti oggi
      const dataPIC = (patient as any)._dataPIC || today;
      
      // Genera nprat progressivo: FA72025001, FA72025002, etc.
      const nprat = `FA7${nextNpratNum}`;
      nextNpratNum++;
      
      // Create SPR1 - con ore_prev popolate da Excel
      // ore_prev = somma dei moltiplicatori delle prestazioni (totalOre)
      const orePrevistoFormatted = patient.totalOre > 0 
        ? patient.totalOre.toString().padStart(4, '0') 
        : '';
      // impatt NON viene popolato da Excel - viene calcolato da SPR2
      
      const spr1: SPR1Record = {
        record: "1",
        opera: "1",
        codusl: "201",
        struttura: "090MA7",
        data_PIC: dataPIC,
        nprat,
        tipoindu: patient.tipoindu || "1",
        IDutente: patient.codiceFiscale,
        Cognome: patient.cognome,
        Nome: patient.nome,
        genere: patient.genere || "",
        datanasc: patient.dataNascita || "",
        comnasu: "",
        cittu: "100", // Default Italia - verrà derivato dal CF se possibile
        lures: patient.lures || "048017",
        regresu: regresu,
        uslresu: patient.uslresu || "201",
        statciv: "9",
        titstud: "9",
        condprof: "9",
        soggRich: "R1",
        setting: "8",           // GAUSS: 8 = Ambulatoriale
        codpres: patient.codpres,
        accesso: "2",           // GAUSS: 2 = Con autorizzazione
        ICD9CM: patient.codiceMalattia || "",
        ICD9CM_c: "",
        proroghe: "2",          // Default: 2 proroghe
        percent_SSN: "100",
        pianif: "1",
        data_val: dataPIC,      // Auto-fill con data PIC
        care_giver: "1",
        IntPRIPAI_1: "b7",
        IntPRIPAI_2: "",
        IntPRIPAI_3: "",
        IntPRIPAI_4: "",
        IntPRIPAI_5: "",
        IntPRIPAI_6: "",
        scalaDis_1: (patient.gradiDisabilita && patient.gradiDisabilita.trim() && patient.gradiDisabilita.trim() !== "0") ? "02" : "",
        disIngr_1: (patient.gradiDisabilita && patient.gradiDisabilita.trim() && patient.gradiDisabilita.trim() !== "0") 
          ? patient.gradiDisabilita.trim().padStart(5, '0') 
          : "",
        scalaDis_2: "",
        disIngr_2: "",
        scalaDis_3: "",
        disIngr_3: "",
        scalaDis_4: "",
        disIngr_4: "",
        scalaDis_5: "",
        disIngr_5: "",
        scalaDis_6: "",
        disIngr_6: "",
        vi_stabclin: "9",
        vi_vitaq: "9",
        vi_mob: "9",
        vi_cogn: "9",
        vi_comp: "9",
        vi_comu: "9",
        vi_sensor: "9",
        vi_bisogni: "9",
        vi_supsoc: "9",
        protesi: "2",
        respGen: "",
        durata_prev: "180",
        ore_prev: orePrevistoFormatted,  // ORE DA EXCEL (somma moltiplicatori)
        prof_fisiot: "2",
        prof_MMGPLS: "2",
        prof_spec: "2",
        prof_inf: "2",
        prof_oss: "2",
        prof_log: "2",
        prof_terap_ev: "2",
        prof_occup: "2",
        prof_psic: "1",
        prof_as: "2",
        prof_educ: "2",
        prof_altri_san: "2",
        d_prof_altri: "",
        quoric: "0,00",
        imptick: "0,00",
        impatt: "",  // NON POPOLATO DA EXCEL - calcolato da Σ impres SPR2
        codese: normalizeEsenzione(patient.codiceEsenzione) || "",
        Progetto: "SM",
        Pacchetto: "00",
        Pres_inviante: "00000000",
        Distr_inviante: "00",
        Evento: "0000000000",
        Quota: "2",
        Chiusura: "3",
        Localizzazione: "00000000",
        Gest_Tetto: "0",
        Num_verbale: "",
        Data_verbale: "",
        // Metadati interni per uso futuro (non esportati in TXT)
        _excelTipologia: (patient as any)._excelTipologia,
        _excelSpecifica: (patient as any)._excelSpecifica,
        _orePreviste: patient.totalOre,
        _importoPrevisto: patient.totalImporto,
      };

      newSPR1Records.push(spr1);
      // NON CREARE SPR2 DA EXCEL - SPR2 CREATI SOLO DA PDF
    }

    // Pass SOLO SPR1 data to parent
    onSPR1Generated(newSPR1Records);
    // NON chiamare onSPR2Generated - nessun SPR2 creato da Excel

    toast.success(`Importati ${newSPR1Records.length} pazienti (anagrafiche SPR1). Carica PDF per generare SPR2.`);
    setImportResult(null);
  };

  const handleSaveToCloud = async () => {
    if (!importResult || importResult.patients.length === 0) return;

    setSavingToCloud(true);

    try {
      for (const patient of importResult.patients) {
        // Determine accesso based on regresu
        const regresu = patient.regresu || "090";
        const accesso = (regresu !== "090" && regresu !== "999") ? "3" : "2";
        
        // Save SOLO SPR1 - NON SPR2 (SPR2 da PDF)
        const { error: spr1Error } = await supabase
          .from('spr1_records')
          .insert({
            codusl: '201',
            struttura: '090MA7',
            data_pic: patient._dataPIC || new Date().toISOString().split('T')[0],
            nprat: `FA7${Date.now().toString().slice(-7)}`,
            id_utente: patient.codiceFiscale,
            cognome: patient.cognome,
            nome: patient.nome,
            genere: patient.genere || null,
            datanasc: patient.dataNascita || null,
            setting: '8',
            accesso: accesso,
            ore_prev: patient.totalOre ? String(patient.totalOre) : null,
            impatt: null,             // VUOTO: importo da PDF
            codpres: patient.codpres,
            lures: patient.lures || null,
            regresu: patient.regresu || null,
            uslresu: patient.uslresu || null,
            icd9cm: patient.codiceMalattia || null,
            codese: patient.codiceEsenzione ? patient.codiceEsenzione.replace(/\s+/g, '').toUpperCase() : null,
            proroghe: '2',
            intpripai_1: 'b7',
          });

        if (spr1Error) {
          console.error('Errore salvataggio SPR1:', spr1Error);
          throw spr1Error;
        }
        // NON SALVARE SPR2 DA EXCEL - SPR2 CREATI SOLO DA PDF
      }

      toast.success(`Salvati ${importResult.patients.length} pazienti nel Cloud (anagrafiche). Carica PDF per SPR2.`);
    } catch (error) {
      console.error('Errore salvataggio Cloud:', error);
      toast.error('Errore durante il salvataggio nel Cloud');
    } finally {
      setSavingToCloud(false);
    }
  };

  const clearResult = () => {
    setImportResult(null);
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          Import da Excel - Richiesta Prestazioni
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
            ${isLoading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('excel-upload')?.click()}
        >
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Elaborazione file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Trascina qui il file Excel</p>
                <p className="text-sm text-muted-foreground">oppure clicca per selezionare</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Formati supportati: .xlsx, .xls, .csv
              </p>
            </div>
          )}
        </div>

        {/* Risultati Import */}
        {importResult && (
          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Anteprima Import
              </h4>
              <Button variant="ghost" size="sm" onClick={clearResult}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Statistiche */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-primary">{importResult.patients.length}</p>
                <p className="text-xs text-muted-foreground">Pazienti</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {importResult.patients.reduce((sum, p) => sum + p.totalOre, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Ore Totali</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  €{importResult.patients.reduce((sum, p) => sum + p.totalImporto, 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Importo Totale</p>
              </div>
            </div>

            {/* Lista pazienti */}
            {importResult.patients.length > 0 && (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {importResult.patients.map((patient, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-background rounded text-sm"
                    >
                      <div>
                        <span className="font-medium">{patient.cognome} {patient.nome}</span>
                        <span className="text-muted-foreground ml-2">({patient.codiceFiscale})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{patient.totalOre} ore</Badge>
                        <Badge variant="secondary">€{patient.totalImporto.toFixed(2)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {importResult.warnings.length} avvisi
                </p>
                <ScrollArea className="h-20 mt-2">
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    {importResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {importResult.errors.length} errori
                </p>
                <ul className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            {importResult.patients.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleImport} className="flex-1">
                  Importa nel Form
                </Button>
                <Button 
                  onClick={handleSaveToCloud} 
                  variant="outline" 
                  className="flex-1"
                  disabled={savingToCloud}
                >
                  {savingToCloud ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    'Salva nel Cloud'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
