import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  initDizionari, 
  searchComuniByNome, 
  findComuneByIstat, 
  findAslByComune,
  ComuneRecord 
} from "@/lib/dizionari-territoriali";
import { Loader2 } from "lucide-react";

interface ComuneAutocompleteProps {
  value: string; // Codice ISTAT (6 cifre)
  onChange: (codiceIstat: string) => void;
  onComuneSelect?: (comune: ComuneRecord, aslCode: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  referenceDate?: Date; // Data di riferimento per validità temporale
}

export function ComuneAutocomplete({
  value,
  onChange,
  onComuneSelect,
  placeholder = "Cerca comune...",
  disabled = false,
  hasError = false,
  id,
  referenceDate,
}: ComuneAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [suggestions, setSuggestions] = useState<ComuneRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef(false);

  // Carica i dizionari all'avvio
  useEffect(() => {
    initDizionari().then(() => setInitialized(true));
  }, []);

  // Aggiorna il display value quando cambia il valore dall'esterno
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (value && initialized) {
      const comune = findComuneByIstat(value, referenceDate);
      if (comune) {
        setDisplayValue(`${comune.nome} (${value})`);
      } else {
        setDisplayValue(value);
      }
    } else if (!value) {
      setDisplayValue("");
    }
  }, [value, initialized, referenceDate]);

  // Debounced search
  const searchComuni = useCallback(
    async (term: string) => {
      if (!initialized || term.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // Se è un codice ISTAT (solo numeri, 6 cifre)
        if (/^\d{1,6}$/.test(term)) {
          const comune = findComuneByIstat(term.padStart(6, '0'), referenceDate);
          if (comune) {
            setSuggestions([comune]);
          } else {
            setSuggestions([]);
          }
        } else {
          // Cerca per nome
          const results = searchComuniByNome(term, referenceDate, 15);
          setSuggestions(results);
        }
      } finally {
        setLoading(false);
      }
    },
    [initialized, referenceDate]
  );

  // Effetto per la ricerca con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchComuni(searchTerm);
      } else {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, searchComuni]);

  const handleSelect = (comune: ComuneRecord) => {
    isSelectingRef.current = true;
    setDisplayValue(`${comune.nome} (${comune.codiceIstat})`);
    setSearchTerm("");
    onChange(comune.codiceIstat);
    setOpen(false);

    // Trova la ASL associata al comune
    const aslCode = findAslByComune(comune.codiceIstat, referenceDate);
    
    // Callback con comune e ASL
    if (onComuneSelect) {
      onComuneSelect(comune, aslCode);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    setSearchTerm(newValue);
    
    // Se l'utente sta digitando un codice ISTAT diretto
    if (/^\d{6}$/.test(newValue)) {
      onChange(newValue);
    }
    
    if (!open && newValue.length >= 2) {
      setOpen(true);
    }
  };

  const handleBlur = () => {
    // Se c'è un valore ma non è stato selezionato un comune,
    // prova a validare come codice ISTAT
    setTimeout(() => {
      if (displayValue && !value) {
        const cleanValue = displayValue.trim();
        if (/^\d{6}$/.test(cleanValue)) {
          onChange(cleanValue);
        }
      }
    }, 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={() => displayValue.length >= 2 && setOpen(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(hasError && "border-destructive")}
            autoComplete="off"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            {suggestions.length === 0 && searchTerm.length >= 2 && !loading && (
              <CommandEmpty>Nessun comune trovato</CommandEmpty>
            )}
            {suggestions.length > 0 && (
              <CommandGroup heading="Comuni">
                {suggestions.map((comune) => (
                  <CommandItem
                    key={comune.codiceIstat}
                    value={comune.codiceIstat}
                    onSelect={() => handleSelect(comune)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{comune.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        Codice: {comune.codiceIstat} | Regione: {comune.codiceRegione}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
