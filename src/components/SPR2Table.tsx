import { SPR2Record, RECORD_TYPE_OPTIONS, SPR1Record } from "@/types/spr";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, Users } from "lucide-react";
import { generateSPR2File, downloadTxtFile } from "@/lib/txtGenerator";
import { toast } from "sonner";
import SPR2RecordCard from "./SPR2RecordCard";
import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { staggerDataPicByCodpres } from "@/lib/spr2-stagger";
import { splitSPR2ByCodpres } from "@/lib/spr2-split-codpres";

interface SPR2TableProps {
  records: SPR2Record[];
  onRecordsChange: (records: SPR2Record[]) => void;
  spr1Records: SPR1Record[];
}

export default function SPR2Table({ records, onRecordsChange, spr1Records }: SPR2TableProps) {
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [selectedRecordType, setSelectedRecordType] = useState<string>("3");

  const addRecord = useCallback((type: string, spr1: SPR1Record | null) => {
    const newRecord: SPR2Record = {
      record: type,
      codusl: spr1?.codusl || "",
      struttura: spr1?.struttura || "",
      data_PIC: spr1?.data_PIC || "",
      nprat: spr1?.nprat || "",
      compensa: "1", // Default: Prestazione Compensabile
      _spr1Id: spr1?._dbId, // Link al record SPR1 per associazione
    };
    
    onRecordsChange([...records, newRecord]);
    toast.success(`Record SPR2 aggiunto${spr1 ? ` per ${spr1.Cognome} ${spr1.Nome}` : ''}`);
  }, [records, onRecordsChange]);

  const handleAddRecordClick = useCallback((type: string) => {
    if (spr1Records.length === 0) {
      // Nessun paziente, crea record vuoto
      addRecord(type, null);
    } else if (spr1Records.length === 1) {
      // Un solo paziente, usa quello
      addRecord(type, spr1Records[0]);
    } else {
      // Più pazienti, mostra selettore
      setSelectedRecordType(type);
      setShowPatientSelector(true);
    }
  }, [spr1Records, addRecord]);

  const handlePatientSelect = useCallback((spr1: SPR1Record) => {
    addRecord(selectedRecordType, spr1);
    setShowPatientSelector(false);
  }, [selectedRecordType, addRecord]);

  const removeRecord = useCallback((index: number) => {
    onRecordsChange(records.filter((_, i) => i !== index));
  }, [records, onRecordsChange]);

  const updateRecord = useCallback((index: number, field: keyof SPR2Record, value: string) => {
    onRecordsChange(records.map((r, i) => 
      i === index ? { ...r, [field]: value } : r
    ));
  }, [records, onRecordsChange]);

  const exportToTxt = () => {
    if (records.length === 0) {
      toast.error("Nessun record da esportare");
      return;
    }

    // SINCRONIZZAZIONE FORZATA: Aggiorna codusl/struttura/nprat da SPR1.
    // NOTA: data_PIC NON viene più sovrascritta qui — verrà ricalcolata sotto
    // tramite staggerDataPicByCodpres per gestire codpres multipli (workaround GAUSS).
    const syncedRecords = records.map(spr2Record => {
      const linkedSPR1 = spr1Records.find(
        spr1 => spr1.nprat === spr2Record.nprat
      ) || spr1Records.find(
        spr1 => spr1._dbId === spr2Record._spr1Id
      );
      
      if (linkedSPR1) {
        return {
          ...spr2Record,
          codusl: linkedSPR1.codusl,
          struttura: linkedSPR1.struttura,
          nprat: linkedSPR1.nprat,
          _spr1Id: linkedSPR1._dbId || spr2Record._spr1Id,
        };
      }
      return spr2Record;
    });

    // Split record SPR2 con codpres concatenato (es. "405.1;417.1") in record singoli
    const split = splitSPR2ByCodpres(syncedRecords);
    // Stagger data_PIC: per pazienti con codpres multipli (es. 405.1 + 417.1)
    // GAUSS rifiuta la chiave duplicata, quindi sfalsiamo le date di 1 giorno per codpres.
    const staggered = staggerDataPicByCodpres(split, spr1Records);

    const txtContent = generateSPR2File(staggered);
    downloadTxtFile(txtContent, "SPR2.txt");
    toast.success("File SPR2.txt generato (campi chiave sincronizzati; data_PIC sfalsata per codpres multipli)");
  };

  // Trova il paziente SPR1 collegato a un record SPR2
  const findLinkedSPR1 = (record: SPR2Record): SPR1Record | null => {
    return spr1Records.find(
      spr1 => spr1.nprat === record.nprat
    ) || spr1Records.find(
      spr1 => spr1._dbId === record._spr1Id
    ) || spr1Records.find(
      spr1 => spr1.nprat === record.nprat && 
              spr1.data_PIC === record.data_PIC &&
              spr1.codusl === record.codusl
    ) || (spr1Records.length === 1 ? spr1Records[0] : null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Gestione SPR2</h2>
        <div className="flex gap-2">
          <Select onValueChange={(value) => handleAddRecordClick(value)}>
            <SelectTrigger className="w-64 bg-background">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>Aggiungi Record</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {RECORD_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToTxt} variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            Esporta TXT
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card">
          <p className="text-muted-foreground mb-4">
            Nessun record presente. Seleziona il tipo di record da aggiungere dal menu a tendina.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record, index) => {
            const linkedSPR1 = findLinkedSPR1(record);
            const parentCF = linkedSPR1?.IDutente || "";
            
            return (
              <SPR2RecordCard
                key={index}
                record={record}
                index={index}
                onUpdate={updateRecord}
                onRemove={removeRecord}
                parentCF={parentCF}
              />
            );
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground mt-6">
        📝 I campi intestazione (Codice USL, Struttura, Data PIC, N° Pratica) vengono pre-compilati dai dati SPR1 se disponibili. I campi contrassegnati con * sono obbligatori.
      </p>

      {/* Dialog per selezionare il paziente */}
      <Dialog open={showPatientSelector} onOpenChange={setShowPatientSelector}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seleziona Paziente
            </DialogTitle>
            <DialogDescription>
              Seleziona a quale paziente associare il nuovo record {RECORD_TYPE_OPTIONS.find(o => o.value === selectedRecordType)?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {spr1Records.map((spr1, idx) => (
              <button
                key={spr1._dbId || idx}
                onClick={() => handlePatientSelect(spr1)}
                className="w-full p-3 text-left border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">
                  {spr1.Cognome} {spr1.Nome}
                </div>
                <div className="text-sm text-muted-foreground">
                  CF: {spr1.IDutente} | N° Pratica: {spr1.nprat}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
