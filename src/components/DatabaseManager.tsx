import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Database, RefreshCw, Trash2, Edit3, Save, X, Search, Upload, FileText, ArrowRight, Hash, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as XLSX from "xlsx";
import { parsePrestazioni, buildColumnMap, parseExcelDate, extractComuneFromAddress } from "@/lib/excelParser";
import { roundFinancial, checkMathConsistency } from "@/lib/financial-utils";
import { assignMissingNprat, autoFillDataVal, convertAllNpratToGauss } from "@/lib/nprat-utils";
import { findBestFuzzyMatch, searchComuniByNome, findAslByComune } from "@/lib/dizionari-territoriali";
import SPR2MultiCodpresReview from "./SPR2MultiCodpresReview";

interface SPR1DbRecord {
  id: string;
  codusl: string;
  struttura: string;
  data_pic: string | null;
  nprat: string | null;
  id_utente: string | null;
  cognome: string | null;
  nome: string | null;
  genere: string | null;
  datanasc: string | null;
  setting: string | null;
  accesso: string | null;
  ore_prev: string | null;
  impatt: string | null;
  codpres: string | null;
  opera: string | null;
  imptick: string | null;
  quoric: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SPR2DbRecord {
  id: string;
  spr1_id: string | null;
  codusl: string | null;
  struttura: string | null;
  data_pic: string | null;
  nprat: string | null;
  record: string | null;
  dataini: string | null;
  datafine: string | null;
  numpres: number | null;
  tariffa: number | null;
  impres: number | null;
  durata: number | null;
  codpres: string | null;
  created_at: string | null;
}

interface DatabaseManagerProps {
  onDataChanged?: () => void;
  onNavigateToSPR1?: (record: SPR1DbRecord) => void;
  onNavigateToSPR2?: (spr1Record: SPR1DbRecord) => void;
  onImportMultipleSPR1?: (records: SPR1DbRecord[]) => void;
  onImportMultipleSPR2?: (records: SPR2DbRecord[]) => void;
}

export default function DatabaseManager({ onDataChanged, onNavigateToSPR1, onNavigateToSPR2, onImportMultipleSPR1, onImportMultipleSPR2 }: DatabaseManagerProps) {
  const [spr1Records, setSpr1Records] = useState<SPR1DbRecord[]>([]);
  const [spr2Records, setSpr2Records] = useState<SPR2DbRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"spr1" | "spr2">("spr1");
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<SPR1DbRecord | SPR2DbRecord>>({});
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; table: "spr1" | "spr2" } | null>(null);
  
  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  
  // Delete all cloud data
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Month filter
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Multi-codpres review dialog
  const [multiCodpresOpen, setMultiCodpresOpen] = useState(false);
  const multiCodpresCount = useMemo(
    () => spr2Records.filter(r => (r.codpres || "").includes(";")).length,
    [spr2Records],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [spr1Res, spr2Res] = await Promise.all([
        supabase.from("spr1_records").select("*").order("created_at", { ascending: false }),
        supabase.from("spr2_records").select("*").order("created_at", { ascending: false }),
      ]);

      if (spr1Res.error) throw spr1Res.error;
      if (spr2Res.error) throw spr2Res.error;

      setSpr1Records(spr1Res.data || []);
      setSpr2Records(spr2Res.data || []);
      toast.success(`Caricati ${spr1Res.data?.length || 0} SPR1 e ${spr2Res.data?.length || 0} SPR2`);
    } catch (error) {
      console.error("Errore caricamento:", error);
      toast.error("Errore durante il caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggiorna ore_prev e data_pic dal file Excel (impatt calcolato separatamente da SPR2)
  const handleUpdateFromExcel = useCallback(async (file: File) => {
    setIsUpdating(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { 
        header: 1,
        defval: '',
        raw: false,
      });

      if (rawData.length < 2) {
        toast.error("Il file è vuoto o non contiene dati validi");
        setIsUpdating(false);
        return;
      }

      // Usa il column mapping dinamico per trovare le colonne
      const headers = (rawData[0] as string[]).map(h => String(h || ''));
      const columnMap = buildColumnMap(headers);
      
      const cfColIdx = columnMap.codiceFiscale ?? 2; // fallback colonna 2
      const prestazioniColIdx = columnMap.prestazioni ?? 7; // fallback colonna 7
      const dataPicColIdx = columnMap.dataPIC; // può essere undefined

      const dataRows = rawData.slice(1);
      let updated = 0;
      let dataPicUpdated = 0;
      const errors: string[] = [];

      // Per ogni riga nel file Excel
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Estrai CF dalla colonna mappata
        const cfValue = String(row[cfColIdx] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!cfValue || cfValue.length !== 16) continue;

        // Prepara oggetto update
        const updateData: { ore_prev?: string; data_pic?: string } = {};

        // Estrai prestazioni dalla colonna mappata
        const numeroPrestazioni = String(row[prestazioniColIdx] || '');
        const prestazioni = parsePrestazioni(numeroPrestazioni);
        
        if (prestazioni.length > 0) {
          const totalOre = prestazioni.reduce((sum, p) => sum + p.quantitaOre, 0);
          updateData.ore_prev = totalOre.toString().padStart(4, '0');
        }

        // Estrai data presa in carico se colonna trovata
        if (dataPicColIdx !== undefined) {
          const dataPicValue = row[dataPicColIdx];
          const parsedDate = parseExcelDate(dataPicValue);
          if (parsedDate) {
            updateData.data_pic = parsedDate;
            dataPicUpdated++;
          }
        }

        // Salta se non c'è nulla da aggiornare
        if (Object.keys(updateData).length === 0) continue;

        // Aggiorna nel database
        const { error } = await supabase
          .from('spr1_records')
          .update(updateData)
          .eq('id_utente', cfValue);

        if (error) {
          errors.push(`${cfValue}: ${error.message}`);
        } else {
          updated++;
        }
      }

      if (errors.length > 0) {
        console.error("Errori aggiornamento:", errors);
      }

      const messages = [`Aggiornati ${updated} record`];
      if (dataPicUpdated > 0) {
        messages.push(`${dataPicUpdated} con data presa in carico`);
      }
      toast.success(messages.join(', '));
      loadData();
    } catch (error) {
      console.error("Errore parsing Excel:", error);
      toast.error("Errore durante la lettura del file Excel");
    } finally {
      setIsUpdating(false);
    }
  }, [loadData]);

