import { useEffect, useRef, useCallback, useState } from "react";
import { SPR1Record, SPR2Record } from "@/types/spr";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoSaveState {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

interface AutoSaveOptions {
  debounceMs?: number;
  autoSaveIntervalMs?: number;
}

export function useAutoSave(
  spr1Records: SPR1Record[],
  spr2Records: SPR2Record[],
  options: AutoSaveOptions = {}
) {
  const { debounceMs = 30000, autoSaveIntervalMs = 60000 } = options;
  
  const [state, setState] = useState<AutoSaveState>({
    hasUnsavedChanges: false,
    isSaving: false,
    lastSaved: null,
  });
  
  // Track initial load state to avoid marking as "changed" on first load
  const initialLoadRef = useRef(true);
  const previousSpr1Ref = useRef<SPR1Record[]>([]);
  const previousSpr2Ref = useRef<SPR2Record[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Detect changes
  useEffect(() => {
    if (initialLoadRef.current) {
      // First load - just store references, don't mark as changed
      previousSpr1Ref.current = spr1Records;
      previousSpr2Ref.current = spr2Records;
      initialLoadRef.current = false;
      return;
    }
    
    // Compare with previous state
    const spr1Changed = JSON.stringify(spr1Records) !== JSON.stringify(previousSpr1Ref.current);
    const spr2Changed = JSON.stringify(spr2Records) !== JSON.stringify(previousSpr2Ref.current);
    
    if (spr1Changed || spr2Changed) {
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
      previousSpr1Ref.current = spr1Records;
      previousSpr2Ref.current = spr2Records;
    }
  }, [spr1Records, spr2Records]);
  
  // Save function
  const saveToCloud = useCallback(async () => {
    if (!state.hasUnsavedChanges || state.isSaving) return;
    if (spr1Records.length === 0) return; // Nothing to save
    
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      // Upsert SPR1 records
      for (const spr1 of spr1Records) {
        const dbRecord = {
          codusl: spr1.codusl,
          struttura: spr1.struttura,
          data_pic: spr1.data_PIC || null,
          nprat: spr1.nprat || null,
          id_utente: spr1.IDutente || null,
          nome: spr1.Nome || null,
          cognome: spr1.Cognome || null,
          genere: spr1.genere || null,
          datanasc: spr1.datanasc || null,
          setting: spr1.setting || null,
          accesso: spr1.accesso || null,
          codpres: spr1.codpres || null,
          ore_prev: spr1.ore_prev || null,
          impatt: spr1.impatt || null,
          opera: spr1.opera || null,
          // Campi territoriali
          lures: spr1.lures || null,
          regresu: spr1.regresu || null,
          uslresu: spr1.uslresu || null,
          // Campi anagrafici aggiuntivi
          cittu: spr1.cittu || null,
          statciv: spr1.statciv || null,
          titstud: spr1.titstud || null,
          condprof: spr1.condprof || null,
          soggrich: spr1.soggRich || null,
          // Campi clinici
          icd9cm: spr1.ICD9CM || null,
          icd9cm_c: spr1.ICD9CM_c || null,
          proroghe: spr1.proroghe || null,
          durata_prev: spr1.durata_prev || null,
          data_val: spr1.data_val || null,
          // Campi economici
          quoric: spr1.quoric || null,
          imptick: spr1.imptick || null,
        };
        
        // Use existing _dbId if available, otherwise let Supabase generate
        if ((spr1 as any)._dbId) {
          await supabase
            .from('spr1_records')
            .update(dbRecord)
            .eq('id', (spr1 as any)._dbId);
        } else {
          // Insert new record
          const { data, error } = await supabase
            .from('spr1_records')
            .upsert(dbRecord, {
              onConflict: 'codusl,struttura,data_pic,nprat',
            })
            .select()
            .single();
          
          if (!error && data) {
            // Store the new ID
            (spr1 as any)._dbId = data.id;
          }
        }
      }
      
      // Upsert SPR2 records
      for (const spr2 of spr2Records) {
        const dbRecord = {
          codusl: spr2.codusl || null,
          struttura: spr2.struttura || null,
          data_pic: spr2.data_PIC || null,
          nprat: spr2.nprat || null,
          record: spr2.record || null,
          dataini: spr2.dataini || null,
          datafine: spr2.datafine || null,
          numpres: spr2.numpres ? parseInt(spr2.numpres) : null,
          durata: spr2.durata ? parseFloat(String(spr2.durata).replace(',', '.')) : null,
          tariffa: spr2.tariffa ? parseFloat(String(spr2.tariffa).replace(',', '.')) : null,
          impres: spr2.impres ? parseFloat(String(spr2.impres).replace(',', '.')) : null,
          compensa: (spr2.compensa && spr2.compensa.trim() !== "" && spr2.compensa !== "N") ? spr2.compensa : null,
          codpres: spr2.codpres || null,
          is_remote: spr2.is_remote || false,
        };
        
        if ((spr2 as any)._dbId) {
          await supabase
            .from('spr2_records')
            .update(dbRecord)
            .eq('id', (spr2 as any)._dbId);
        } else {
          // Find parent SPR1 ID
          const parentSpr1 = spr1Records.find(s => 
            s.nprat === spr2.nprat && 
            s.codusl === spr2.codusl && 
            s.struttura === spr2.struttura
          );
          
          const { data, error } = await supabase
            .from('spr2_records')
            .insert({
              ...dbRecord,
              spr1_id: (parentSpr1 as any)?._dbId || null,
            })
            .select()
            .single();
          
          if (!error && data) {
            (spr2 as any)._dbId = data.id;
          }
        }
      }
      
      setState({
        hasUnsavedChanges: false,
        isSaving: false,
        lastSaved: new Date(),
      });
      
      toast.success("Modifiche salvate automaticamente", { duration: 2000 });
    } catch (error) {
      console.error("Auto-save error:", error);
      setState(prev => ({ ...prev, isSaving: false }));
      toast.error("Errore durante il salvataggio automatico");
    }
  }, [spr1Records, spr2Records, state.hasUnsavedChanges, state.isSaving]);
  
  // Debounced auto-save
  useEffect(() => {
    if (!state.hasUnsavedChanges) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveToCloud();
    }, debounceMs);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.hasUnsavedChanges, debounceMs, saveToCloud]);
  
  // Periodic auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.hasUnsavedChanges && !state.isSaving) {
        saveToCloud();
      }
    }, autoSaveIntervalMs);
    
    return () => clearInterval(interval);
  }, [autoSaveIntervalMs, state.hasUnsavedChanges, state.isSaving, saveToCloud]);
  
  // Beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "Hai modifiche non salvate. Sei sicuro di voler uscire?";
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);
  
  // Manual save function
  const saveNow = useCallback(() => {
    saveToCloud();
  }, [saveToCloud]);
  
  // Mark as saved (for use after cloud load)
  const markAsSaved = useCallback(() => {
    setState(prev => ({ ...prev, hasUnsavedChanges: false, lastSaved: new Date() }));
  }, []);
  
  // Reset initial state (for use after cloud load)
  const resetTracking = useCallback(() => {
    initialLoadRef.current = true;
    setState({ hasUnsavedChanges: false, isSaving: false, lastSaved: null });
  }, []);
  
  return {
    ...state,
    saveNow,
    markAsSaved,
    resetTracking,
  };
}
