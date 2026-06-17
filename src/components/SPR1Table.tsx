import { SPR1Record, SPR2Record } from "@/types/spr";
import { Button } from "@/components/ui/button";
import { Plus, Download, FileText } from "lucide-react";
import { generateSPR1File, downloadTxtFile } from "@/lib/txtGenerator";
import { cloneSPR1ForMultiCodpres } from "@/lib/spr1-clone-multicodpres";
import { splitSPR2ByCodpres } from "@/lib/spr2-split-codpres";
import { staggerDataPicByCodpres } from "@/lib/spr2-stagger";
import { exampleSPR1 } from "@/lib/exampleData";
import { toast } from "sonner";
import SPR1RecordCard from "@/components/SPR1RecordCard";
import { validateAllSPR1Records, ValidationError } from "@/lib/spr1-validation";
import React, { useCallback } from "react";

interface SPR1TableProps {
  records: SPR1Record[];
  onRecordsChange: (records: SPR1Record[]) => void;
  spr2Records?: SPR2Record[];
}

const emptySPR1Record = (): SPR1Record => ({
  record: "1",
  opera: "",
  codusl: "201", // FISSO: Codice ASL Ass.C.A. (non modificabile)
  struttura: "090MA7", // FISSO: Codice Regionale Ass.C.A. (non modificabile)
  data_PIC: "",
  nprat: "",
  tipoindu: "",
  IDutente: "",
  genere: "",
  datanasc: "",
  respGen: "", // Vuoto di default, si attiva automaticamente se minorenne
  cittu: "",
  lures: "048017", // Default: Firenze (modificabile)
  regresu: "090", // Default: Toscana (modificabile)
  uslresu: "201", // Default: USL Toscana Centro (modificabile)
  statciv: "9", // Default: Non Rilevato (modificabile)
  titstud: "9", // Default: Non Rilevato (modificabile)
  condprof: "9", // Default: Non Rilevato (modificabile)
  soggRich: "R1", // Default: Specialista ambulatoriale (modificabile)
  setting: "8", // Default: Ambulatoriale (modificabile)
  codpres: "405.1", // Default: Prestazioni Ambulatoriali Individuali (modificabile)
  accesso: "2", // Default: Autorizzazione (modificabile)
  ICD9CM: "",
  ICD9CM_c: "",
  proroghe: "",
  percent_SSN: "",
  pianif: "2", // Default: No (modificabile)
  data_val: "",
  care_giver: "2", // Default: No (modificabile)
  IntPRIPAI_1: "",
  IntPRIPAI_2: "",
  IntPRIPAI_3: "",
  IntPRIPAI_4: "",
  IntPRIPAI_5: "",
  IntPRIPAI_6: "",
  scalaDis_1: "",
  scalaDis_2: "",
  scalaDis_3: "",
  scalaDis_4: "",
  scalaDis_5: "",
  scalaDis_6: "",
  disIngr_1: "",
  disIngr_2: "",
  disIngr_3: "",
  disIngr_4: "",
  disIngr_5: "",
  disIngr_6: "",
  vi_stabclin: "9", // Default: Dato Mancante (modificabile)
  vi_vitaq: "9", // Default: Dato Mancante (modificabile)
  vi_mob: "9", // Default: Dato Mancante (modificabile)
  vi_cogn: "9", // Default: Dato Mancante (modificabile)
  vi_comp: "9", // Default: Dato Mancante (modificabile)
  vi_comu: "9", // Default: Dato Mancante (modificabile)
  vi_sensor: "9", // Default: Dato Mancante (modificabile)
  vi_bisogni: "9", // Default: Dato Mancante (modificabile)
  vi_supsoc: "9", // Default: Dato Mancante (modificabile)
  protesi: "2", // Default: No (modificabile)
  durata_prev: "",
  ore_prev: "",
  prof_MMGPLS: "2", // Default: No (modificabile)
  prof_spec: "2", // Default: No (modificabile)
  prof_inf: "2", // Default: No (modificabile)
  prof_oss: "2", // Default: No (modificabile)
  prof_fisiot: "1", // Default: Sì (Team Standard Ass.C.A.)
  prof_log: "1", // Default: Sì (Team Standard Ass.C.A.)
  prof_terap_ev: "2", // Default: No (modificabile)
  prof_occup: "2", // Default: No (modificabile)
  prof_psic: "1", // Default: Sì (Team Standard Ass.C.A.)
  prof_as: "2", // Default: No (modificabile)
  prof_educ: "1", // Default: Sì (Team Standard Ass.C.A.)
  prof_altri_san: "2", // Default: No (modificabile)
  d_prof_altri: "",
  quoric: "",
  imptick: "",
  impatt: "",
  codese: "",
  
  // Campi aggiuntivi
  Cognome: "",
  Nome: "",
  comnasu: "",
  Progetto: "SM",
  Pacchetto: "00",
  Pres_inviante: "0",
  Distr_inviante: "0",
  Evento: "0",
  Quota: "2", // FISSO: Quota Fissa (non modificabile)
  Chiusura: "3",
  Localizzazione: "0",
  Gest_Tetto: "0", // FISSO (non modificabile)
  Num_verbale: "",
  Data_verbale: "",
});