  // Ricalcola impatt da SPR2: impatt = Σ impres (SPR2 tipo 3) - imptick - quoric
  const handleRecalculateImpatt = useCallback(async () => {
    setIsUpdating(true);
    try {
      let updated = 0;
      const errors: string[] = [];

      for (const spr1 of spr1Records) {
        // Trova tutti SPR2 collegati a questo SPR1
        const linkedSPR2 = spr2Records.filter(s2 => s2.spr1_id === spr1.id);
        
        // Somma tutti impres dei record SPR2 tipo 3 (treatment)
        const totalImpres = linkedSPR2
          .filter(s2 => s2.record === '3')
          .reduce((sum, s2) => sum + (s2.impres || 0), 0);

        // Se non ci sono SPR2 collegati, lascia impatt vuoto
        if (linkedSPR2.length === 0) continue;

        // Calcola impatt = Σ impres - imptick - quoric (floor a 0 se negativo)
        const imptick = parseFloat((spr1.imptick || '0').replace(',', '.')) || 0;
        const quoric = parseFloat((spr1.quoric || '0').replace(',', '.')) || 0;
        const impattValue = Math.max(0, roundFinancial(totalImpres - imptick - quoric, 2));
        const impattFormatted = impattValue.toFixed(2).replace('.', ',');

        const { error } = await supabase
          .from('spr1_records')
          .update({ impatt: impattFormatted })
          .eq('id', spr1.id);

        if (error) {
          errors.push(`${spr1.nprat}: ${error.message}`);
        } else {
          updated++;
        }
      }

      if (errors.length > 0) {
        console.error("Errori ricalcolo impatt:", errors);
      }

      toast.success(`Ricalcolati ${updated} impatt da SPR2`);
      loadData();
    } catch (error) {
      console.error("Errore ricalcolo impatt:", error);
      toast.error("Errore durante il ricalcolo di impatt");
    } finally {
    setIsUpdating(false);
    }
  }, [spr1Records, spr2Records, loadData]);

