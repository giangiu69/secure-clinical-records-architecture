/**
 * Financial Utilities - Robust mathematical operations for SPR records
 * Prevents floating-point errors and ensures precise currency calculations
 */

/**
 * Financial rounding with IEEE 754 floating-point error prevention
 * Uses epsilon offset to avoid JavaScript rounding issues
 */
export function roundFinancial(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Parse a currency string (with comma or dot separator) to float
 * Returns undefined if invalid
 */
export function parseCurrency(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined;
  // Handle numbers directly (e.g. from Supabase DB which returns numeric types)
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  if (value.trim() === "") return undefined;
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Format a number as currency string with comma separator
 * Returns undefined if input is undefined/invalid
 */
export function formatCurrency(value: number | undefined): string | undefined {
  if (value === undefined || value === null || isNaN(value)) return undefined;
  return value.toFixed(2).replace(".", ",");
}

/**
 * Calculate impres (Amount) with NULL-safe logic
 * Formula: Round((Tariffa * NumPres), 2)
 * Returns undefined if either input is NULL/undefined/empty/zero
 */
export function calculateImpres(
  tariffa: string | number | undefined,
  numpres: string | number | undefined
): string | undefined {
  // NULL safety: if any input is missing or zero, return undefined (NOT "0,00")
  if (tariffa === undefined || tariffa === null || numpres === undefined || numpres === null) return undefined;
  const tariffaStr = String(tariffa).trim();
  const numpresStr = String(numpres).trim();
  if (tariffaStr === "" || numpresStr === "") return undefined;

  const tariffaNum = parseCurrency(tariffa);
  const numpresNum = parseInt(String(numpres), 10);

  // Invalid or zero inputs -> undefined
  if (tariffaNum === undefined || isNaN(numpresNum) || numpresNum <= 0 || tariffaNum === 0) {
    return undefined;
  }

  // Robust financial calculation
  const result = roundFinancial(tariffaNum * numpresNum, 2);
  return formatCurrency(result);
}

/**
 * Validate mathematical consistency between calculated and imported values
 * Used to detect PDF parsing errors or manual entry mistakes
 */
export interface MathValidationResult {
  isValid: boolean;
  message?: string;
  calculated?: string;
  difference?: number;
}

export function validateMathConsistency(
  tariffa: string | undefined,
  numpres: string | undefined,
  importoFromPDF: string | undefined,
  tolerance: number = 0.01
): MathValidationResult {
  const calculated = calculateImpres(tariffa, numpres);

  // If calculated is undefined, no validation needed
  if (!calculated) {
    return { isValid: true, calculated };
  }

  // If no PDF value to compare, skip validation
  if (!importoFromPDF || importoFromPDF.trim() === "") {
    return { isValid: true, calculated };
  }

  const calcNum = parseCurrency(calculated);
  const pdfNum = parseCurrency(importoFromPDF);

  if (calcNum === undefined || pdfNum === undefined) {
    return { isValid: true, calculated };
  }

  const difference = Math.abs(calcNum - pdfNum);

  if (difference > tolerance) {
    return {
      isValid: false,
      message: `Errore Matematico: Calcolato=${calculated}€, PDF=${importoFromPDF}€ (diff: ${difference.toFixed(2)}€)`,
      calculated,
      difference,
    };
  }

  return { isValid: true, calculated, difference };
}

/**
 * Calculate total impatt for SPR1 based on linked SPR2 records
 * Formula: Sum(impres) - imptick - quoric
 * Returns 0 if result is negative
 */
export function calculateImpatt(
  spr2Impres: (string | undefined)[],
  imptick: string | undefined,
  quoric: string | undefined
): string {
  const totalImpres = spr2Impres.reduce((sum, impres) => {
    const value = parseCurrency(impres);
    return sum + (value || 0);
  }, 0);

  const imptickNum = parseCurrency(imptick) || 0;
  const quoricNum = parseCurrency(quoric) || 0;

  const result = Math.max(0, totalImpres - imptickNum - quoricNum);
  return formatCurrency(roundFinancial(result, 2)) || "0,00";
}

/**
 * Check mathematical consistency between tariffa, numpres, and impres
 * Formula: impres should equal tariffa * numpres (with €0.01 tolerance)
 */
export interface MathConsistencyResult {
  isConsistent: boolean;
  expectedImpres: string | undefined;
  actualImpres: string | undefined;
  difference: number;
  message?: string;
}

export function checkMathConsistency(
  tariffa: string | undefined,
  numpres: string | undefined,
  impres: string | undefined,
  tolerance: number = 0.01
): MathConsistencyResult {
  // Calculate expected impres
  const expectedImpres = calculateImpres(tariffa, numpres);
  
  // If no calculation possible, consider consistent
  if (!expectedImpres) {
    return {
      isConsistent: true,
      expectedImpres: undefined,
      actualImpres: impres,
      difference: 0,
    };
  }
  
  // If no actual impres, inconsistent
  if (!impres || impres.trim() === "") {
    return {
      isConsistent: false,
      expectedImpres,
      actualImpres: undefined,
      difference: parseCurrency(expectedImpres) || 0,
      message: `Impres mancante. Atteso: ${expectedImpres}€`,
    };
  }
  
  const expectedNum = parseCurrency(expectedImpres);
  const actualNum = parseCurrency(impres);
  
  if (expectedNum === undefined || actualNum === undefined) {
    return {
      isConsistent: true,
      expectedImpres,
      actualImpres: impres,
      difference: 0,
    };
  }
  
  const difference = Math.abs(expectedNum - actualNum);
  const isConsistent = difference <= tolerance;
  
  return {
    isConsistent,
    expectedImpres,
    actualImpres: impres,
    difference,
    message: isConsistent 
      ? undefined 
      : `Discrepanza: Atteso ${expectedImpres}€, Attuale ${impres}€ (diff: ${difference.toFixed(2)}€)`,
  };
}