export default function SPR1Table({ records, onRecordsChange, spr2Records }: SPR1TableProps) {
  const [validationErrors, setValidationErrors] = React.useState<Map<number, ValidationError[]>>(new Map());

  const addRecord = useCallback(() => {
    onRecordsChange([...records, emptySPR1Record()]);
  }, [records, onRecordsChange]);

  const loadExample = useCallback(() => {
    // Reset completo e carica esempio
    onRecordsChange([exampleSPR1]);
    toast.success("Esempio caricato: Mario Rossi - Dati validati GAUSS");
  }, [onRecordsChange]);

  const removeRecord = useCallback((index: number) => {
    onRecordsChange(records.filter((_, i) => i !== index));
    setValidationErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(index);
      return newErrors;
    });
  }, [records, onRecordsChange]);

  const updateRecord = useCallback((index: number, field: keyof SPR1Record, value: string) => {
    onRecordsChange(records.map((r, i) => 
      i === index ? { ...r, [field]: value } : r
    ));
    
    // Clear errors for this record when it's updated
    setValidationErrors(prev => {
      if (prev.has(index)) {
        const newErrors = new Map(prev);
        newErrors.delete(index);
        return newErrors;
      }
      return prev;
    });
  }, [records, onRecordsChange]);

  const exportToTxt = async () => {
    if (records.length === 0) {
      toast.error("Nessun record da esportare");
      return;
    }

    // Validazione prima dell'esportazione
    const validationResults = validateAllSPR1Records(records);
    const invalidRecords = validationResults.filter(result => !result.isValid);

    if (invalidRecords.length > 0) {
      // Memorizza gli errori per mostrarli nei record
      const errorsMap = new Map<number, ValidationError[]>();
      invalidRecords.forEach(result => {
        errorsMap.set(result.recordIndex, result.errors);
      });
      setValidationErrors(errorsMap);

      const firstInvalid = invalidRecords[0];
      const errorMessages = firstInvalid.errors.slice(0, 3).map(err => err.message).join(", ");
      const moreErrors = firstInvalid.errors.length > 3 ? ` e altri ${firstInvalid.errors.length - 3}` : "";
      toast.error(
        `Record #${firstInvalid.recordIndex + 1} ha ${firstInvalid.errors.length} errori: ${errorMessages}${moreErrors}`,
        { duration: 6000 }
      );
      
      // Scroll al record con errori
      const element = document.getElementById(`record-card-${firstInvalid.recordIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Clear validation errors if all valid
    setValidationErrors(new Map());
    
    // Passa anche spr2Records per auto-fill data_val dal primo trattamento.
    // Split + Stagger PRIMA della generazione SPR1, così impatt si somma sul nprat
    // corretto di ogni codpres aggiuntivo.
    const splitSPR2 = splitSPR2ByCodpres(spr2Records || []);
    const expandedRecords = cloneSPR1ForMultiCodpres(records, splitSPR2);
    const staggeredSPR2 = staggerDataPicByCodpres(splitSPR2, records);
    const txtContent = await generateSPR1File(expandedRecords, staggeredSPR2);
    downloadTxtFile(txtContent, "SPR1.txt");
    toast.success("File SPR1.txt generato con successo");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Gestione SPR1</h2>
        <div className="flex gap-2">
          <Button onClick={addRecord} className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi Record
          </Button>
          <Button onClick={loadExample} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Carica Esempio
          </Button>
          <Button onClick={exportToTxt} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            Esporta TXT
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card">
          <p className="text-muted-foreground mb-4">
            Nessun record presente. Clicca "Aggiungi Record" per iniziare.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
      {records.map((record, index) => (
        <div key={index} id={`record-card-${index}`}>
          <SPR1RecordCard
            record={record}
            index={index}
            onUpdate={updateRecord}
            onRemove={removeRecord}
            errors={validationErrors.get(index)}
          />
        </div>
      ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-6">
        📝 Tutti i campi del tracciato SPR1 sono disponibili. I campi contrassegnati con * sono obbligatori.
      </p>
    </div>
  );
}
