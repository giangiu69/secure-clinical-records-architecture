import { Users, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMemo, memo } from "react";

export interface DraftPatient {
  codiceFiscale: string;
  cognome: string;
  nome: string;
  ore_prev: string;
  impatt: string;
  source: 'excel' | 'pdf' | 'merged';
  spr2Count: number;
}

interface DraftsSidebarProps {
  drafts: DraftPatient[];
  selectedCF: string | null;
  onSelectDraft: (cf: string) => void;
}

const getSourceIcon = (source: DraftPatient['source']) => {
  switch (source) {
    case 'excel': return <FileSpreadsheet className="h-3 w-3" />;
    case 'pdf': return <FileText className="h-3 w-3" />;
    case 'merged': return <CheckCircle2 className="h-3 w-3" />;
  }
};

const getSourceColor = (source: DraftPatient['source']) => {
  switch (source) {
    case 'excel': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pdf': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'merged': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  }
};

// Componente singola card memoizzato
const DraftCard = memo(function DraftCard({ 
  draft, 
  isSelected, 
  onSelect 
}: { 
  draft: DraftPatient; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected 
          ? "ring-2 ring-primary bg-primary/5" 
          : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">
              {draft.cognome} {draft.nome}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {draft.codiceFiscale}
            </p>
          </div>
          <Badge 
            variant="secondary" 
            className={cn("text-xs flex items-center gap-1 shrink-0", getSourceColor(draft.source))}
          >
            {getSourceIcon(draft.source)}
            {draft.source === 'merged' ? 'Completo' : draft.source.toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">
              Ore: <span className="font-medium text-foreground">{draft.ore_prev || '—'}</span>
            </span>
            <span className="text-muted-foreground">
              SPR2: <span className="font-medium text-foreground">{draft.spr2Count}</span>
            </span>
          </div>
          <span className="font-semibold text-green-600 dark:text-green-400">
            €{draft.impatt || '0,00'}
          </span>
        </div>
      </div>
    </Card>
  );
});

function DraftsSidebar({ drafts, selectedCF, onSelectDraft }: DraftsSidebarProps) {
  // Memoizza i calcoli dei totali
  const { totalOre, totalImporto } = useMemo(() => {
    const ore = drafts.reduce((sum, d) => sum + (parseInt(d.ore_prev) || 0), 0);
    const importo = drafts.reduce((sum, d) => {
      const val = parseFloat((d.impatt || '0').replace(',', '.'));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    return { totalOre: ore, totalImporto: importo.toFixed(2).replace('.', ',') };
  }, [drafts]);

  if (drafts.length === 0) return null;

  return (
    <aside className="w-72 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b bg-background/50">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Bozze Pratiche ({drafts.length})
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Clicca per visualizzare i dettagli
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.codiceFiscale}
              draft={draft}
              isSelected={selectedCF === draft.codiceFiscale}
              onSelect={() => onSelectDraft(draft.codiceFiscale)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Summary Footer */}
      <div className="p-3 border-t bg-background/50 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Totale Ore:</span>
          <span className="font-medium text-foreground">
            {totalOre}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Totale Importo:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            €{totalImporto}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default memo(DraftsSidebar);
