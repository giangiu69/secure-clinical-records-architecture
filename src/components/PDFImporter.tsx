import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, X, Calendar, Home, RefreshCw, Pencil, ParkingCircle, Cloud } from "lucide-react";
import { toast } from "sonner";
import { SPR1Record, SPR2Record } from "@/types/spr";
import { parsePDFToPresences, RawPresenceEntry, extractReferenceMonth, extractValutazioneDate } from "@/lib/pdfParser";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  classifyWithFallback,
  CodicePrestazioneType,
  ClassificationResult,
  getBaseTariffa,
} from "@/lib/activity-classifier";
import { calculateImporto, determineTipoindu, TARIFFE } from "@/lib/excelParser";
import { roundFinancial } from "@/lib/financial-utils";
import * as pdfjsLib from "pdfjs-dist";
// Worker bundled localmente da Vite (evita dipendenza da CDN che può fallire/bloccare per CSP)
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.js?url";
import { extractCheckboxEntries, shouldUseCheckboxExtractor } from "@/lib/pdf-checkbox-extractor";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

// Nomi mesi per display
const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface PDFImporterProps {
  spr1Records: SPR1Record[];
  spr2Records: SPR2Record[];  // NUOVO: per aggregazione SPR2 esistenti
  onSPR2Generated: (records: SPR2Record[]) => void;
  onSPR1Update?: (cf: string, updates: Partial<SPR1Record>) => void;
  onUploadSPR2ToCloud?: () => void;
}

interface ParsedPresence {
  patientName: string;
  dataini: string;
  datafine: string;
  numpres: number;       // Giorni distinti di accesso
  totalMinutes: number;
  durata: string;
  matched: boolean;
  matchedSPR1?: SPR1Record;
  existingSPR2?: SPR2Record;  // NUOVO: SPR2 esistente da aggregare
  // Activity classification fields
  detectedCodpres: CodicePrestazioneType;
  classificationSource: ClassificationResult['source'];
  activityText?: string;
  isManuallyEdited: boolean;
  // Remote session tracking
  hasRemotePresences: boolean;
  remoteHours: number;
  inPersonHours: number;
  // Valutazione data extraction
  hasValutazione: boolean;
  valutazioneDate?: string;  // YYYY-MM-DD se trovata
  // Grouping key for multiple service types per patient
  groupKey: string;  // SPR1 key + codpres
}

// Tipo alias dalla rubrica
interface NameAlias {
  pdf_name: string;
  spr1_cf: string;
  spr1_cognome: string | null;
  spr1_nome: string | null;
}

