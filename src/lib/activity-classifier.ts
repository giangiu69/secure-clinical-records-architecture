/**
 * Activity Classifier for PDF Import
 * Determines codpres (417.1 or 405.1) based on activity text patterns
 * 
 * REGOLE CLASSIFICAZIONE:
 * - 417.1 (AC - Ambulatoriale Complessa): supporto psicologico, riabilitazione individuale, valutazione clinica
 * - 405.1 (AA - Ambulatoriale Altro): tutoraggio, psicoeducazione, incontri familiari, supporto familiare/alla famiglia
 */

export type CodicePrestazioneType = '417.1' | '405.1';

export interface ClassificationResult {
  codpres: CodicePrestazioneType;
  source: 'auto' | 'excel' | 'fallback';
  confidence: 'high' | 'low';
}

// Patterns for 405.1 (Prestazione Semplice - AA)
// PRIORITY 1: Check FIRST to avoid "supporto familiare" matching 417.1
const SIMPLE_PATTERNS: RegExp[] = [
  /tutoragg/i,
  /intervent[io]\s+(con\s+)?psicoeducat/i,
  /psicoed/i,
  /incontri?\s+(con\s+)?familiari/i,
  /riunion/i,
  // FIX: "supporto familiare/alla famiglia" = 405.1, NON 417.1
  /supporto\s+(alla\s+)?famigli/i,
  /supporto\s+familiare/i,
  /colloqui?\s+(con\s+)?famigli/i,
  /counselling?\s+famigli/i,
  /educativ/i,
  /accompagn/i,
  /laborator/i,
  /gruppo\s+(di\s+)?auto/i,
  /attivit[aà]\s+educativ/i,
  /socializzazion/i,
];

// Patterns for 417.1 (Prestazione Complessa - AC)
// PRIORITY 2: Check AFTER simple patterns
const COMPLEX_PATTERNS: RegExp[] = [
  /supporto\s+psicolog/i,
  /riabilitazione\s+individuale/i,
  /valutazion/i,
  /supporto\s+non\s+tutorat/i,
  /colloquio\s+clinic/i,
  /colloquio\s+psicolog/i,
  /psicoterap/i,
  /riabilitazione\s+cognitiv/i,
  /trattamento\s+individuale/i,
  /visita\s+psichiatr/i,
  /intervento\s+clinic/i,
  // "supporto" generico (senza "famiglia/familiare") = 417.1
  /\bsupporto\b(?!\s+(alla\s+)?famigli)(?!\s+familiare)/i,
];

/**
 * Classifies activity text to determine codpres
 * @returns codpres type or null if no pattern matches
 */
export function classifyActivity(activityText: string): CodicePrestazioneType | null {
  if (!activityText || activityText.trim() === '') return null;
  
  // Priority 1: Check 405.1 (Simple) FIRST — to catch "supporto familiare" before generic "supporto"
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(activityText)) {
      console.log(`[Classifier] "${activityText.substring(0, 60)}" → 405.1 (pattern: ${pattern.source})`);
      return '405.1';
    }
  }
  
  // Priority 2: Check 417.1 (Complex)
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(activityText)) {
      console.log(`[Classifier] "${activityText.substring(0, 60)}" → 417.1 (pattern: ${pattern.source})`);
      return '417.1';
    }
  }
  
  console.log(`[Classifier] ⚠️ Nessun match per: "${activityText.substring(0, 80)}" → fallback`);
  return null; // Ambiguous, use fallback
}

/**
 * Classifies activity with fallback to Excel tipologia or default
 */
export function classifyWithFallback(
  activityText: string | undefined,
  excelTipologia: string | undefined
): ClassificationResult {
  // Try activity classification first
  if (activityText) {
    const detected = classifyActivity(activityText);
    if (detected) {
      return {
        codpres: detected,
        source: 'auto',
        confidence: 'high',
      };
    }
  }
  
  // Fallback: use Excel tipologia if available
  if (excelTipologia) {
    const tipUpper = excelTipologia.toUpperCase();
    if (tipUpper.includes('417.1') || tipUpper.includes('AC') || tipUpper.includes('COMPLESS')) {
      return {
        codpres: '417.1',
        source: 'excel',
        confidence: 'high',
      };
    }
    if (tipUpper.includes('405.1') || tipUpper.includes('AA') || tipUpper.includes('SEMPLIC')) {
      return {
        codpres: '405.1',
        source: 'excel',
        confidence: 'high',
      };
    }
  }
  
  // Ultimate fallback
  return {
    codpres: '405.1',
    source: 'fallback',
    confidence: 'low',
  };
}

/**
 * Get the base tariff for a given codpres
 */
export function getBaseTariffa(codpres: CodicePrestazioneType): number {
  return codpres === '417.1' ? 54.25 : 44.90;
}

/**
 * Validate codpres/tariffa consistency
 * Returns true if consistent, false with details if not
 */
export function validateCodpresTariffa(
  codpres: string | undefined,
  tariffa: number | string | undefined
): { isConsistent: boolean; expectedTariffa: number; actualTariffa: number | undefined; message?: string } {
  if (!codpres || !tariffa) return { isConsistent: true, expectedTariffa: 0, actualTariffa: undefined };

  const actualTariffa = typeof tariffa === 'string' ? parseFloat(tariffa.replace(',', '.')) : tariffa;
  if (isNaN(actualTariffa)) return { isConsistent: true, expectedTariffa: 0, actualTariffa: undefined };

  // Multi-codpres concatenato (es. "405.1;417.1"): consistente se la tariffa corrisponde
  // ad ALMENO uno dei codici. Lo split per codice avviene in export.
  const codes = String(codpres).split(/[;,]/).map(c => c.trim()).filter(Boolean);
  const tariffeByCode: Record<string, number> = { '417.1': 54.25, '405.1': 44.90 };
  const baseTariffa = tariffeByCode[codes[0]] ?? 44.90;

  const isConsistent = codes.some(c => {
    const t = tariffeByCode[c];
    return t !== undefined && Math.abs(actualTariffa - t) < 0.01;
  });

  return {
    isConsistent,
    expectedTariffa: baseTariffa,
    actualTariffa,
    message: isConsistent
      ? undefined
      : `Incoerenza: codpres=${codpres} richiede tariffa ${baseTariffa.toFixed(2)}€ ma trovato ${actualTariffa}€`,
  };
}

/**
 * Get display label for codpres
 */
export function getCodpresLabel(codpres: CodicePrestazioneType): string {
  return codpres === '417.1' ? '417.1 (AC)' : '405.1 (AA)';
}

/**
 * Get source badge color
 */
export function getSourceBadgeVariant(source: ClassificationResult['source']): 'default' | 'secondary' | 'outline' {
  switch (source) {
    case 'auto': return 'default';     // Green - auto-detected
    case 'excel': return 'secondary';  // Yellow - from Excel
    case 'fallback': return 'outline'; // Blue - manual/fallback
  }
}
