/**
 * Mapping deterministico colonna PDF "professionisti_MM-AA.pdf" → codpres GAUSS.
 *
 * Ogni riga del PDF ha esattamente UNA checkbox spuntata in una delle 12 colonne
 * tipologia. Questo mapping converte il nome colonna identificato dall'header
 * del PDF nel codpres ufficiale, oppure ritorna `null` per le colonne da scartare
 * (Coordinamento, Progetto, Riunioni: non generano record SPR2).
 */

export type CodicePrestazioneType = '417.1' | '405.1';

/** Token-keyword unici per riconoscere ogni colonna nell'header OCR (multi-riga). */
export interface ColumnSpec {
  /** Etichetta canonica (per log / UI). */
  label: string;
  /** Codpres mappato; null = colonna da scartare. */
  codpres: CodicePrestazioneType | null;
  /**
   * Keywords (lowercase) per identificare la colonna dai token header OCR.
   * Si usa "all-of": tutti questi token devono comparire vicino (stessa colonna X).
   */
  keywords: string[];
  /** Se true, segna `hasValutazione=true` sull'entry. */
  isValutazione?: boolean;
}

export const COLUMN_SPECS: ColumnSpec[] = [
  { label: 'Supp. Psicolog.',            codpres: '417.1', keywords: ['supp', 'psicolog'] },
  { label: 'Supp. Famig.',               codpres: '405.1', keywords: ['supp', 'famig'] },
  { label: 'Tutoraggio',                 codpres: '405.1', keywords: ['tutoraggio'] },
  { label: 'Coordinamento',              codpres: null,    keywords: ['coordinamento'] },
  { label: 'Progetto',                   codpres: null,    keywords: ['progetto'] },
  { label: 'Riunioni',                   codpres: null,    keywords: ['riunioni'] },
  { label: 'Valutazioni',                codpres: '417.1', keywords: ['valutazioni'], isValutazione: true },
  { label: 'Interventi psicoeducativi',  codpres: '405.1', keywords: ['psicoeducativi'] },
  { label: 'Supp. Psicolog. VdT',        codpres: '417.1', keywords: ['vdt'] },
  { label: 'Supp. Psicolog. non tutorati', codpres: '417.1', keywords: ['tutorati'] },
  { label: 'Incontri con i familiari',   codpres: '405.1', keywords: ['incontri', 'familiari'] },
  { label: 'Riabilitazione individuale', codpres: '417.1', keywords: ['riabilitazione'] },
];

/** Match: ritorna ColumnSpec se il testo cumulato dell'header colonna contiene tutte le keywords. */
export function matchColumnSpec(headerText: string): ColumnSpec | null {
  const t = headerText.toLowerCase();
  // Priorità: VdT prima di "tutorati" generico (VdT è più specifico)
  const ordered = [
    COLUMN_SPECS.find(c => c.label === 'Supp. Psicolog. VdT')!,
    ...COLUMN_SPECS.filter(c => c.label !== 'Supp. Psicolog. VdT'),
  ];
  for (const spec of ordered) {
    if (spec.keywords.every(k => t.includes(k))) return spec;
  }
  return null;
}