export default function PDFImporter({ spr1Records, spr2Records, onSPR2Generated, onSPR1Update, onUploadSPR2ToCloud }: PDFImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedPresence[]>([]);
  const [fileContent, setFileContent] = useState<string>("");
  const [rawEntries, setRawEntries] = useState<RawPresenceEntry[]>([]);
  const [referenceMonth, setReferenceMonth] = useState<{ year: number; month: number } | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [nameAliases, setNameAliases] = useState<NameAlias[]>([]);

  // Carica rubrica alias all'apertura
  useEffect(() => {
    if (isOpen) {
      loadAliases();
    }
  }, [isOpen]);

  const loadAliases = async (): Promise<NameAlias[]> => {
    try {
      const { data, error } = await supabase
        .from('name_aliases')
        .select('*');
      if (!error && data) {
        const aliases = data as NameAlias[];
        setNameAliases(aliases);
        return aliases;
      }
    } catch (e) {
      console.log('Alias non disponibili:', e);
    }
    return nameAliases;
  };

  // Salva alias in rubrica
  const saveAlias = async (pdfName: string, spr1: SPR1Record) => {
    const normalizedPdf = normalizeNoSpaces(pdfName);
    try {
      await supabase.from('name_aliases').upsert({
        pdf_name: normalizedPdf,
        spr1_cf: spr1.IDutente || '',
        spr1_cognome: spr1.Cognome || '',
        spr1_nome: spr1.Nome || '',
      }, { onConflict: 'pdf_name' });
      // Aggiorna cache locale
      setNameAliases(prev => {
        const filtered = prev.filter(a => a.pdf_name !== normalizedPdf);
        return [...filtered, { pdf_name: normalizedPdf, spr1_cf: spr1.IDutente || '', spr1_cognome: spr1.Cognome || '', spr1_nome: spr1.Nome || '' }];
      });
    } catch (e) {
      console.error('Errore salvataggio alias:', e);
    }
  };

  // Parcheggia record non abbinati
  const handleParkUnmatched = async () => {
    const unmatched = parsedData.filter(p => !p.matched);
    if (unmatched.length === 0) {
      toast.info('Nessun record da parcheggiare');
      return;
    }

    const monthStr = referenceMonth 
      ? `${referenceMonth.year}-${String(referenceMonth.month).padStart(2, '0')}`
      : new Date().toISOString().slice(0, 7);

    const rows = unmatched.map(p => ({
      record_type: 'spr2',
      patient_name: p.patientName,
      raw_data: {
        dataini: p.dataini,
        datafine: p.datafine,
        numpres: p.numpres,
        totalMinutes: p.totalMinutes,
        durata: p.durata,
        detectedCodpres: p.detectedCodpres,
        remoteHours: p.remoteHours,
        inPersonHours: p.inPersonHours,
        activityText: p.activityText,
        hasValutazione: p.hasValutazione,
        valutazioneDate: p.valutazioneDate,
      },
      error_reason: 'Nessun match SPR1 trovato',
      reference_month: monthStr,
      status: 'pending',
    }));

    const { error } = await supabase.from('pending_records').insert(rows);
    if (error) {
      toast.error('Errore nel parcheggio: ' + error.message);
    } else {
      toast.success(`${unmatched.length} record parcheggiati con successo`);
      // Rimuovi i parcheggiati dalla vista
      setParsedData(prev => prev.filter(p => p.matched));
    }
  };

  // Normalizza nome paziente per matching robusto (rimuove accenti e caratteri speciali)
  const normalizePatientName = (name: string): string => {
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Rimuove accenti
      .replace(/[^A-Z\s]/g, '')          // Rimuove caratteri speciali
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Normalizza rimuovendo TUTTI gli spazi (per cognomi composti: "DE ANDRADE" = "DEANDRADE")
  const normalizeNoSpaces = (name: string): string => {
    return normalizePatientName(name).replace(/\s+/g, '');
  };

  // Calcola score di matching tra nome PDF e SPR1 (più alto = migliore)
  const calculateMatchScore = (
    pdfName: string,
    spr1Cognome: string,
    spr1Nome: string
  ): { score: number; matchType: string } => {
    const normalizedPDFName = normalizePatientName(pdfName);
    const pdfParts = normalizedPDFName.split(' ').filter(p => p.length > 1);
    const pdfNoSpaces = normalizeNoSpaces(pdfName);
    
    const cogUpper = normalizePatientName(spr1Cognome);
    const nomeUpper = normalizePatientName(spr1Nome);
    const cogNoSpaces = normalizeNoSpaces(spr1Cognome);
    const nomeNoSpaces = normalizeNoSpaces(spr1Nome);
    
    const fullName = `${nomeUpper} ${cogUpper}`;
    const reverseName = `${cogUpper} ${nomeUpper}`;
    const fullNoSpaces = `${nomeNoSpaces}${cogNoSpaces}`;
    const reverseNoSpaces = `${cogNoSpaces}${nomeNoSpaces}`;
    
    // Score 100: Match esatto (ordine qualsiasi)
    if (fullName === normalizedPDFName || reverseName === normalizedPDFName) {
      return { score: 100, matchType: 'esatto' };
    }
    
    // Score 95: Match senza spazi esatto (gestisce "DE ANDRADE" vs "DEANDRADE")
    if (fullNoSpaces === pdfNoSpaces || reverseNoSpaces === pdfNoSpaces) {
      return { score: 95, matchType: 'senza_spazi' };
    }
    
    // Score 80: Match parziale con ENTRAMBI cognome E nome presenti
    if (cogUpper && nomeUpper) {
      const cogParts = cogUpper.split(' ').filter(p => p.length > 1);
      const nomeParts = nomeUpper.split(' ').filter(p => p.length > 1);
      
      // Verifica che almeno una parte del cognome e una del nome siano presenti
      const hasCognome = cogParts.some(part => pdfParts.includes(part));
      const hasNome = nomeParts.some(part => pdfParts.includes(part));
      
      if (hasCognome && hasNome) {
        // Bonus per match più completi
        const cogMatches = cogParts.filter(part => pdfParts.includes(part)).length;
        const nomeMatches = nomeParts.filter(part => pdfParts.includes(part)).length;
        const bonus = (cogMatches + nomeMatches - 2) * 5;
        return { score: 80 + bonus, matchType: 'parziale_entrambi' };
      }
    }
    
    // Score 70: Match contenimento bidirezionale (cognome+nome nel PDF)
    if (cogNoSpaces && nomeNoSpaces) {
      if (pdfNoSpaces.includes(cogNoSpaces) && pdfNoSpaces.includes(nomeNoSpaces)) {
        return { score: 70, matchType: 'contenimento' };
      }
    }
    
    // ❌ RIMOSSO: Match su singola parola (nome O cognome) - causa abbinamenti errati!
    // Esempio: "PAPINI SIMONE" matchava erroneamente con "STEFANI SIMONE" 
    // perché "SIMONE" è presente in entrambi
    
    return { score: 0, matchType: 'nessuno' };
  };

  // Suffissi attività da rimuovere dai nomi PDF prima del matching
  // Ordine: dal più lungo al più corto per evitare match parziali
  const ACTIVITY_SUFFIXES = [
    'AC RIAB', 'AC SUPP', 'AC FAM', 'AA FAM',
    '-AC', '-AA',
    'ACRIAB', 'ACSUPP', 'ACFAM', 'AAFAM',
    'AC', 'AA', 'FAM', 'ED', 'RIAB', 'SUPP',
  ];

  // Mappa suffisso → hint codpres
  const SUFFIX_CODPRES_HINT: Record<string, CodicePrestazioneType> = {
    'AC': '417.1', 'AC RIAB': '417.1', 'AC SUPP': '417.1', 'AC FAM': '417.1',
    '-AC': '417.1', 'ACRIAB': '417.1', 'ACSUPP': '417.1', 'ACFAM': '417.1',
    'RIAB': '417.1', 'SUPP': '417.1',
    'AA': '405.1', '-AA': '405.1', 'AA FAM': '405.1', 'AAFAM': '405.1',
    'FAM': '405.1', 'ED': '405.1',
  };

  // Rimuove suffissi attività dal nome e restituisce il nome pulito + hint codpres
  const stripActivitySuffix = (name: string): { cleanName: string; codpresHint: CodicePrestazioneType | null } => {
    const upper = name.toUpperCase().trim();
    for (const suffix of ACTIVITY_SUFFIXES) {
      // Check sia con spazio che senza (es. "CURCIO AC" e "CURCIOAC")
      if (upper.endsWith(` ${suffix}`) || upper.endsWith(`-${suffix}`)) {
        const cleanName = upper.slice(0, -(suffix.length + 1)).trim();
        return { cleanName, codpresHint: SUFFIX_CODPRES_HINT[suffix] || null };
      }
      if (upper.endsWith(suffix) && upper.length > suffix.length) {
        // Solo se il suffisso non è l'intero nome
        const cleanName = upper.slice(0, -suffix.length).trim();
        // Verifica che non abbiamo tagliato parte del cognome (min 2 chars rimasti)
        if (cleanName.length >= 2) {
          return { cleanName, codpresHint: SUFFIX_CODPRES_HINT[suffix] || null };
        }
      }
    }
    return { cleanName: upper, codpresHint: null };
  };

  // Trova SPR1 tramite alias o matching standard
  // Ora con strip dei suffissi attività per matching più robusto
  const findMatchWithAlias = (patientName: string, aliasesOverride?: NameAlias[]): { spr1: SPR1Record | null; codpresHint: CodicePrestazioneType | null } => {
    const aliases = aliasesOverride || nameAliases;
    // 0. Strip suffissi attività dal nome
    const { cleanName, codpresHint } = stripActivitySuffix(patientName);
    
    // 1. Cerca nella rubrica alias (prima col nome originale, poi col nome pulito)
    const normalizedPdf = normalizeNoSpaces(patientName);
    const normalizedClean = normalizeNoSpaces(cleanName);
    
    for (const tryName of [normalizedPdf, normalizedClean]) {
      const alias = aliases.find(a => a.pdf_name === tryName);
      if (alias && alias.spr1_cf) {
        const spr1 = spr1Records.find(r => r.IDutente === alias.spr1_cf);
        if (spr1) {
          console.log(`[Alias] Match trovato via rubrica: "${patientName}" (clean: "${cleanName}") → ${spr1.Cognome} ${spr1.Nome}`);
          return { spr1, codpresHint };
        }
      }
    }
    
    // 2. Matching standard col nome pulito (senza suffissi)
    const spr1 = findMatchingSPR1(cleanName);
    if (spr1) {
      console.log(`[Match] Trovato dopo strip suffisso: "${patientName}" → "${cleanName}" → ${spr1.Cognome} ${spr1.Nome}`);
      return { spr1, codpresHint };
    }
    
    // 3. Ultimo tentativo col nome originale
    if (cleanName !== patientName.toUpperCase().trim()) {
      const spr1orig = findMatchingSPR1(patientName);
      if (spr1orig) return { spr1: spr1orig, codpresHint };
    }
    
    return { spr1: null, codpresHint };
  };

  // Trova SPR1 corrispondente - SOLO per Nome/Cognome (PDF non ha CF)
  // USA SCORING SYSTEM per evitare match errati su singola parola
  const findMatchingSPR1 = (patientName: string): SPR1Record | null => {
    const normalizedPDFName = normalizePatientName(patientName);
    const pdfNoSpaces = normalizeNoSpaces(patientName);
    
    console.log(`[PDF Match] Cercando: "${patientName}" → normalizzato: "${normalizedPDFName}" → senza spazi: "${pdfNoSpaces}"`);
    console.log(`[PDF Match] SPR1 disponibili: ${spr1Records.length}`);
    
    // Trova il miglior match usando scoring
    let bestMatch: { spr1: SPR1Record; score: number; matchType: string } | null = null;
    
    for (const spr1 of spr1Records) {
      const cogUpper = normalizePatientName(spr1.Cognome || '');
      const nomeUpper = normalizePatientName(spr1.Nome || '');
      
      // Skip record senza nome/cognome
      if (!cogUpper && !nomeUpper) continue;
      
      const { score, matchType } = calculateMatchScore(patientName, spr1.Cognome || '', spr1.Nome || '');
      
      // Soglia minima: score >= 70 (richiede almeno contenimento bidirezionale)
      if (score >= 70 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { spr1, score, matchType };
      }
    }
    
    if (bestMatch) {
      console.log(`[PDF Match] ✅ Match trovato (score: ${bestMatch.score}, tipo: ${bestMatch.matchType}): "${patientName}" → SPR1: ${bestMatch.spr1.Cognome} ${bestMatch.spr1.Nome}`);
      return bestMatch.spr1;
    }
    
    console.log(`[PDF Match] ❌ Nessun match per: "${patientName}" (nessun candidato con score >= 70)`);
    return null;
  };

  // Trova SPR2 esistente per un SPR1 e codpres specifico (per aggregazione)
  const findExistingSPR2 = (spr1: SPR1Record, codpres?: CodicePrestazioneType): SPR2Record | undefined => {
    return spr2Records.find(spr2 => 
      spr2.nprat === spr1.nprat &&
      spr2.codusl === spr1.codusl &&
      spr2.struttura === spr1.struttura &&
      (!codpres || spr2.codpres === codpres)
    );
  };

  const hasUsablePdfText = (text: string): boolean => {
    const letters = text.match(/[A-Za-zÀ-ÿ]/g)?.length ?? 0;
    const dates = text.match(/\b\d{2}\/\d{2}\/\d{4}\b/g)?.length ?? 0;
    return text.trim().length >= 500 || letters >= 100 || dates >= 3;
  };

  const runOcrOnPdf = async (pdf: any): Promise<string> => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ita");
    let ocrText = "";

    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const baseViewport = page.getViewport({ scale: 1 });
        const maxDimension = Math.max(baseViewport.width, baseViewport.height);
        const scale = Math.min(2.5, Math.max(1.5, 2200 / maxDimension));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;

        const result = await worker.recognize(canvas);
        ocrText += result.data.text + "\n";
        console.log(`[PDF OCR] Pagina ${i}/${pdf.numPages}: ${result.data.text.length} caratteri`);

        canvas.width = 0;
        canvas.height = 0;
      }
    } finally {
      await worker.terminate();
    }

    return ocrText;
  };

  // --- FUNZIONE DI ESTRAZIONE TESTO REALE ---
  const extractTextFromPDF = async (file: File): Promise<{ text: string; method: "native" | "ocr" }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Unisce le parole mantenendo un separatore
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    if (hasUsablePdfText(fullText)) {
      return { text: fullText, method: "native" };
    }

    console.log(`[PDF OCR] Estrazione nativa insufficiente (${fullText.length} caratteri), avvio OCR`);
    toast.info("PDF immagine rilevato: avvio lettura OCR, può richiedere alcuni minuti.");
    const ocrText = await runOcrOnPdf(pdf);
    return { text: ocrText, method: "ocr" };
  };

  // Handle codpres change from UI — auto-recalculate tariffa and impres
  const handleCodpresChange = useCallback((index: number, newCodpres: CodicePrestazioneType) => {
    setParsedData(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const baseTariffa = getBaseTariffa(newCodpres);
      console.log(`[CodpresChange] ${item.patientName}: ${item.detectedCodpres} → ${newCodpres}, tariffa: ${baseTariffa}€`);
      toast.info(`${item.patientName}: tariffa aggiornata a ${baseTariffa}€ (${newCodpres})`);
      return { 
        ...item, 
        detectedCodpres: newCodpres, 
        isManuallyEdited: true, 
        classificationSource: 'fallback' as const,
      };
    }));
  }, []);

  // Handle patient name edit for unmatched entries
  const handleNameEdit = useCallback((index: number, newName: string) => {
    setParsedData(prev => prev.map((item, i) => 
      i === index ? { ...item, patientName: newName } : item
    ));
  }, []);

  // Re-run matching for a single unmatched entry after name edit
  // Salva alias automaticamente su match riuscito
  const handleRetryMatch = useCallback((index: number) => {
    setParsedData(prev => {
      const updated = [...prev];
      const item = updated[index];
      if (!item || item.matched) return prev;

      const originalName = item.patientName;
      const { spr1: matchedSPR1, codpresHint } = findMatchWithAlias(item.patientName);
      if (matchedSPR1) {
        // Usa hint suffisso se disponibile e non editato manualmente
        const effectiveCodpres = codpresHint && !item.isManuallyEdited ? codpresHint : item.detectedCodpres;
        // Check if there's already an aggregated entry for this SPR1+codpres
        const existingAggIndex = updated.findIndex(p => 
          p.matched && p.matchedSPR1 && 
          p.matchedSPR1.nprat === matchedSPR1.nprat &&
          p.matchedSPR1.codusl === matchedSPR1.codusl &&
          p.detectedCodpres === effectiveCodpres
        );

        if (existingAggIndex >= 0) {
          // Merge into existing aggregated entry
          const existing = updated[existingAggIndex];
          updated[existingAggIndex] = {
            ...existing,
            remoteHours: existing.remoteHours + item.remoteHours,
            inPersonHours: existing.inPersonHours + item.inPersonHours,
            totalMinutes: existing.totalMinutes + item.totalMinutes,
            numpres: existing.numpres + item.numpres,
            durata: ((existing.totalMinutes + item.totalMinutes) / 60).toFixed(1).replace(".", ",").padStart(5, "0"),
            hasRemotePresences: existing.hasRemotePresences || item.hasRemotePresences,
          };
          // Remove the now-matched entry
          updated.splice(index, 1);
        } else {
          // Convert to matched entry
          updated[index] = {
            ...item,
            matched: true,
            matchedSPR1: matchedSPR1,
            patientName: `${matchedSPR1.Cognome} ${matchedSPR1.Nome}`,
            detectedCodpres: effectiveCodpres,
            existingSPR2: findExistingSPR2(matchedSPR1, effectiveCodpres),
            groupKey: `${matchedSPR1.codusl}-${matchedSPR1.struttura}-${matchedSPR1.data_PIC}-${matchedSPR1.nprat}-${effectiveCodpres}`,
          };
        }
        toast.success(`"${originalName}" abbinato a ${matchedSPR1.Cognome} ${matchedSPR1.Nome}`);
        // Salva alias per usi futuri
        saveAlias(originalName, matchedSPR1);
      } else {
        toast.error(`Nessun match trovato per "${item.patientName}"`);
      }
      return updated;
    });
  }, [spr1Records, spr2Records, nameAliases]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Solo file PDF sono supportati");
      return;
    }

    setIsProcessing(true);
    setParsedData([]);
    setReferenceMonth(null);
    setSkippedCount(0);

    try {
      // 0. Ricarica alias PRIMA di processare (garantisce alias aggiornati)
      const freshAliases = await loadAliases();
      console.log(`[PDF Import] Alias caricati: ${freshAliases.length}`);

      // 1. Estrai il testo nativo dal PDF (usato per rilevare il mese di riferimento
      //    e per decidere se attivare il checkbox extractor su PDF grafici)
      const arrayBuf = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      let nativeText = "";
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const tc = await page.getTextContent();
        nativeText += tc.items.map((it: any) => it.str).join(" ") + "\n";
      }
      console.log(`[PDF Import] Testo nativo: ${nativeText.length} caratteri`);

      let allRawEntries: RawPresenceEntry[] = [];
      let usedCheckboxExtractor = false;

      if (shouldUseCheckboxExtractor(nativeText.length)) {
        // PDF tabellare grafico (es. professionisti_MM-AA.pdf): legge le checkbox
        // direttamente dal canvas → codpres deterministico per ogni riga
        toast.info("PDF tabellare grafico rilevato: lettura checkbox per colonna…");
        try {
          allRawEntries = await extractCheckboxEntries(pdfDoc);
          usedCheckboxExtractor = allRawEntries.length > 0;
          if (usedCheckboxExtractor) {
            toast.success(`Estratte ${allRawEntries.length} sessioni con codpres deterministico.`);
          }
        } catch (err) {
          console.error("[CheckboxExtractor] Errore:", err);
        }
      }

      // Fallback: estrazione testuale (PDF con layer testo, oppure se checkbox extractor non ha prodotto entry)
      let content = nativeText;
      if (!usedCheckboxExtractor) {
        let extraction: Awaited<ReturnType<typeof extractTextFromPDF>>;
        try {
          extraction = await extractTextFromPDF(file);
        } catch (error) {
          console.error("[PDF OCR] Errore fallback OCR:", error);
          toast.error("PDF immagine/scansionato: OCR non riuscito. Esporta il registro come PDF testuale oppure riprova con connessione stabile.");
          return;
        }
        content = extraction.text;
        console.log(`[PDF Import] Testo estratto (fallback): ${content.length} caratteri (${extraction.method})`);
        if (extraction.method === "ocr") {
          toast.success(`OCR completato: estratti ${content.length} caratteri dal PDF immagine.`);
        }
        allRawEntries = await parsePDFToPresences(content);
        console.log(`[PDF Import] Entry parsate (fallback testuale): ${allRawEntries.length}`);
        if (allRawEntries.length === 0 && content.length > 100) {
          toast.error("Parser PDF: 0 entry estratte. Formato PDF non riconosciuto.");
        }
      }
      setFileContent(content || nativeText);

      // 2. Estrai mese di riferimento dal PDF (cerca prima nel testo nativo, poi nel fallback OCR)
      const refMonth = extractReferenceMonth(nativeText) || extractReferenceMonth(content);
      setReferenceMonth(refMonth);
      console.log(`[PDF Import] Mese di riferimento rilevato:`, refMonth);


      // 4. Filtra entry per mese di riferimento (se rilevato)
      let filteredEntries = allRawEntries;
      if (refMonth) {
        filteredEntries = allRawEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() + 1 === refMonth.month 
              && entryDate.getFullYear() === refMonth.year;
        });
        
        const skipped = allRawEntries.length - filteredEntries.length;
        setSkippedCount(skipped);
        console.log(`[PDF Import] Dopo filtro mese ${refMonth.month}/${refMonth.year}: ${filteredEntries.length} entry (skip ${skipped})`);
        if (skipped > 0) {
          toast.warning(`${skipped} sessioni ignorate (fuori dal mese ${MONTH_NAMES[refMonth.month - 1]} ${refMonth.year})`);
        }
        if (filteredEntries.length === 0 && allRawEntries.length > 0) {
          toast.error(`Tutte le ${allRawEntries.length} entry sono fuori dal mese rilevato (${MONTH_NAMES[refMonth.month - 1]} ${refMonth.year}). Verifica intestazione PDF.`);
        }
      }
      
      setRawEntries(filteredEntries);

      // 5. Per ogni entry singola, trova il match SPR1 e determina codpres
      const entriesWithMatchAndClassification = filteredEntries.map(entry => {
        // PDF NON contiene CF - matching con alias + nome/cognome (con strip suffissi)
        const { spr1: matchedSPR1, codpresHint } = findMatchWithAlias(entry.patientName, freshAliases);

        // PRIORITÀ ASSOLUTA: codpres deterministico dal checkbox extractor
        // (impostato quando il PDF è tabellare grafico e la colonna spuntata è stata letta direttamente)
        if (entry.codpres) {
          return {
            ...entry,
            matchedSPR1,
            detectedCodpres: entry.codpres as CodicePrestazioneType,
            classificationSource: 'auto' as const,
          };
        }

        // Fallback testuale: classifica l'attività PER OGNI ENTRY SINGOLA
        const excelTipologia = matchedSPR1 ? (matchedSPR1 as any)._excelTipologia : undefined;
        const classification = classifyWithFallback(entry.activityText || "", excelTipologia);

        // Determina codpres: suffisso hint > classificatore > SPR1 codpres (fallback)
        let finalCodpres = classification.codpres;
        let finalSource = classification.source;

        if (codpresHint && classification.source === 'fallback') {
          finalCodpres = codpresHint;
          finalSource = 'auto' as const;
        } else if (classification.source === 'fallback' && matchedSPR1?.codpres) {
          // Se classificatore non sa, usa il codpres dell'SPR1 (da Excel)
          finalCodpres = matchedSPR1.codpres as CodicePrestazioneType;
          finalSource = 'auto' as const;
        }

        return {
          ...entry,
          matchedSPR1,
          detectedCodpres: finalCodpres,
          classificationSource: finalSource,
        };
      });

      // 6. Raggruppa per SPR1 padre + codpres (chiave composta)
      // NUOVO: Ogni combinazione paziente+tipologia genera un SPR2 separato
      const groupedByParentAndCodpres = new Map<string, typeof entriesWithMatchAndClassification>();
      entriesWithMatchAndClassification.forEach(entry => {
        if (!entry.matchedSPR1) return;
        // Chiave = SPR1 + codpres (es: "010-090MA7-2024-01-15-00001-405.1")
        const key = `${entry.matchedSPR1.codusl}-${entry.matchedSPR1.struttura}-${entry.matchedSPR1.data_PIC}-${entry.matchedSPR1.nprat}-${entry.detectedCodpres}`;
        if (!groupedByParentAndCodpres.has(key)) groupedByParentAndCodpres.set(key, []);
        groupedByParentAndCodpres.get(key)!.push(entry);
      });

      // 7. Crea AggregatedPresence PER OGNI SPR1 + CODPRES UNICO con:
      // - numpres = giorni DISTINTI di accesso
      // - aggregazione ore remoto/presenza
      // - MERGE con SPR2 esistente se presente
      // NUOVO: Genera N SPR2 per paziente se ha prestazioni di tipologia diversa
      const aggregatedPresences: ParsedPresence[] = Array.from(groupedByParentAndCodpres.entries()).map(([key, entries]) => {
        const parent = entries[0].matchedSPR1!;
        const codpres = entries[0].detectedCodpres;
        const allDates = entries.map(e => e.date).sort();
        
        // Cerca SPR2 esistente per questo SPR1 E CODPRES (per aggregazione multi-PDF)
        const existingSPR2 = findExistingSPR2(parent, codpres);
        
        // Calcola ore SOLO dal PDF corrente (NON accumulare con SPR2 esistenti)
        // L'accumulazione causava ore che crescevano ad ogni re-import
        const newRemoteHours = entries.filter(e => e.isRemote).reduce((sum, e) => sum + e.hours, 0);
        const newInPersonHours = entries.filter(e => !e.isRemote).reduce((sum, e) => sum + e.hours, 0);
        
        const totalRemoteHours = newRemoteHours;
        const totalInPersonHours = newInPersonHours;
        const totalHours = totalRemoteHours + totalInPersonHours;
        
        const totalMinutes = totalHours * 60;
        const hoursDecimal = (totalMinutes / 60).toFixed(1).replace(".", ",").padStart(5, "0");
        
        // Conta giorni distinti di accesso per questa tipologia
        const distinctDays = new Set(allDates).size;
        
        // NUOVO: Date = primo e ultimo giorno del mese di riferimento
        let finalDataini: string;
        let finalDatafine: string;
        
        if (refMonth) {
          // Primo giorno del mese
          const mm = String(refMonth.month).padStart(2, '0');
          const lastDayNum = new Date(refMonth.year, refMonth.month, 0).getDate();
          finalDataini = `${refMonth.year}-${mm}-01`;
          finalDatafine = `${refMonth.year}-${mm}-${String(lastDayNum).padStart(2, '0')}`;
        } else {
          // Fallback: usa date effettive se mese non rilevato
          finalDataini = allDates[0];
          finalDatafine = allDates[allDates.length - 1];
        }
        
        // Combine all activity texts from entries
        const combinedActivityText = entries
          .map(e => e.activityText)
          .filter(Boolean)
          .join(" ");
        
        // Check for valutazione in any entry
        const valutazioneEntries = entries.filter(e => e.hasValutazione);
        const hasValutazione = valutazioneEntries.length > 0;
        const valutazioneDate = valutazioneEntries.find(e => e.valutazioneDate)?.valutazioneDate;
        
        return {
          patientName: `${parent.Cognome} ${parent.Nome}`,
          dataini: finalDataini,
          datafine: finalDatafine,
          numpres: distinctDays,
          totalMinutes,
          durata: hoursDecimal,
          matched: true,
          matchedSPR1: parent,
          existingSPR2,
          detectedCodpres: codpres,
          classificationSource: entries[0].classificationSource,
          activityText: combinedActivityText || undefined,
          isManuallyEdited: false,
          hasRemotePresences: totalRemoteHours > 0,
          remoteHours: totalRemoteHours,
          inPersonHours: totalInPersonHours,
          hasValutazione,
          valutazioneDate,
          groupKey: key,  // Chiave per identificazione univoca
        };
      });

      // Aggiungi entry non matchate con errore specifico
      const unmatchedEntries = entriesWithMatchAndClassification.filter(e => !e.matchedSPR1);
      const unmatchedPresences: ParsedPresence[] = unmatchedEntries.map(entry => {
        return {
          patientName: entry.patientName,
          dataini: entry.date,
          datafine: entry.date,
          numpres: 1,
          totalMinutes: entry.hours * 60,
          durata: (entry.hours).toFixed(1).replace(".", ",").padStart(5, "0"),
          matched: false,
          detectedCodpres: entry.detectedCodpres,
          classificationSource: entry.classificationSource,
          activityText: entry.activityText,
          isManuallyEdited: false,
          hasRemotePresences: entry.isRemote,
          remoteHours: entry.isRemote ? entry.hours : 0,
          inPersonHours: entry.isRemote ? 0 : entry.hours,
          hasValutazione: entry.hasValutazione || false,
          valutazioneDate: entry.valutazioneDate,
          groupKey: `unmatched-${entry.patientName}-${entry.detectedCodpres}`,
        };
      });

      const allPresences = [...aggregatedPresences, ...unmatchedPresences];
      setParsedData(allPresences);

      const matchedCount = aggregatedPresences.length;
      const unmatchedCount = unmatchedPresences.length;

      if (matchedCount > 0) {
        toast.success(`${matchedCount} pazienti abbinati con successo!`);
      }
      
      // Errore specifico per utenti non trovati
      if (unmatchedCount > 0) {
        const unmatchedNames = [...new Set(unmatchedPresences.map(p => p.patientName))];
        toast.error(`${unmatchedCount} utenti non trovati in archivio SPR1. Importa prima l'Excel.`, {
          description: unmatchedNames.slice(0, 3).join(", ") + (unmatchedNames.length > 3 ? "..." : ""),
          duration: 8000,
        });
      }
      
      if (matchedCount === 0 && unmatchedCount === 0) {
        toast.error("Nessun dato utile trovato nel PDF. Verifica il formato.");
      }
    } catch (error) {
      console.error("Errore lettura PDF:", error);
      toast.error("Impossibile leggere il file PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSPR2 = () => {
    const matchedRecords = parsedData.filter((p) => p.matched && p.matchedSPR1);

    if (matchedRecords.length === 0) {
      toast.error("Nessun paziente valido da importare");
      return;
    }

    // FASE 1: Genera tutti gli SPR2 (senza toccare SPR1)
    const newSPR2Records: SPR2Record[] = matchedRecords.map((presence) => {
      const parent = presence.matchedSPR1!;

      // Calcola importo senza sconto remoto (tariffa unica)
      const totalHours = presence.remoteHours + presence.inPersonHours;
      const { tariffa: baseTariffa, importo: impresCalcolato } = calculateImporto(
        presence.detectedCodpres,
        totalHours
      );

      return {
        record: "3",
        codusl: parent.codusl,
        struttura: parent.struttura,
        data_PIC: parent.data_PIC,
        nprat: parent.nprat,
        dataini: presence.dataini,
        datafine: presence.datafine,
        numpres: presence.numpres.toString(),
        tariffa: baseTariffa.toFixed(2).replace(".", ","),
        impres: impresCalcolato.toFixed(2).replace(".", ","),
        compensa: "1",
        durata: presence.durata,
        codpres: presence.detectedCodpres,
        is_remote: presence.hasRemotePresences,
        // Metadati interni (non esportati in TXT)
        _remoteHours: presence.remoteHours,
        _inPersonHours: presence.inPersonHours,
      } as SPR2Record;
    });

    // FASE 2: Aggrega per paziente (IDutente) e aggiorna SPR1 una sola volta
    if (onSPR1Update) {
      const byPatient = new Map<string, {
        totalHours: number;
        codpresHours: Record<string, number>;
        parent: SPR1Record;
        hasValutazione: boolean;
        valutazioneDate?: string;
      }>();

      matchedRecords.forEach((presence) => {
        const cf = presence.matchedSPR1!.IDutente;
        const hours = presence.remoteHours + presence.inPersonHours;

        if (!byPatient.has(cf)) {
          byPatient.set(cf, {
            totalHours: 0,
            codpresHours: {},
            parent: presence.matchedSPR1!,
            hasValutazione: false,
          });
        }
        const agg = byPatient.get(cf)!;
        agg.totalHours += hours;
        agg.codpresHours[presence.detectedCodpres] = (agg.codpresHours[presence.detectedCodpres] || 0) + hours;

        // Preserva valutazione se presente
        if (presence.hasValutazione && presence.valutazioneDate) {
          agg.hasValutazione = true;
          agg.valutazioneDate = presence.valutazioneDate;
        }
      });

      byPatient.forEach((agg, cf) => {
        // ore_prev = SOMMA di tutte le ore di tutte le prestazioni
        const oreFormatted = agg.totalHours.toFixed(0).padStart(4, "0");

        // codpres = quello con più ore (prevalente)
        const prevalentCodpres = Object.entries(agg.codpresHours)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0][0];

        const updates: Partial<SPR1Record> = {
          ore_prev: oreFormatted,
          codpres: prevalentCodpres,
          setting: "8",
          accesso: "2",
          proroghe: "2",
          durata_prev: "180",
          prof_fisiot: "2",
          prof_psic: "1",
        };

        if (agg.hasValutazione && agg.valutazioneDate) {
          const [year, month, day] = agg.valutazioneDate.split('-');
          updates.data_val = `${day}${month}${year}`;
        }

        const tipoindu = determineTipoindu(cf);
        if (agg.parent.tipoindu !== tipoindu) {
          updates.tipoindu = tipoindu;
        }

        onSPR1Update(cf, updates);
      });
    }

    onSPR2Generated(newSPR2Records);
    toast.success(`Importati ${newSPR2Records.length} trattamenti in SPR2!`);
    setIsOpen(false);
    setParsedData([]);
  };

  // Get badge variant based on classification source
  const getSourceBadge = (source: ClassificationResult['source'], isManual: boolean) => {
    if (isManual) {
      return { variant: 'outline' as const, label: 'Manuale' };
    }
    switch (source) {
      case 'auto':
        return { variant: 'default' as const, label: 'Auto' };
      case 'excel':
        return { variant: 'secondary' as const, label: 'Excel' };
      case 'fallback':
        return { variant: 'outline' as const, label: 'Default' };
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
        <FileUp className="h-4 w-4" />
        Importa Registro PDF
      </Button>
    );
  }

  return (
    <Card className="fixed inset-4 z-50 bg-background shadow-2xl overflow-hidden flex flex-col max-w-5xl mx-auto my-8 border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <CardTitle>Importazione Massiva Presenze</CardTitle>
          {referenceMonth && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {MONTH_NAMES[referenceMonth.month - 1]} {referenceMonth.year}
            </Badge>
          )}
          {skippedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {skippedCount} escluse
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-6 space-y-6">
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
          <Label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
            <FileUp className="h-12 w-12 text-muted-foreground" />
            <span className="text-lg font-medium">Clicca per caricare il PDF</span>
            <span className="text-sm text-muted-foreground">Supporta il formato "Scheda Attività"</span>
          </Label>
          <Input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isProcessing}
          />
        </div>

        {isProcessing && <div className="text-center">Analisi in corso...</div>}

        {parsedData.length > 0 && (
          <ScrollArea className="h-[350px] border rounded-md">
            <div className="p-4 space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div>Paziente</div>
                <div>Periodo / Ore</div>
                <div>Giorni</div>
                <div>Codice Rilevato</div>
                <div>Stato</div>
              </div>
              
              {parsedData.map((p, i) => {
                const sourceBadge = getSourceBadge(p.classificationSource, p.isManuallyEdited);
                
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 items-center p-3 rounded border ${
                      p.matched ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
                    }`}
                  >
                    {/* Patient name and activity */}
                    <div>
                      {p.matched ? (
                        <div className="font-bold">{p.patientName}</div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Input
                            value={p.patientName}
                            onChange={(e) => handleNameEdit(i, e.target.value)}
                            className="h-7 text-sm font-bold px-2 py-0"
                            placeholder="Nome paziente"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 shrink-0"
                            onClick={() => handleRetryMatch(i)}
                            title="Riprova abbinamento"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {p.activityText && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={p.activityText}>
                          {p.activityText}
                        </div>
                      )}
                    </div>
                    
                    {/* Period, hours and calculated tariff */}
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {p.dataini} - {p.datafine}<br />
                      <span>Ore: {p.durata.replace(",", ".")}h</span>
                      {p.hasRemotePresences && (
                        <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1">
                          <Home className="h-2 w-2 mr-0.5" />
                          {p.remoteHours}h remoto
                        </Badge>
                      )}
                      <br />
                      <span className="font-medium text-foreground">
                        €{calculateImporto(p.detectedCodpres, p.remoteHours + p.inPersonHours).importo.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Distinct days count */}
                    <div className="text-center font-medium">
                      {p.numpres}
                    </div>
                    
                    {/* Codpres selector */}
                    <div className="flex items-center gap-2">
                      <Select
                        value={p.detectedCodpres}
                        onValueChange={(value: CodicePrestazioneType) => handleCodpresChange(i, value)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="417.1">417.1 (AC)</SelectItem>
                          <SelectItem value="405.1">405.1 (AA)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant={sourceBadge.variant} className="text-xs">
                        {sourceBadge.label}
                      </Badge>
                    </div>
                    
                    {/* Match status */}
                    <Badge variant={p.matched ? "default" : "secondary"}>
                      {p.matched ? "Abbinato" : "Mancante"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between gap-2">
          <div>
            {parsedData.some(p => !p.matched) && (
              <Button variant="outline" onClick={handleParkUnmatched} className="gap-2 text-amber-600 border-amber-400 hover:bg-amber-50">
                <ParkingCircle className="h-4 w-4" />
                Parcheggia non abbinati ({parsedData.filter(p => !p.matched).length})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onUploadSPR2ToCloud && spr2Records.length > 0 && (
              <Button 
                onClick={onUploadSPR2ToCloud} 
                variant="outline" 
                className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Cloud className="h-4 w-4" />
                Carica {spr2Records.length} SPR2 su Cloud
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleGenerateSPR2} disabled={parsedData.filter((p) => p.matched).length === 0}>
              Conferma e Importa
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