  // Normalizza dataini/datafine al primo e ultimo giorno del mese
  const handleNormalizeDates = useCallback(async () => {
    setIsUpdating(true);
    try {
      let updated = 0;
      const errors: string[] = [];

      for (const spr2 of spr2Records) {
        if (!spr2.dataini) continue;
        
        const match = spr2.dataini.match(/^(\d{4})-(\d{2})/);
        if (!match) continue;
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const lastDayNum = new Date(year, month, 0).getDate();
        const mm = String(month).padStart(2, '0');
        const firstDay = `${year}-${mm}-01`;
        const lastDay = `${year}-${mm}-${String(lastDayNum).padStart(2, '0')}`;
        
        // Salta se già corretto
        if (spr2.dataini === firstDay && spr2.datafine === lastDay) continue;
        
        const { error } = await supabase
          .from('spr2_records')
          .update({ dataini: firstDay, datafine: lastDay })
          .eq('id', spr2.id);
        
        if (error) {
          errors.push(`${spr2.nprat}: ${error.message}`);
        } else {
          updated++;
        }
      }

      if (errors.length > 0) {
        console.error("Errori normalizzazione date:", errors);
      }

      if (updated > 0) {
        toast.success(`Normalizzate ${updated} date (primo/ultimo giorno del mese)`);
      } else {
        toast.info("Tutte le date sono già normalizzate");
      }
      loadData();
    } catch (error) {
      console.error("Errore normalizzazione date:", error);
      toast.error("Errore durante la normalizzazione delle date");
    } finally {
      setIsUpdating(false);
    }
  }, [spr2Records, loadData]);

  // Assegna nprat progressivi ai record che non ne hanno
  const handleAssignNprat = useCallback(async () => {
    setIsUpdating(true);
    try {
      const { updated, errors } = await assignMissingNprat();
      
      if (errors.length > 0) {
        console.error("Errori assegnazione nprat:", errors);
        toast.warning(`Assegnati ${updated} nprat con ${errors.length} errori`);
      } else if (updated > 0) {
        toast.success(`Assegnati ${updated} numeri pratica progressivi`);
      } else {
        toast.info("Tutti i pazienti hanno già un numero pratica");
      }
      
      loadData();
    } catch (error) {
      console.error("Errore assegnazione nprat:", error);
      toast.error("Errore durante l'assegnazione dei numeri pratica");
    } finally {
      setIsUpdating(false);
    }
  }, [loadData]);

  // Converte nprat legacy (es. 2025001) al formato GAUSS (es. FA70025001)
  const handleConvertNpratToGauss = useCallback(async () => {
    if (!confirm("Converto TUTTI i nprat al formato GAUSS (prefisso FA7). I record già convertiti vengono saltati. Procedo?")) return;
    setIsUpdating(true);
    try {
      const { updated, skipped, errors } = await convertAllNpratToGauss();
      if (errors.length > 0) {
        console.error("Errori conversione nprat:", errors);
        toast.warning(`Convertiti ${updated} nprat, saltati ${skipped}, errori: ${errors.length}`);
      } else if (updated > 0) {
        toast.success(`Convertiti ${updated} nprat al formato GAUSS (saltati ${skipped} già corretti)`);
      } else {
        toast.info(`Nessuna conversione necessaria (${skipped} record già in formato FA7)`);
      }
      loadData();
    } catch (error) {
      console.error("Errore conversione nprat:", error);
      toast.error("Errore durante la conversione dei numeri pratica");
    } finally {
      setIsUpdating(false);
    }
  }, [loadData]);

