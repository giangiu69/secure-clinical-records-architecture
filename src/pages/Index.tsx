import { useState, useEffect, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Table, BookOpen, Trash2, Download, AlertCircle, LogOut, CloudDownload, Database, Save, Cloud, Clock, BarChart3, Link, HardDrive, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import SPR1Table from "@/components/SPR1Table";
import SPR2Table from "@/components/SPR2Table";
import Documentation from "@/components/Documentation";
import PDFImporter from "@/components/PDFImporter";
import ExcelDropzone from "@/components/ExcelDropzone";
import DatabaseManager from "@/components/DatabaseManager";
import DraftsSidebar, { DraftPatient } from "@/components/DraftsSidebar";
import PendingRecords from "@/components/PendingRecords";
import ReportDistretto from "@/components/ReportDistretto";
import { SPR1Record, SPR2Record } from "@/types/spr";
import { exampleSPR1, exampleSPR2 } from "@/lib/exampleData";
import { generateSPR1File, generateSPR2File, downloadTxtFile } from "@/lib/txtGenerator";
import { staggerDataPicByCodpres } from "@/lib/spr2-stagger";
import { cloneSPR1ForMultiCodpres } from "@/lib/spr1-clone-multicodpres";
import { splitSPR2ByCodpres } from "@/lib/spr2-split-codpres";
import { toast } from "sonner";
import { validateForGauss, ValidationError } from "@/lib/gauss-validator";
import { mergeSPR1Records, mergeSPR2Records, generateDrafts } from "@/lib/patientMerge";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

/**
 * FIX CRITICO: Parsing date dal DB senza timezone shift.
 * new Date("2024-10-01").toISOString() in UTC+1/+2 shifta di -1 giorno.
 * Questa funzione splitta la stringa direttamente senza passare per Date.
 */
function safeDateFromDb(val: string | null | undefined): string {
  if (!val) return "";
  // Se già in formato YYYY-MM-DD, restituisci direttamente
  const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return String(val);
}

const Index = () => {
  const { user, signOut } = useAuth();
  const [spr1Records, setSpr1Records] = useState<SPR1Record[]>([]);
  const [spr2Records, setSpr2Records] = useState<SPR2Record[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedDraftCF, setSelectedDraftCF] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<string>("spr1");
  const [sessionRestored, setSessionRestored] = useState(false);
  // Track source of each CF for merge logic
  const [excelCFs, setExcelCFs] = useState<Set<string>>(new Set());
  const [pdfCFs, setPdfCFs] = useState<Set<string>>(new Set());

  // Genera lista bozze per sidebar
  const drafts = useMemo<DraftPatient[]>(() => {
    return generateDrafts(spr1Records, spr2Records, excelCFs, pdfCFs);
  }, [spr1Records, spr2Records, excelCFs, pdfCFs]);

  // Auto-save hook
  const { 
    hasUnsavedChanges, 
    isSaving, 
    lastSaved, 
    saveNow, 
    markAsSaved,
    resetTracking 
  } = useAutoSave(spr1Records, spr2Records, {
    debounceMs: 30000,
    autoSaveIntervalMs: 60000,
  });

  // Ripristina sessione da sessionStorage o carica dal Cloud
  useEffect(() => {
    // Aspetta che l'utente sia autenticato prima di caricare dal Cloud
    if (!user) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        let saved: string | null = null;
        try {
          saved = sessionStorage.getItem('spr_session');
        } catch (storageErr) {
          console.warn("sessionStorage non disponibile:", storageErr);
        }
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.spr1Records?.length > 0 || parsed.spr2Records?.length > 0) {
              setSpr1Records(parsed.spr1Records || []);
              setSpr2Records(parsed.spr2Records || []);
              setExcelCFs(new Set(parsed.excelCFs || []));
              setPdfCFs(new Set(parsed.pdfCFs || []));
              setSessionRestored(true);
              toast.success(`Sessione ripristinata: ${parsed.spr1Records?.length || 0} SPR1, ${parsed.spr2Records?.length || 0} SPR2`);
              setIsLoading(false);
              return;
            }
          } catch (parseErr) {
            console.error("Dati sessione corrotti, ignorati:", parseErr);
            try { sessionStorage.removeItem('spr_session'); } catch (_) {}
          }
        }
      } catch (e) {
        console.error("Errore ripristino sessione:", e);
      }

      // Nessuna sessione locale: carica automaticamente dal Cloud
      try {
        const { data: spr1Data, error: spr1Error } = await supabase
          .from('spr1_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (spr1Error) throw spr1Error;

        const { data: spr2Data, error: spr2Error } = await supabase
          .from('spr2_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (spr2Error) throw spr2Error;

        if ((spr1Data && spr1Data.length > 0) || (spr2Data && spr2Data.length > 0)) {
          const convertedSpr1: SPR1Record[] = (spr1Data || []).map(mapDbRowToSpr1);
          const convertedSpr2: SPR2Record[] = (spr2Data || []).map(mapDbRowToSpr2);

          setSpr1Records(convertedSpr1);
          setSpr2Records(convertedSpr2);

          const cloudCFs = new Set(convertedSpr1.map(r => r.IDutente).filter(Boolean) as string[]);
          setExcelCFs(cloudCFs);

          resetTracking();
          toast.success(`Caricati ${convertedSpr1.length} pazienti e ${convertedSpr2.length} prestazioni dal Cloud`);
        }
      } catch (error) {
        console.error("Errore caricamento automatico dal Cloud:", error);
        toast.error("Errore nel caricamento dati dal Cloud");
      }

      setIsLoading(false);
    };

    init();
  }, [user]);

  // Salva sessione in sessionStorage
  const saveSession = useCallback(() => {
    try {
      const sessionData = {
        spr1Records,
        spr2Records,
        excelCFs: [...excelCFs],
        pdfCFs: [...pdfCFs],
        savedAt: new Date().toISOString(),
      };
      sessionStorage.setItem('spr_session', JSON.stringify(sessionData));
      setSessionRestored(true);
      toast.success(`Sessione salvata: ${spr1Records.length} SPR1, ${spr2Records.length} SPR2`);
    } catch (e) {
      console.error("Errore salvataggio sessione:", e);
      toast.error("Impossibile salvare la sessione nel browser");
    }
  }, [spr1Records, spr2Records, excelCFs, pdfCFs]);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('spr_session');
    setSessionRestored(false);
  }, []);

  const clearAllData = () => {
    if (confirm("Sei sicuro di voler cancellare tutti i dati locali? I dati nel database non verranno eliminati.")) {
      setSpr1Records([]);
      setSpr2Records([]);
      setExcelCFs(new Set());
      setPdfCFs(new Set());
      setSelectedDraftCF(null);
      clearSession();
      toast.success("Dati locali cancellati. Per eliminare dal database, usa il Database Manager.");
    }
  };

  const loadExampleData = () => {
    if (spr1Records.length > 0 || spr2Records.length > 0) {
      if (!confirm("Questo sostituirà tutti i dati esistenti con l'esempio. Continuare?")) {
        return;
      }
    }
    setSpr1Records([exampleSPR1]);
    setSpr2Records(exampleSPR2);
    setExcelCFs(new Set());
    setPdfCFs(new Set());
    toast.success("Dati Esempio Caricati");
  };

  // MERGE: Handler per nuovi SPR1 da Excel
  const handleSPR1Generated = (newRecords: SPR1Record[]) => {
    const newCFs = newRecords.map(r => r.IDutente).filter(Boolean) as string[];
    setSpr1Records(prev => mergeSPR1Records(prev, newRecords, 'excel'));
    setExcelCFs(prev => {
      const updated = new Set(prev);
      newCFs.forEach(cf => updated.add(cf));
      return updated;
    });
  };

  const handleSPR2Generated = (newRecords: SPR2Record[]) => {
    setSpr2Records(prev => mergeSPR2Records(prev, newRecords));
  };

  const handleSPR1Update = (cf: string, updates: Partial<SPR1Record>) => {
    setSpr1Records(prev => prev.map(r => {
      if (r.IDutente === cf) {
        return { ...r, ...updates };
      }
      return r;
    }));
    setPdfCFs(prev => {
      const updated = new Set(prev);
      updated.add(cf);
      return updated;
    });
  };

  const handleSelectDraft = useCallback((cf: string) => {
    setSelectedDraftCF(cf);
    const draft = drafts.find(d => d.codiceFiscale === cf);
    if (draft) {
      toast.info(`Selezionato: ${draft.cognome}`);
    }
  }, [drafts]);

  // Helper per convertire SPR2 DB row → SPR2Record (usato ovunque)
  const mapDbRowToSpr2 = useCallback((row: any): SPR2Record => ({
    record: row.record || "3",
    codusl: row.codusl || "",
    struttura: row.struttura || "",
    data_PIC: safeDateFromDb(row.data_pic),
    nprat: row.nprat || "",
    dataini: safeDateFromDb(row.dataini),
    datafine: safeDateFromDb(row.datafine),
    numpres: row.numpres?.toString() || "",
    durata: row.durata?.toString() || "",
    tariffa: row.tariffa?.toString() || "",
    impres: row.impres?.toString() || "",
    compensa: row.compensa === "N" ? " " : (row.compensa || " "),
    codpres: row.codpres || "",
    _spr1Id: row.spr1_id,
    _dbId: row.id,
  }), []);

  // Funzione helper per convertire un singolo record DB → SPR1Record
  const mapDbRowToSpr1 = useCallback((row: any): SPR1Record => ({
    record: "1",
    opera: row.opera || "1",
    codusl: row.codusl || "201",
    struttura: row.struttura || "090MA7",
    data_PIC: safeDateFromDb(row.data_pic),
    nprat: row.nprat || "",
    tipoindu: "1",
    IDutente: row.id_utente || "",
    Nome: row.nome || "",
    Cognome: row.cognome || "",
    genere: row.genere || "",
    datanasc: safeDateFromDb(row.datanasc),
    setting: row.setting || "8",
    accesso: row.accesso || "1",
    codpres: row.codpres || "",
    ore_prev: row.ore_prev || "",
    impatt: row.impatt || "",
    comnasu: "",
    cittu: row.cittu || "100",
    lures: row.lures || "",
    regresu: row.regresu || "090",
    uslresu: row.uslresu || "",
    statciv: row.statciv || "9",
    titstud: row.titstud || "9",
    condprof: row.condprof || "9",
    soggRich: row.soggrich || "R1",
    ICD9CM: row.icd9cm || "",
    ICD9CM_c: row.icd9cm_c || "",
    proroghe: row.proroghe || "",
    percent_SSN: "100",
    pianif: "1",
    data_val: safeDateFromDb(row.data_val),
    care_giver: "1",
    IntPRIPAI_1: row.intpripai_1 || "", IntPRIPAI_2: "", IntPRIPAI_3: "", IntPRIPAI_4: "", IntPRIPAI_5: "", IntPRIPAI_6: "",
    scalaDis_1: "02", disIngr_1: "00050", scalaDis_2: "", disIngr_2: "", scalaDis_3: "", disIngr_3: "",
    scalaDis_4: "", disIngr_4: "", scalaDis_5: "", disIngr_5: "", scalaDis_6: "", disIngr_6: "",
    vi_stabclin: "9", vi_vitaq: "9", vi_mob: "9", vi_cogn: "9", vi_comp: "9",
    vi_comu: "9", vi_sensor: "9", vi_bisogni: "9", vi_supsoc: "9",
    protesi: "2",
    respGen: "",
    durata_prev: row.durata_prev || "180",
    prof_fisiot: "2", prof_MMGPLS: "2", prof_spec: "2", prof_inf: "2", prof_oss: "2",
    prof_log: "2", prof_terap_ev: "2", prof_occup: "2", prof_psic: "1", prof_as: "2",
    prof_educ: "2", prof_altri_san: "2",
    d_prof_altri: "",
    quoric: row.quoric || "0,00",
    imptick: row.imptick || "0,00",
    codese: row.codese || "",
    Progetto: "SM", Pacchetto: "00", Pres_inviante: "00000000", Distr_inviante: "00",
    Evento: "0000000000", Quota: "2", Chiusura: "3", Localizzazione: "00000000",
    Gest_Tetto: "0", Num_verbale: "", Data_verbale: "",
    _dbId: row.id,
  }), []);

  // Carica SOLO un singolo record dal Cloud (non tutti)
  const loadSingleRecordFromCloud = useCallback(async (dbId: string): Promise<SPR1Record | null> => {
    try {
      const { data, error } = await supabase
        .from('spr1_records')
        .select('*')
        .eq('id', dbId)
        .maybeSingle();
      
      if (error || !data) {
        console.error("Errore caricamento singolo record:", error);
        return null;
      }
      
      const converted = mapDbRowToSpr1(data);
      
      setSpr1Records(prev => {
        if (prev.some(r => (r as any)._dbId === dbId)) return prev;
        return [...prev, converted];
      });
      
      // Carica anche gli SPR2 associati
      const { data: spr2Data } = await supabase
        .from('spr2_records')
        .select('*')
        .eq('spr1_id', dbId);
      
      if (spr2Data && spr2Data.length > 0) {
        const convertedSpr2 = spr2Data.map(mapDbRowToSpr2);
        
        setSpr2Records(prev => {
          const existingIds = new Set(prev.map(r => (r as any)._dbId));
          const newRecords = convertedSpr2.filter(r => !existingIds.has((r as any)._dbId));
          return [...prev, ...newRecords];
        });
      }
      
      return converted;
    } catch (error) {
      console.error("Errore caricamento singolo record:", error);
      return null;
    }
  }, [mapDbRowToSpr1, mapDbRowToSpr2]);

  // Handler navigazione da DatabaseManager a SPR1
  const handleNavigateToSPR1 = useCallback(async (dbRecord: any) => {
    let matchedRecord = spr1Records.find(r => (r as any)._dbId === dbRecord.id);
    
    if (!matchedRecord) {
      toast.info("Caricamento record...");
      matchedRecord = await loadSingleRecordFromCloud(dbRecord.id) || undefined;
    }
    
    if (matchedRecord) {
      setSelectedDraftCF(matchedRecord.IDutente);
      setActiveMainTab("spr1");
      toast.success(`Navigato a SPR1: ${matchedRecord.Cognome} ${matchedRecord.Nome}`);
    } else {
      toast.error("Impossibile caricare il record");
    }
  }, [spr1Records, loadSingleRecordFromCloud]);

  // Handler navigazione da DatabaseManager a SPR2
  const handleNavigateToSPR2 = useCallback(async (dbRecord: any) => {
    let matchedRecord = spr1Records.find(r => (r as any)._dbId === dbRecord.id);
    
    if (!matchedRecord) {
      toast.info("Caricamento record...");
      matchedRecord = await loadSingleRecordFromCloud(dbRecord.id) || undefined;
    }
    
    if (matchedRecord) {
      setSelectedDraftCF(matchedRecord.IDutente);
      setActiveMainTab("spr2");
      toast.success(`Navigato a SPR2 per: ${matchedRecord.Cognome} ${matchedRecord.Nome}`);
    } else {
      toast.error("Impossibile caricare il record");
    }
  }, [spr1Records, loadSingleRecordFromCloud]);

  // Handler importazione multipla da DatabaseManager
  const handleImportMultipleSPR1 = useCallback(async (dbRecords: any[]) => {
    toast.info(`Importazione ${dbRecords.length} pazienti...`);
    let imported = 0;
    
    for (const dbRecord of dbRecords) {
      const existing = spr1Records.find(r => (r as any)._dbId === dbRecord.id);
      if (existing) {
        imported++;
        continue;
      }
      
      const loaded = await loadSingleRecordFromCloud(dbRecord.id);
      if (loaded) {
        imported++;
      }
    }
    
    setActiveMainTab("spr1");
    toast.success(`Importati ${imported} pazienti in SPR1`);
  }, [spr1Records, loadSingleRecordFromCloud]);

  // Upload SPR2 direttamente su Cloud
  const uploadSPR2ToCloud = useCallback(async () => {
    if (spr2Records.length === 0) {
      toast.error("Nessun record SPR2 da caricare");
      return;
    }

    try {
      toast.info(`Caricamento ${spr2Records.length} SPR2 su Cloud...`);
      let uploaded = 0;
      let errors = 0;

      for (const spr2 of spr2Records) {
        const dbRecord: any = {
          codusl: spr2.codusl || null,
          struttura: spr2.struttura || null,
          data_pic: spr2.data_PIC || null,
          nprat: spr2.nprat || null,
          record: spr2.record || "3",
          dataini: spr2.dataini || null,
          datafine: spr2.datafine || null,
          numpres: spr2.numpres ? parseInt(spr2.numpres) : null,
          durata: spr2.durata ? parseFloat(String(spr2.durata).replace(',', '.')) : null,
          tariffa: spr2.tariffa ? parseFloat(String(spr2.tariffa).replace(',', '.')) : null,
          impres: spr2.impres ? parseFloat(String(spr2.impres).replace(',', '.')) : null,
          compensa: (spr2.compensa && spr2.compensa.trim() !== "" && spr2.compensa !== "N") ? spr2.compensa : null,
          codpres: spr2.codpres || null,
        };

        if ((spr2 as any)._dbId) {
          const { error } = await supabase
            .from('spr2_records')
            .update(dbRecord)
            .eq('id', (spr2 as any)._dbId);
          if (error) { errors++; console.error(error); } else { uploaded++; }
        } else {
          const parentSpr1 = spr1Records.find(s =>
            s.nprat && spr2.nprat && s.nprat === spr2.nprat &&
            s.codusl === spr2.codusl && s.struttura === spr2.struttura
          );

          const { data, error } = await supabase
            .from('spr2_records')
            .insert({
              ...dbRecord,
              spr1_id: (parentSpr1 as any)?._dbId || null,
            })
            .select()
            .single();

          if (error) { errors++; console.error(error); }
          else {
            if (data) (spr2 as any)._dbId = data.id;
            uploaded++;
          }
        }
      }

      if (errors > 0) {
        toast.warning(`Caricati ${uploaded} SPR2, ${errors} errori`);
      } else {
        toast.success(`${uploaded} SPR2 caricati su Cloud`);
      }
    } catch (error) {
      console.error("Errore upload SPR2:", error);
      toast.error("Errore durante il caricamento SPR2 su Cloud");
    }
  }, [spr2Records, spr1Records]);

  // Handler importazione multipla SPR2 da DatabaseManager
  const handleImportMultipleSPR2 = useCallback(async (dbRecords: any[]) => {
    toast.info(`Importazione ${dbRecords.length} prestazioni SPR2...`);
    
    const convertedSpr2 = dbRecords.map(mapDbRowToSpr2);

    setSpr2Records(prev => {
      const existingIds = new Set(prev.map(r => (r as any)._dbId));
      const newRecords = convertedSpr2.filter(r => !existingIds.has((r as any)._dbId));
      return [...prev, ...newRecords];
    });

    setActiveMainTab("spr2");
    toast.success(`Importate ${convertedSpr2.length} prestazioni in SPR2`);
  }, [mapDbRowToSpr2]);

  // Carica dati dal Cloud (Supabase)
  const loadFromCloud = async () => {
    try {
      toast.info("Caricamento dati dal Cloud...");

      const { data: spr1Data, error: spr1Error } = await supabase
        .from('spr1_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (spr1Error) throw spr1Error;

      const { data: spr2Data, error: spr2Error } = await supabase
        .from('spr2_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (spr2Error) throw spr2Error;

      const convertedSpr1: SPR1Record[] = (spr1Data || []).map(mapDbRowToSpr1);
      const convertedSpr2: SPR2Record[] = (spr2Data || []).map(mapDbRowToSpr2);

      setSpr1Records(convertedSpr1);
      setSpr2Records(convertedSpr2);

      const cloudCFs = new Set(convertedSpr1.map(r => r.IDutente).filter(Boolean) as string[]);
      setExcelCFs(cloudCFs);
      setPdfCFs(new Set());

      resetTracking();
      
      toast.success(`Caricati ${convertedSpr1.length} pazienti e ${convertedSpr2.length} prestazioni dal Cloud`);
    } catch (error) {
      console.error("Errore caricamento Cloud:", error);
      toast.error("Errore durante il caricamento dal Cloud");
    }
  };

  // Carica solo SPR1 che hanno SPR2 collegati
  const loadMatchedFromCloud = async () => {
    try {
      toast.info("Caricamento solo record abbinati...");

      const { data: spr2Data, error: spr2Error } = await supabase
        .from('spr2_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (spr2Error) throw spr2Error;

      if (!spr2Data || spr2Data.length === 0) {
        toast.warning("Nessun record SPR2 trovato nel database");
        return;
      }

      const spr1Ids = [...new Set(spr2Data.map(s => s.spr1_id).filter(Boolean))] as string[];

      if (spr1Ids.length === 0) {
        toast.warning("Nessun SPR2 collegato a un SPR1");
        return;
      }

      const { data: spr1Data, error: spr1Error } = await supabase
        .from('spr1_records')
        .select('*')
        .in('id', spr1Ids);

      if (spr1Error) throw spr1Error;

      const { count: totalSpr1 } = await supabase
        .from('spr1_records')
        .select('*', { count: 'exact', head: true });

      const convertedSpr1: SPR1Record[] = (spr1Data || []).map(mapDbRowToSpr1);
      const convertedSpr2: SPR2Record[] = (spr2Data || []).map(mapDbRowToSpr2);

      setSpr1Records(convertedSpr1);
      setSpr2Records(convertedSpr2);
      resetTracking();

      const excluded = (totalSpr1 || 0) - convertedSpr1.length;
      toast.success(`Caricati ${convertedSpr1.length} SPR1 abbinati e ${convertedSpr2.length} SPR2. ${excluded > 0 ? `${excluded} SPR1 senza SPR2 esclusi.` : ''}`);
    } catch (error) {
      console.error("Errore caricamento abbinati:", error);
      toast.error("Errore durante il caricamento");
    }
  };

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportData, setExportData] = useState<{
    matchedSPR1: SPR1Record[];
    matchedSPR2: SPR2Record[];
    unmatchedSPR1: SPR1Record[];
    orphanSPR2: SPR2Record[];
  } | null>(null);

  const handleExport = async () => {
    if (spr1Records.length === 0) {
      toast.error("Nessun dato SPR1 da esportare. Inserisci almeno un paziente.");
      return;
    }

    const spr1WithSpr2 = new Set<string>();
    const spr2WithSpr1 = new Set<number>();

    spr2Records.forEach((s2, idx) => {
      const matchingSpr1 = spr1Records.find(s1 => 
        s1.nprat && s2.nprat && s1.nprat === s2.nprat &&
        s1.codusl === s2.codusl && s1.struttura === s2.struttura
      );
      if (matchingSpr1) {
        spr1WithSpr2.add(matchingSpr1.nprat!);
        spr2WithSpr1.add(idx);
      }
    });

    const matchedSPR1 = spr1Records.filter(s1 => s1.nprat && spr1WithSpr2.has(s1.nprat));
    const unmatchedSPR1 = spr1Records.filter(s1 => !s1.nprat || !spr1WithSpr2.has(s1.nprat));
    const matchedSPR2 = spr2Records.filter((_, idx) => spr2WithSpr1.has(idx));
    const orphanSPR2 = spr2Records.filter((_, idx) => !spr2WithSpr1.has(idx));

    setExportData({ matchedSPR1, matchedSPR2, unmatchedSPR1, orphanSPR2 });
    setShowExportDialog(true);
  };

  const executeExport = async (forceExport = false) => {
    if (!exportData) return;

    const { matchedSPR1, matchedSPR2 } = exportData;

    const validation = validateForGauss(matchedSPR1, matchedSPR2);

    if (!validation.canExport && !forceExport) {
      const allIssues = [...validation.errors, ...validation.warnings];
      setValidationErrors(allIssues);
      setShowValidationDialog(true);
      setShowExportDialog(false);
      toast.error("Validazione fallita! Correggi gli errori o esporta comunque.");
      return;
    }

    if (validation.warnings.length > 0 && validation.warnings.some((w) => !w.blocking)) {
      const nonBlockingWarnings = validation.warnings.filter((w) => !w.blocking);
      setValidationErrors(nonBlockingWarnings);
      setShowValidationDialog(true);
    }

    try {
      // Split SPR2 con codpres concatenato (es. "405.1;417.1") in record per singolo codpres
      const splitSPR2 = splitSPR2ByCodpres(matchedSPR2);
      // Clone SPR1 per pazienti con codpres multipli (workaround GAUSS chiave unica)
      const expandedSPR1 = cloneSPR1ForMultiCodpres(matchedSPR1, splitSPR2);
      // FIX: stagger PRIMA della generazione SPR1, così l'impatt viene sommato
      // per il nprat corretto (ogni codpres aggiuntivo ha nprat progressivo).
      const staggeredSPR2 = staggerDataPicByCodpres(splitSPR2, matchedSPR1);
      const spr1Bytes = await generateSPR1File(expandedSPR1, staggeredSPR2);
      downloadTxtFile(spr1Bytes, "SPR1.txt");

      if (staggeredSPR2.length > 0) {
        const spr2Bytes = generateSPR2File(staggeredSPR2);
        downloadTxtFile(spr2Bytes, "SPR2.txt");
      }

      setShowExportDialog(false);
      toast.success(`Export completato! ${matchedSPR1.length} SPR1 e ${matchedSPR2.length} SPR2 esportati.`);
    } catch (error) {
      console.error("Errore critico export:", error);
      toast.error("Errore durante la generazione dei file. Controlla la console.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10 flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">SPR Manager</h1>
                <p className="text-sm text-muted-foreground">Gestione Flussi SPR1 e SPR2 - Regione Toscana v2.1</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={saveNow} 
                variant="outline" 
                className={`gap-2 ${hasUnsavedChanges ? 'border-amber-500 text-amber-600 hover:bg-amber-50 animate-pulse' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                disabled={isSaving || (!hasUnsavedChanges && spr1Records.length === 0)}
              >
                {isSaving ? (
                  <>
                    <Cloud className="h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <Save className="h-4 w-4" />
                    Salva su Cloud
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Salvato ✓
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.email}
              </span>
              <Button
                onClick={handleExport}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
              >
                <Download className="h-4 w-4" />
                Esporta Flussi GAUSS
              </Button>
              <Button onClick={saveSession} variant="outline" className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50">
                <HardDrive className="h-4 w-4" />
                Salva Sessione
              </Button>
              <Button onClick={loadFromCloud} variant="outline" className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50">
                <CloudDownload className="h-4 w-4" />
                Carica da Cloud
              </Button>
              <Button onClick={loadMatchedFromCloud} variant="outline" className="gap-2 border-purple-500 text-purple-600 hover:bg-purple-50">
                <Link className="h-4 w-4" />
                Solo Abbinati
              </Button>
              <Button onClick={loadExampleData} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Carica Esempio
              </Button>
              <Button onClick={clearAllData} variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Nuova Pratica
              </Button>
              <Button onClick={signOut} variant="ghost" size="icon" title="Esci">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1">
        <DraftsSidebar 
          drafts={drafts}
          selectedCF={selectedDraftCF}
          onSelectDraft={handleSelectDraft}
        />

        <main className="flex-1 container mx-auto px-4 py-8">
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-6 bg-muted">
              <TabsTrigger value="spr1" className="gap-2">
                <Table className="h-4 w-4" /> SPR1
              </TabsTrigger>
              <TabsTrigger value="spr2" className="gap-2">
                <Table className="h-4 w-4" /> SPR2
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Report
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" /> In Attesa
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2">
                <Database className="h-4 w-4" /> Database
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-2">
                <BookOpen className="h-4 w-4" /> Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="spr1" className="space-y-4">
              <ExcelDropzone 
                spr1Records={spr1Records}
                onSPR1Generated={handleSPR1Generated}
                onSPR2Generated={handleSPR2Generated}
              />
              <SPR1Table records={spr1Records} onRecordsChange={setSpr1Records} spr2Records={spr2Records} />
            </TabsContent>

            <TabsContent value="spr2" className="space-y-4">
              <div className="flex justify-end mb-4">
                <PDFImporter 
                  spr1Records={spr1Records}
                  spr2Records={spr2Records}
                  onSPR2Generated={handleSPR2Generated}
                  onSPR1Update={handleSPR1Update}
                  onUploadSPR2ToCloud={uploadSPR2ToCloud}
                />
              </div>
              <SPR2Table records={spr2Records} onRecordsChange={setSpr2Records} spr1Records={spr1Records} />
            </TabsContent>

            <TabsContent value="report" className="space-y-4">
              <ReportDistretto
                spr1Records={spr1Records}
                spr2Records={spr2Records}
                onRecordsChange={setSpr1Records}
              />
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <PendingRecords spr1Records={spr1Records} />
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <DatabaseManager 
                onDataChanged={loadFromCloud} 
                onNavigateToSPR1={handleNavigateToSPR1}
                onNavigateToSPR2={handleNavigateToSPR2}
                onImportMultipleSPR1={handleImportMultipleSPR1}
                onImportMultipleSPR2={handleImportMultipleSPR2}
              />
            </TabsContent>

            <TabsContent value="docs" className="space-y-6">
              <Documentation />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>SPR Manager - Conforme alle Specifiche Funzionali SPR v2.1 | Regione Toscana</p>
          <p className="mt-1">File TXT generati conformi per sistema GAUSS (Windows-1252)</p>
        </div>
      </footer>

      {/* Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Validazione Pre-Export - Errori Rilevati
            </DialogTitle>
            <DialogDescription>
              Sono stati rilevati {validationErrors.length} problemi che devono essere corretti prima dell'export GAUSS.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-3">
              {validationErrors.map((error, idx) => (
                <Alert
                  key={idx}
                  variant={error.severity === "error" ? "destructive" : "default"}
                  className={error.blocking ? "border-2" : ""}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">
                    {error.type} - {error.recordType} #{error.recordIndex + 1}
                    {error.blocking && (
                      <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                        BLOCCANTE
                      </span>
                    )}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {error.message}
                    {error.field && (
                      <span className="block mt-1 font-mono text-muted-foreground">Campo: {error.field}</span>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>Chiudi e Correggi Dati</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                setShowValidationDialog(false);
                executeExport(true);
              }}
            >
              Esporta Comunque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Riepilogo Export
            </DialogTitle>
            <DialogDescription>
              Verranno esportati solo i record SPR1 con almeno un SPR2 collegato.
            </DialogDescription>
          </DialogHeader>

          {exportData && (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {exportData.matchedSPR1.length} SPR1 da esportare
                  </Badge>
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {exportData.matchedSPR2.length} SPR2 da esportare
                  </Badge>
                </div>

                {exportData.unmatchedSPR1.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">
                      {exportData.unmatchedSPR1.length} SPR1 senza SPR2 (esclusi)
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-2">
                      <ul className="list-disc pl-4 space-y-1">
                        {exportData.unmatchedSPR1.map((r, i) => (
                          <li key={i}>{r.Cognome} {r.Nome} - NPrat: {r.nprat || 'N/A'}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {exportData.orphanSPR2.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">
                      {exportData.orphanSPR2.length} SPR2 orfani (esclusi)
                    </AlertTitle>
                    <AlertDescription className="text-xs mt-2">
                      <ul className="list-disc pl-4 space-y-1">
                        {exportData.orphanSPR2.map((r, i) => (
                          <li key={i}>NPrat: {r.nprat || 'N/A'} - Tipo: {r.record}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annulla
            </Button>
            <Button onClick={() => executeExport()} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Download className="h-4 w-4" />
              Conferma Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