  // Auto-compila data_val dal primo trattamento
  const handleAutoFillDataVal = useCallback(async () => {
    setIsUpdating(true);
    try {
      const { updated, errors } = await autoFillDataVal();
      
      if (errors.length > 0) {
        console.error("Errori auto-fill data_val:", errors);
        toast.warning(`Compilate ${updated} date con ${errors.length} errori`);
      } else if (updated > 0) {
        toast.success(`Compilate ${updated} date valutazione dal primo trattamento`);
      } else {
        toast.info("Tutti i pazienti hanno già una data presa in carico");
      }
      
      loadData();
    } catch (error) {
      console.error("Errore auto-fill data_val:", error);
      toast.error("Errore durante la compilazione delle date");
    } finally {
      setIsUpdating(false);
    }
  }, [loadData]);

  // Sincronizza data_val = data_pic per tutti i record
  const handleSyncDataValWithDataPic = useCallback(async () => {
    setIsUpdating(true);
    try {
      let updated = 0;
      const errors: string[] = [];

      for (const spr1 of spr1Records) {
        // Salta se non c'è data_pic
        if (!spr1.data_pic) continue;

        const { error } = await supabase
          .from('spr1_records')
          .update({ data_val: spr1.data_pic })
          .eq('id', spr1.id);

        if (error) {
          errors.push(`${spr1.nprat || spr1.id}: ${error.message}`);
        } else {
          updated++;
        }
      }

      if (errors.length > 0) {
        console.error("Errori sync data_val:", errors);
        toast.warning(`Aggiornati ${updated} record con ${errors.length} errori`);
      } else if (updated > 0) {
        toast.success(`Data valutazione impostata = data presa in carico per ${updated} record`);
      } else {
        toast.info("Nessun record con data_pic da sincronizzare");
      }

      loadData();
      onDataChanged?.();
    } catch (error) {
      console.error("Errore sync data_val:", error);
      toast.error("Errore durante la sincronizzazione delle date");
    } finally {
      setIsUpdating(false);
    }
  }, [spr1Records, loadData, onDataChanged]);

  // Aggiorna residenze (lures/regresu/uslresu) da Excel usando fuzzy matching
  const handleUpdateResidenzeFromExcel = useCallback(async (file: File) => {
    setIsUpdating(true);
    const fuzzyMatches: string[] = [];
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: false });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, { 
        header: 1,
        defval: '',
        raw: false,
      });

      if (rawData.length < 2) {
        toast.error("Il file è vuoto o non contiene dati validi");
        setIsUpdating(false);
        return;
      }

      const headers = (rawData[0] as string[]).map(h => String(h || ''));
      const columnMap = buildColumnMap(headers);
      
      const cfColIdx = columnMap.codiceFiscale ?? 2;
      const residenzaColIdx = columnMap.residenza; // Cerca colonna residenza

      if (residenzaColIdx === undefined) {
        toast.error("Colonna Residenza non trovata nel file Excel");
        setIsUpdating(false);
        return;
      }

      const dataRows = rawData.slice(1);
      let updated = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        const cfValue = String(row[cfColIdx] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!cfValue || cfValue.length !== 16) continue;

        const residenzaValue = String(row[residenzaColIdx] || '').trim();
        if (!residenzaValue) continue;

        // Estrai nome comune dall'indirizzo
        const comuneNome = extractComuneFromAddress(residenzaValue);
        if (!comuneNome) continue;

        // Prova match esatto
        let comuneResults = searchComuniByNome(comuneNome);
        let usedFuzzy = false;
        
        // Se no match esatto, usa fuzzy matching
        if (comuneResults.length === 0) {
          const fuzzyResult = findBestFuzzyMatch(comuneNome);
          if (fuzzyResult && fuzzyResult.similarity >= 70) {
            comuneResults = [fuzzyResult.comune];
            usedFuzzy = true;
            fuzzyMatches.push(`"${comuneNome}" → "${fuzzyResult.comune.nome}" (${fuzzyResult.similarity}%)`);
          }
        }

        if (comuneResults.length === 0) continue;

        const comune = comuneResults[0];
        const codAsl = findAslByComune(comune.codiceIstat);

        const updateData: { lures: string; regresu: string; uslresu?: string } = {
          lures: comune.codiceIstat,
          regresu: comune.codiceRegione,
        };

        if (codAsl) {
          updateData.uslresu = codAsl;
        }

        const { error } = await supabase
          .from('spr1_records')
          .update(updateData)
          .eq('id_utente', cfValue);

        if (error) {
          errors.push(`${cfValue}: ${error.message}`);
        } else {
          updated++;
        }
      }

      if (errors.length > 0) {
        console.error("Errori aggiornamento residenze:", errors);
      }

      let message = `Aggiornate ${updated} residenze`;
      if (fuzzyMatches.length > 0) {
        message += ` (${fuzzyMatches.length} con fuzzy match)`;
        console.log("Fuzzy matches applicati:", fuzzyMatches);
        toast.info(`Fuzzy match: ${fuzzyMatches.slice(0, 3).join(', ')}${fuzzyMatches.length > 3 ? '...' : ''}`);
      }
      toast.success(message);
      loadData();
    } catch (error) {
      console.error("Errore parsing Excel residenze:", error);
      toast.error("Errore durante la lettura del file Excel");
    } finally {
      setIsUpdating(false);
    }
  }, [loadData]);

  const handleEdit = (record: SPR1DbRecord | SPR2DbRecord, table: "spr1" | "spr2") => {
    setEditingId(record.id);
    setEditingData({ ...record });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingData) return;

    try {
      const table = activeTab === "spr1" ? "spr1_records" : "spr2_records";
      const { id, created_at, updated_at, ...updateData } = editingData as any;

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", editingId);

      if (error) throw error;

      // Se abbiamo modificato un SPR2, ricalcola impatt dell'SPR1 collegato
      if (activeTab === "spr2") {
        const editedSpr2 = editingData as SPR2DbRecord;
        const spr1Id = editedSpr2.spr1_id;
        if (spr1Id) {
          const { data: linkedSpr2, error: fetchError } = await supabase
            .from('spr2_records')
            .select('impres')
            .eq('spr1_id', spr1Id)
            .eq('record', '3');

          if (!fetchError && linkedSpr2) {
            const totalImpres = linkedSpr2.reduce((sum, s) => sum + (s.impres || 0), 0);
            const impattFormatted = roundFinancial(totalImpres, 2).toFixed(2).replace('.', ',');
            
            await supabase
              .from('spr1_records')
              .update({ impatt: impattFormatted })
              .eq('id', spr1Id);
            
            toast.info(`Impatt SPR1 ricalcolato: €${impattFormatted}`);
          }
        }
      }

      toast.success("Record aggiornato con successo");
      setEditingId(null);
      setEditingData({});
      loadData();
      onDataChanged?.();
    } catch (error) {
      console.error("Errore aggiornamento:", error);
      toast.error("Errore durante l'aggiornamento");
    }
  };

  const handleDelete = async (id: string, table: "spr1" | "spr2") => {
    try {
      const tableName = table === "spr1" ? "spr1_records" : "spr2_records";
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      toast.success("Record eliminato");
      setDeleteConfirm(null);
      loadData();
      onDataChanged?.();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore durante l'eliminazione");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const tableName = activeTab === "spr1" ? "spr1_records" : "spr2_records";
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} record eliminati`);
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      loadData();
      onDataChanged?.();
    } catch (error) {
      console.error("Errore eliminazione multipla:", error);
      toast.error("Errore durante l'eliminazione multipla");
    }
  };

  // Delete ALL cloud data (SPR1 + SPR2)
  const handleDeleteAllCloudData = async () => {
    setIsDeletingAll(true);
    try {
      // Delete SPR2 first (has foreign key to SPR1)
      const { error: spr2Error } = await supabase
        .from('spr2_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (spr2Error) throw spr2Error;

      // Then delete SPR1
      const { error: spr1Error } = await supabase
        .from('spr1_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (spr1Error) throw spr1Error;

      toast.success("Tutti i dati sono stati eliminati dal Cloud");
      setDeleteAllConfirm(false);
      setSpr1Records([]);
      setSpr2Records([]);
      setSelectedIds(new Set());
      onDataChanged?.();
    } catch (error) {
      console.error("Errore eliminazione totale:", error);
      toast.error("Errore durante l'eliminazione dei dati");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    const records = activeTab === "spr1" ? filteredSPR1 : filteredSPR2;
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map(r => r.id)));
    }
  };

  // Available months from SPR2 dataini
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    spr2Records.forEach(r => {
      if (r.dataini) {
        const key = r.dataini.substring(0, 7);
        if (key.match(/^\d{4}-\d{2}$/)) months.add(key);
      }
    });
    return Array.from(months).sort();
  }, [spr2Records]);

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    const names = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  // SPR1 IDs that have SPR2 in the selected month
  const spr1IdsInMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const ids = new Set<string>();
    spr2Records.forEach(r => {
      if (r.dataini && r.spr1_id) {
        const key = r.dataini.substring(0, 7);
        if (key === selectedMonth) ids.add(r.spr1_id);
      }
    });
    return ids;
  }, [spr2Records, selectedMonth]);

  // Filter records
  const filteredSPR1 = spr1Records.filter(r => {
    const matchesSearch = !searchTerm || 
      r.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id_utente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nprat?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = !spr1IdsInMonth || spr1IdsInMonth.has(r.id);
    return matchesSearch && matchesMonth;
  });

  // Mappa nprat -> SPR1 per lookup CF/cognome/nome nella ricerca SPR2
  const spr1ByNprat = useMemo(() => {
    const map = new Map<string, typeof spr1Records[0]>();
    spr1Records.forEach(r => {
      if (r.nprat) map.set(r.nprat, r);
    });
    return map;
  }, [spr1Records]);

  const filteredSPR2 = spr2Records.filter(r => {
    let matchesSearch = !searchTerm ||
      r.nprat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.record?.includes(searchTerm);
    
    // Cerca anche in SPR1 collegato (CF, cognome, nome)
    if (!matchesSearch && searchTerm && r.nprat) {
      const linkedSPR1 = spr1ByNprat.get(r.nprat);
      if (linkedSPR1) {
        const term = searchTerm.toLowerCase();
        matchesSearch = !!(
          linkedSPR1.id_utente?.toLowerCase().includes(term) ||
          linkedSPR1.cognome?.toLowerCase().includes(term) ||
          linkedSPR1.nome?.toLowerCase().includes(term)
        );
      }
    }

    if (!selectedMonth) return matchesSearch;
    if (!r.dataini) return false;
    const key = r.dataini.substring(0, 7);
    return matchesSearch && key === selectedMonth;
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Gestione Database Cloud
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1">
                {activeTab === "spr1" && onImportMultipleSPR1 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const selectedRecords = spr1Records.filter(r => selectedIds.has(r.id));
                      onImportMultipleSPR1(selectedRecords);
                      setSelectedIds(new Set());
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Importa {selectedIds.size} in SPR1
                  </Button>
                )}
                {activeTab === "spr2" && onImportMultipleSPR2 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const selectedRecords = spr2Records.filter(r => selectedIds.has(r.id));
                      onImportMultipleSPR2(selectedRecords);
                      setSelectedIds(new Set());
                    }}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Importa {selectedIds.size} in SPR2
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Elimina {selectedIds.size}
                </Button>
              </div>
            )}
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpdateFromExcel(file);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" size="sm" disabled={isUpdating} asChild>
                <span>
                  <Upload className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                  Aggiorna Ore
                </span>
              </Button>
            </label>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpdateResidenzeFromExcel(file);
                  e.target.value = '';
                }}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" size="sm" disabled={isUpdating} asChild>
                      <span>
                        <FileText className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                        Aggiorna Residenze
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Aggiorna codici ISTAT comune (lures), regione e ASL<br/>usando fuzzy matching sulla colonna Residenza</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isUpdating} 
              onClick={handleAssignNprat}
              title="Assegna numeri pratica progressivi (2025001, 2025002...) ai pazienti senza nprat"
            >
              <Hash className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
              Assegna NPrat
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isUpdating} 
              onClick={handleAutoFillDataVal}
              title="Compila data presa in carico dal primo trattamento SPR2"
            >
              <Calendar className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
              Auto Data PIC
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isUpdating} 
              onClick={handleConvertNpratToGauss}
              title="Converte i nprat legacy (2025001) al formato GAUSS (FA70025001)"
            >
              <Hash className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
              Converti NPrat → GAUSS
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={isUpdating || spr2Records.length === 0} 
                    onClick={handleNormalizeDates}
                  >
                    <Calendar className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                    Date 1°/Ultimo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Normalizza dataini/datafine al primo e ultimo<br/>giorno del mese per tutti gli SPR2</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={isUpdating || spr1Records.length === 0} 
                    onClick={handleSyncDataValWithDataPic}
                  >
                    <Calendar className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                    Data Val = PIC
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Imposta data valutazione = data presa in carico<br/>per tutti i record nel database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isUpdating || spr2Records.length === 0} 
              onClick={handleRecalculateImpatt}
              title="Ricalcola impatt come somma di impres da tutti SPR2 collegati"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
              Ricalcola Impatt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMultiCodpresOpen(true)}
              disabled={multiCodpresCount === 0}
              title="Splitta i record SPR2 con codpres concatenato (405.1;417.1) in record distinti"
            >
              <AlertTriangle className={`h-4 w-4 mr-1 ${multiCodpresCount > 0 ? 'text-amber-600' : ''}`} />
              Revisione SPR2 multi-codpres
              {multiCodpresCount > 0 && <Badge variant="destructive" className="ml-2">{multiCodpresCount}</Badge>}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setDeleteAllConfirm(true)}
              disabled={spr1Records.length === 0 && spr2Records.length === 0}
              title="Elimina tutti i dati SPR1 e SPR2 dal Cloud"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Svuota Cloud
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Month filter + Search bar */}
        <div className="flex items-center gap-2">
          {availableMonths.length > 0 && (
            <Select value={selectedMonth || "all"} onValueChange={(v) => setSelectedMonth(v === "all" ? null : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tutti i mesi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i mesi</SelectItem>
                {availableMonths.map(m => (
                  <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per cognome, nome, CF, nprat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline">
            {activeTab === "spr1" ? filteredSPR1.length : filteredSPR2.length} record
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "spr1" | "spr2"); setSelectedIds(new Set()); }}>
          <TabsList>
            <TabsTrigger value="spr1">SPR1 ({spr1Records.length})</TabsTrigger>
            <TabsTrigger value="spr2">SPR2 ({spr2Records.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="spr1">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredSPR1.length && filteredSPR1.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>NPrat</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CF</TableHead>
                    <TableHead>Data PIC</TableHead>
                    <TableHead>Ore</TableHead>
                    <TableHead>Impatt</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSPR1.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.nprat || '-'}</TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            value={(editingData as any).cognome || ''}
                            onChange={(e) => setEditingData({ ...editingData, cognome: e.target.value })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          record.cognome || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            value={(editingData as any).nome || ''}
                            onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          record.nome || '-'
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.id_utente?.slice(0, 8) || '-'}...</TableCell>
                      <TableCell className="text-xs">{record.data_pic || '-'}</TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            value={(editingData as any).ore_prev || ''}
                            onChange={(e) => setEditingData({ ...editingData, ore_prev: e.target.value })}
                            className="h-7 text-xs w-16"
                          />
                        ) : (
                          record.ore_prev || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            value={(editingData as any).impatt || ''}
                            onChange={(e) => setEditingData({ ...editingData, impatt: e.target.value })}
                            className="h-7 text-xs w-20"
                          />
                        ) : (
                          record.impatt ? `€${record.impatt}` : '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === record.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                              <Save className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs gap-1"
                              onClick={() => onNavigateToSPR1?.(record)}
                              title="Vai al form SPR1 per modificare tutti i campi"
                            >
                              <FileText className="h-3 w-3" />
                              SPR1
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs gap-1"
                              onClick={() => onNavigateToSPR2?.(record)}
                              title="Vai ai record SPR2 collegati"
                            >
                              <ArrowRight className="h-3 w-3" />
                              SPR2
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(record, "spr1")}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteConfirm({ id: record.id, table: "spr1" })}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSPR1.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchTerm ? 'Nessun risultato trovato' : 'Nessun record SPR1'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="spr2">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredSPR2.length && filteredSPR2.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>NPrat</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Ini</TableHead>
                    <TableHead>Data Fine</TableHead>
                    <TableHead>Num Pres</TableHead>
                    <TableHead>Tariffa</TableHead>
                    <TableHead>Impres</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSPR2.map((record) => {
                    // Check mathematical consistency for each SPR2 record
                    let consistency = record.record === '3' 
                      ? checkMathConsistency(
                          record.tariffa?.toString(), 
                          record.numpres?.toString(), 
                          record.impres?.toString()
                        )
                      : null;
                    // No fallback: GAUSS richiede impres = tariffa x numpres
                    
                    return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelection(record.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.nprat || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.record || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {editingId === record.id ? (
                          <Input
                            type="date"
                            value={(editingData as any).dataini || ''}
                            onChange={(e) => setEditingData({ ...editingData, dataini: e.target.value })}
                            className="h-7 text-xs w-32"
                          />
                        ) : (
                          record.dataini || '-'
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {editingId === record.id ? (
                          <Input
                            type="date"
                            value={(editingData as any).datafine || ''}
                            onChange={(e) => setEditingData({ ...editingData, datafine: e.target.value })}
                            className="h-7 text-xs w-32"
                          />
                        ) : (
                          record.datafine || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={(editingData as any).numpres ?? ''}
                            onChange={(e) => setEditingData({ ...editingData, numpres: e.target.value ? parseInt(e.target.value) : null })}
                            className="h-7 text-xs w-16"
                          />
                        ) : (
                          record.numpres || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={(editingData as any).tariffa ?? ''}
                            onChange={(e) => setEditingData({ ...editingData, tariffa: e.target.value ? parseFloat(e.target.value) : null })}
                            className="h-7 text-xs w-20"
                          />
                        ) : (
                          record.tariffa ? `€${record.tariffa}` : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editingId === record.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={(editingData as any).impres ?? ''}
                              onChange={(e) => setEditingData({ ...editingData, impres: e.target.value ? parseFloat(e.target.value) : null })}
                              className="h-7 text-xs w-20"
                            />
                          ) : (
                            record.impres ? `€${record.impres}` : '-'
                          )}
                          {!editingId && consistency && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  {consistency.isConsistent ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {consistency.isConsistent ? (
                                    <p className="text-xs">✓ Coerenza OK</p>
                                  ) : (
                                    <p className="text-xs text-amber-600">{consistency.message}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === record.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                              <Save className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(record, "spr2")}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteConfirm({ id: record.id, table: "spr2" })}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );})}
                  {filteredSPR2.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {searchTerm ? 'Nessun risultato trovato' : 'Nessun record SPR2'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma eliminazione</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare questo record? L'operazione non può essere annullata.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm.id, deleteConfirm.table)}
              >
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk delete confirmation dialog */}
        <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma eliminazione multipla</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare {selectedIds.size} record? L'operazione non può essere annullata.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Elimina {selectedIds.size} record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete ALL cloud data confirmation dialog */}
        <Dialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">⚠️ Svuota Database Cloud</DialogTitle>
              <DialogDescription>
                Stai per eliminare <strong>TUTTI</strong> i dati dal database Cloud ({spr1Records.length} SPR1 + {spr2Records.length} SPR2).
                <br /><br />
                Questa operazione è <strong>irreversibile</strong> e cancellerà permanentemente tutti i record.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAllConfirm(false)} disabled={isDeletingAll}>
                Annulla
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllCloudData}
                disabled={isDeletingAll}
              >
                {isDeletingAll ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Elimina Tutto
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SPR2MultiCodpresReview
          open={multiCodpresOpen}
          onOpenChange={setMultiCodpresOpen}
          onDone={() => { loadData(); onDataChanged?.(); }}
        />
      </CardContent>
    </Card>
  );
}
