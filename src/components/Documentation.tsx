import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileText, Table as TableIcon, CheckCircle2, BookOpen } from "lucide-react";
import { SPR1FieldsTable } from "./SPR1FieldsTable";
import SPR2FieldsTable from "./SPR2FieldsTable";
export default function Documentation() {
  return <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          SPR Manager - Gestione Flussi SPR1 e SPR2 Regione Toscana
        </h1>
        <p className="text-lg text-muted-foreground">
          Manuale Operativo per gli Operatori - Guida Passo-Passo
        </p>
      </div>

      {/* 1. SCOPO DELLA GUIDA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            1. Scopo della Guida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Che cos'è il flusso SPR:</strong> Il flusso SPR (Schede di Prestazione Riabilitativa) è il sistema informativo regionale della Toscana per la rilevazione delle attività di riabilitazione territoriale. Serve a monitorare e rendicontare i percorsi riabilitativi erogati dalle strutture sanitarie accreditate.
          </p>
          <p>
            <strong>SPR1 (Anagrafica e Presa in Carico):</strong> Contiene i dati anagrafici del paziente, le informazioni sulla presa in carico, la valutazione clinica iniziale, i professionisti coinvolti e i dati economici complessivi del ciclo riabilitativo.
          </p>
          <p>
            <strong>SPR2 (Dettaglio Ciclo Riabilitativo):</strong> Contiene i dettagli operativi del percorso riabilitativo, suddivisi in quattro tipi di record:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Tipo 3 - Trattamento:</strong> Registra le presenze, le date di erogazione, le tariffe e gli importi.</li>
            <li><strong>Tipo 4 - Rivalutazione/Valutazione Finale:</strong> Documenta le rivalutazioni intermedie e la valutazione conclusiva.</li>
            <li><strong>Tipo 5 - Sospensione:</strong> Registra eventuali interruzioni temporanee del percorso.</li>
            <li><strong>Tipo 6 - Conclusione:</strong> Chiude il ciclo riabilitativo con la data di fine e il motivo di dimissione.</li>
          </ul>
          <p>
            <strong>SPR Manager:</strong> Questa applicazione aiuta gli operatori a compilare correttamente i dati SPR1 e SPR2, effettua controlli automatici di coerenza e genera i file TXT nel formato richiesto dal sistema regionale GAUSS per il caricamento e la validazione.
          </p>
        </CardContent>
      </Card>

      {/* 2. PANORAMICA DELL'APP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-primary" />
            2. Panoramica dell'Applicazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Interfaccia Principale</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Tab SPR1 (Anagrafica):</strong> Permette di inserire e modificare i dati anagrafici del paziente, i dati di presa in carico, le valutazioni cliniche iniziali e i dati economici complessivi. Ogni paziente corrisponde a un record SPR1.
              </li>
              <li>
                <strong>Tab SPR2 (Trattamenti):</strong> Permette di gestire tutti i record di dettaglio del ciclo riabilitativo (trattamenti, rivalutazioni, sospensioni, conclusione). Ogni record SPR2 è collegato a un record SPR1 tramite la chiave composta (Codice USL + Struttura + Data PIC + Numero Pratica).
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Pulsanti Principali</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Carica Esempio:</strong> Carica dati di esempio per familiarizzare con l'applicazione e testare l'export.
              </li>
              <li>Importa Registro PDF: Apre il modulo di importazione automatica delle presenze da file PDF (Scheda Attività). L'app riconosce le presenze e genera automaticamente i record SPR2 di tipo 3. Importa Registro PDF: Apre il modulo di importazione automatica delle presenze da file PDF (Scheda Attività). L'app riconosce le presenze e genera automaticamente i record SPR2 di tipo 3. 
Importa Registro PDF: Apre il modulo di importazione automatica delle presenze da file PDF (Scheda Attività). L'app riconosce le presenze e genera automaticamente i record SPR2 di tipo 3.<strong>Importa Registro PDF:</strong> Apre il modulo di importazione automatica delle presenze da file PDF (Scheda Attività). L'app riconosce le presenze e genera automaticamente i record SPR2 di tipo 3.
              </li>
              <li>
                <strong>Esporta Flussi GAUSS:</strong> Genera i file SPR1.txt e SPR2.txt nel formato richiesto da GAUSS, dopo aver effettuato tutti i controlli di validazione.
              </li>
              <li>
                <strong>Nuova Pratica:</strong> Cancella tutti i dati presenti in memoria e permette di iniziare una nuova compilazione da zero.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 3. FLUSSO DI LAVORO CONSIGLIATO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            3. Flusso di Lavoro Consigliato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Importare il file Excel delle prestazioni:</strong> Utilizzare il pulsante "Importa Excel" per caricare il file "Richiesta Prestazioni". L'app estrarrà automaticamente i Codici Fiscali, le ore erogate (417.1/405.1) e calcolerà gli importi per ogni paziente.</li>
            <li><strong>Importare il PDF delle presenze (opzionale):</strong> Utilizzare "Importa Registro PDF" per integrare i dati anagrafici (Cognome, Nome, data nascita). I dati vengono unificati automaticamente tramite il Codice Fiscale.</li>
            <li><strong>Verificare i dati nella sidebar "Bozze Pratiche":</strong> Controllare che ogni paziente abbia i dati corretti (ore, importi, fonte dati indicata dal badge Excel/PDF/Merged).</li>
            <li><strong>Completare i dati SPR1 mancanti:</strong> Nel Tab SPR1, verificare e completare i campi non importati automaticamente (scala disabilità, valutazioni cliniche, professionisti coinvolti).</li>
            <li><strong>Verificare la compilazione automatica geografica:</strong> Il campo "Comune Residenza" offre autocomplete con compilazione automatica di Regione e USL Residenza dai dizionari territoriali.</li>
            <li><strong>Verificare i record SPR2 di tipo 3 (Trattamento):</strong> Nel Tab SPR2, verificare dataini, datafine, numpres, tariffa e importo per ogni record generato dall'importazione.</li>
            <li><strong>Aggiungere record SPR2 aggiuntivi:</strong> Inserire record di tipo 4 (Rivalutazione), tipo 5 (Sospensione) o tipo 6 (Conclusione) secondo necessità.</li>
            <li><strong>Controllare la coerenza economica:</strong> Verificare che l'importo totale (impatt) in SPR1 corrisponda alla somma degli importi dei trattamenti (impres) in SPR2.</li>
            <li><strong>Esportare i file TXT:</strong> Cliccare su "Esporta Flussi GAUSS", verificare l'esito dei controlli automatici e scaricare i file SPR1.txt e SPR2.txt.</li>
          </ol>
        </CardContent>
      </Card>

      {/* 4. COMPILAZIONE SPR1 PASSO-PASSO */}
      <Card>
        <CardHeader>
          <CardTitle>4. Compilazione SPR1 Passo-Passo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {/* 4.1 Dati chiave di testata */}
          <div>
            <h3 className="font-semibold text-base mb-3">4.1 Dati Chiave di Testata</h3>
            <div className="space-y-3">
              <div>
                <strong>codusl (Codice Azienda Sanitaria):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice identificativo dell'Azienda USL di appartenenza della struttura erogatrice. Reperibile dalla tabella regionale "AZIENDESANITARIE". L'app può pre-compilare questo campo con un valore fisso configurato per la vostra struttura (es. "010" per USL Toscana Centro). Verificare sempre la correttezza del codice.
                </p>
              </div>
              <div>
                <strong>struttura (Presidio/Struttura Erogatrice):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice identificativo della struttura che eroga il servizio riabilitativo. Reperibile dalla tabella regionale "STRUTTUREOPERATIVE SPR" o dalla convenzione con l'USL. L'app può pre-compilare questo campo con il codice della vostra struttura (es. "090MA7" per Ass.C.A.). Campo generalmente non modificabile.
                </p>
              </div>
              <div>
                <strong>data_PIC (Data Presa In Carico):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di inizio del percorso riabilitativo secondo il Piano Riabilitativo Individuale (PRI) o Piano Assistenziale Individuale (PAI). Formato: GG/MM/AAAA. Reperibile dalla cartella clinica o dal documento di presa in carico. Deve precedere la data di inizio del primo trattamento (SPR2 tipo 3).
                </p>
              </div>
              <div>
                <strong>nprat (Numero Pratica):</strong>
                <p className="ml-4 text-muted-foreground">
                  Numero identificativo univoco della pratica riabilitativa. Può essere il codice interno della cartella clinica o un numero progressivo. L'app può applicare automaticamente un prefisso (es. "FA7") al numero inserito. Esempio: se inserite "2025001", il sistema salverà "FA72025001".
                </p>
              </div>
            </div>
          </div>

          {/* 4.2 Dati anagrafici utente */}
          <div>
            <h3 className="font-semibold text-base mb-3">4.2 Dati Anagrafici Utente</h3>
            <div className="space-y-3">
              <div>
                <strong>IDutente (Codice Fiscale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice Fiscale del paziente (16 caratteri alfanumerici). Reperibile dalla tessera sanitaria o dall'anagrafe aziendale. L'app estrae automaticamente da questo campo il genere e la data di nascita. Per pazienti anonimi o senza CF, utilizzare il codice STP o ENI secondo le disposizioni regionali.
                </p>
              </div>
              <div>
                <strong>genere (Genere):</strong>
                <p className="ml-4 text-muted-foreground">
                  Genere del paziente. Valori: 1=Maschio, 2=Femmina. Campo compilato automaticamente dall'app quando si inserisce il Codice Fiscale. Verificare sempre la coerenza.
                </p>
              </div>
              <div>
                <strong>datanasc (Data di Nascita):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di nascita del paziente. Formato: GG/MM/AAAA. Campo compilato automaticamente dall'app quando si inserisce il Codice Fiscale. L'età viene calcolata automaticamente rispetto alla data di presa in carico.
                </p>
              </div>
              <div>
                <strong>respGen (Responsabilità Genitoriale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Campo obbligatorio solo per pazienti minorenni (età inferiore a 18 anni). Indica chi esercita la responsabilità genitoriale. Valori ammessi: 1=Entrambi i genitori, 2=Solo padre, 3=Solo madre, 4=Tutore, 9=Dato mancante. L'app attiva automaticamente questo campo se il paziente è minorenne. Per pazienti maggiorenni, il campo resta vuoto.
                </p>
              </div>
              <div>
                <strong>cittu (Cittadinanza):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice dello Stato di cittadinanza secondo la codifica ISTAT. 100=Italia. Reperibile dalla tabella "STATI" del Ministero dell'Interno. Se il paziente ha cittadinanza non italiana, l'app imposterà automaticamente Regione Residenza e USL Residenza a "999" (estero).
                </p>
              </div>
              <div>
                <strong>lures (Luogo di Residenza):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice ISTAT del comune di residenza (6 caratteri). Reperibile dalla tabella "COMUNI" ISTAT o dall'anagrafe aziendale. Esempio: "048017" per Firenze. L'app può pre-compilare questo campo con un valore tipico della zona (es. Firenze per strutture toscane).
                </p>
              </div>
              <div>
                <strong>regresu (Regione di Residenza):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice della Regione di residenza secondo la codifica ISTAT. "090"=Toscana, "999"=Estero. Reperibile dalla tabella "REGIONI" ISTAT. L'app può pre-compilare questo campo con "090" per pazienti residenti in Toscana. Se diverso da "090" o "999", l'app forza automaticamente il campo "Accesso" a "3" (Extraregionale).
                </p>
              </div>
              <div>
                <strong>uslresu (USL di Residenza):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice USL di residenza del paziente. Reperibile dalla tessera sanitaria o dalla tabella "AZIENDESANITARIE" regionale. L'app può pre-compilare questo campo con un valore tipico (es. "104" per USL Toscana Centro). Se il paziente è residente all'estero, impostare a "999".
                </p>
              </div>
              <div>
                <strong>statciv (Stato Civile):</strong>
                <p className="ml-4 text-muted-foreground">
                  Stato civile del paziente. Valori: 1=Celibe/Nubile, 2=Coniugato/a, 3=Vedovo/a, 4=Divorziato/a, 5=Separato/a, 9=Non rilevato. L'app può pre-compilare questo campo con "9" (dato non rilevato) per velocizzare l'inserimento. Modificare se il dato è disponibile.
                </p>
              </div>
              <div>
                <strong>titstud (Titolo di Studio):</strong>
                <p className="ml-4 text-muted-foreground">
                  Titolo di studio del paziente. Valori: 1=Nessuno, 2=Licenza elementare, 3=Licenza media, 4=Diploma, 5=Laurea, 9=Non rilevato. L'app può pre-compilare questo campo con "9". Modificare se il dato è disponibile nella cartella clinica.
                </p>
              </div>
              <div>
                <strong>condprof (Condizione Professionale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Condizione professionale del paziente. Valori: 1=Occupato, 2=Disoccupato, 3=Studente, 4=Pensionato, 5=Casalinga, 9=Non rilevato. L'app può pre-compilare questo campo con "9". Modificare se il dato è disponibile.
                </p>
              </div>
            </div>
          </div>

          {/* 4.3 Dati di presa in carico e clinici */}
          <div>
            <h3 className="font-semibold text-base mb-3">4.3 Dati di Presa in Carico e Clinici</h3>
            <div className="space-y-3">
              <div>
                <strong>soggRich (Soggetto Richiedente):</strong>
                <p className="ml-4 text-muted-foreground">
                  Identifica chi ha richiesto il percorso riabilitativo. Valori: R1=Specialista ambulatoriale, R2=Medico di Medicina Generale, R3=Paziente/Famiglia, R4=Altro. Reperibile dalla documentazione di invio o dalla cartella clinica. L'app può pre-compilare questo campo con "R1" per strutture che operano prevalentemente su invio specialistico.
                </p>
              </div>
              <div>
                <strong>setting (Setting Assistenziale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Modalità di erogazione del servizio. Valori: 1=Ricovero ospedaliero, 2=Day Hospital, 3=Domiciliare, 4=Residenziale, 5=Semiresidenziale, 8=Ambulatoriale, 9=Altro. L'app può pre-compilare questo campo con "8" (Ambulatoriale) per strutture territoriali. Modificare se necessario.
                </p>
              </div>
              <div>
                <strong>codpres (Codice Prestazione/Intervento):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice del tipo di intervento riabilitativo erogato secondo il catalogo regionale delle prestazioni. Esempio: "405.1" per Prestazioni Ambulatoriali Individuali. Reperibile dalla tabella "PRESTAZIONI RIABILITATIVE" regionale o dal tariffario aziendale. L'app può pre-compilare questo campo con il codice più frequente per la vostra struttura.
                </p>
              </div>
              <div>
                <strong>accesso (Tipo di Accesso):</strong>
                <p className="ml-4 text-muted-foreground">
                  Modalità di accesso al percorso riabilitativo. Valori: 1=Programmato, 2=Con autorizzazione, 3=Extraregionale, 4=Altro. L'app può pre-compilare questo campo con "1" (Programmato). Se il paziente è residente fuori Toscana (regresu diverso da "090" e "999"), l'app forza automaticamente questo campo a "3" (Extraregionale). Se si seleziona "2" (Con autorizzazione), l'app abilita automaticamente il campo "proroghe" (numero proroghe autorizzate).
                </p>
              </div>
              <div>
                <strong>Scale di Disabilità (scalaDis_1 ... scalaDis_6):</strong>
                <p className="ml-4 text-muted-foreground">
                  Scale utilizzate per la valutazione della disabilità all'ingresso nel percorso. Ogni scala ha un codice (2 caratteri) e un punteggio (disIngr_x, 5 caratteri). Esempi: "01"=FIM, "02"=Barthel Index, "03"=WHODAS 2.0. Reperibile dalla tabella regionale "SCALE DI DISABILITA'". È obbligatorio compilare almeno la prima scala (scalaDis_1 e disIngr_1). Le scale 2-6 sono facoltative. L'app fornisce menu a tendina con le scale disponibili e campi numerici per i punteggi. Se la prima scala non è compilata, le altre devono rimanere vuote.
                </p>
              </div>
              <div>
                <strong>Variabili di Valutazione (vi_stabclin, vi_vitaq, vi_mob, vi_cogn, vi_comp, vi_comu, vi_sensor, vi_bisogni, vi_supsoc):</strong>
                <p className="ml-4 text-muted-foreground">
                  Valutazioni cliniche iniziali su vari domini funzionali. Valori: 1=Nessuna compromissione, 2=Compromissione lieve, 3=Compromissione moderata, 4=Compromissione grave, 9=Non rilevato. L'app può pre-compilare questi campi con "9" (non rilevato). Modificare i valori in base alla valutazione clinica documentata nella cartella. Reperire i dati dalla valutazione multidimensionale o dal PRI.
                </p>
              </div>
            </div>
          </div>

          {/* 4.4 Dati professionali e di programma */}
          <div>
            <h3 className="font-semibold text-base mb-3">4.4 Dati Professionali e di Programma</h3>
            <div className="space-y-3">
              <div>
                <strong>durata_prev (Durata Prevista in Giorni):</strong>
                <p className="ml-4 text-muted-foreground">
                  Durata prevista del ciclo riabilitativo espressa in giorni di calendario. Reperibile dal PRI o dal programma riabilitativo. Campo numerico.
                </p>
              </div>
              <div>
                <strong>ore_prev (Ore Previste):</strong>
                <p className="ml-4 text-muted-foreground">
                  Numero totale di ore di trattamento previste per il ciclo riabilitativo. Reperibile dal PRI. Campo numerico.
                </p>
              </div>
              <div>
                <strong>Profili Professionali Coinvolti (prof_fisiot, prof_log, prof_psic, prof_educ, prof_terapocc, prof_inferm, prof_medico, prof_altri_san):</strong>
                <p className="ml-4 text-muted-foreground">
                  Indicano quali figure professionali sono coinvolte nel team riabilitativo. Valori: 1=Sì, 2=No. L'app può pre-compilare i campi più comuni (es. fisioterapista, logopedista, psicologo, educatore) con "1" (Sì) per velocizzare l'inserimento. Modificare in base alla composizione reale del team. Se si seleziona "1" per prof_altri_san (Altri Sanitari), l'app abilita automaticamente il campo "d_prof_altri" dove inserire la data della prima prestazione erogata da questa figura.
                </p>
              </div>
            </div>
          </div>

          {/* 4.5 Campi economici SPR1 */}
          <div>
            <h3 className="font-semibold text-base mb-3">4.5 Campi Economici SPR1</h3>
            <div className="space-y-3">
              <div>
                <strong>quoric (Quota Ricetta):</strong>
                <p className="ml-4 text-muted-foreground">
                  Quota fissa per ricetta prevista dalla normativa regionale. Formato: importo in euro con virgola (es. "15,00"). Se non applicabile, lasciare a "0,00". Reperibile dalle disposizioni aziendali o dalla prescrizione medica. L'app accetta input manuale. Verificare sempre la coerenza con le disposizioni vigenti.
                </p>
              </div>
              <div>
                <strong>imptick (Ticket Complessivo):</strong>
                <p className="ml-4 text-muted-foreground">
                  Importo totale del ticket dovuto dal paziente per l'intero ciclo riabilitativo. Formato: importo in euro con virgola (es. "50,00"). Se il paziente è esente (campo codese compilato), questo campo deve essere "0,00". Reperibile dalla cartella amministrativa o dal gestionale aziendale. L'app accetta input manuale.
                </p>
              </div>
              <div>
                <strong>codese (Codice Esenzione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice di esenzione dal ticket (3 caratteri). Esempi: "E01"=Esenzione per reddito, "C01"=Esenzione per patologia oncologica, "048"=Esenzione per invalidità civile 100%. Reperibile dalla tessera sanitaria del paziente o dalla tabella regionale "ESENZIONI". L'app fornisce menu a tendina con le esenzioni disponibili. Se il campo è compilato, verificare che imptick sia "0,00". Se imptick è maggiore di zero, l'app abilita automaticamente il campo codese.
                </p>
              </div>
              <div>
                <strong>impatt (Importo Totale Attività):</strong>
                <p className="ml-4 text-muted-foreground">
                  Importo netto totale dell'attività riabilitativa per il ciclo. Formula: Somma di tutti gli impres dei record SPR2 di tipo 3 (Trattamento), al netto di ticket e quota ricetta. Formato: importo in euro con virgola (es. "1500,00"). L'app può calcolare automaticamente questo valore sommando gli importi dei trattamenti collegati e sottraendo ticket e quota ricetta. Verificare sempre la coerenza con i dati SPR2 prima dell'export.
                </p>
              </div>
            </div>
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/5 mt-4">
            <FileText className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <p className="font-semibold mb-2">Nota per gli Operatori</p>
              <p className="text-sm">
                Molti campi dell'SPR1 sono pre-compilati dall'applicazione con valori tipici della vostra struttura o con valori "Non rilevato" (codice 9) per velocizzare l'inserimento. È sempre possibile modificare questi valori in base ai dati reali del paziente. Verificare sempre la coerenza tra i dati anagrafici, clinici ed economici prima di procedere all'export.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 5. COMPILAZIONE SPR2 PASSO-PASSO */}
      <Card>
        <CardHeader>
          <CardTitle>5. Compilazione SPR2 Passo-Passo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          {/* 5.1 Struttura generale SPR2 */}
          <div>
            <h3 className="font-semibold text-base mb-3">5.1 Struttura Generale SPR2</h3>
            <p className="mb-3">
              Tutti i record SPR2 condividono una chiave composta che li collega al record SPR1 del paziente:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
              <li><strong>codusl:</strong> Codice USL (ereditato da SPR1)</li>
              <li><strong>struttura:</strong> Codice Struttura (ereditato da SPR1)</li>
              <li><strong>data_PIC:</strong> Data Presa In Carico (ereditata da SPR1)</li>
              <li><strong>nprat:</strong> Numero Pratica (ereditato da SPR1)</li>
              <li><strong>record:</strong> Tipo di record SPR2 (3=Trattamento, 4=Rivalutazione, 5=Sospensione, 6=Conclusione)</li>
            </ul>
            <Alert className="border-primary/50 bg-primary/5 mt-3">
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> L'applicazione pre-compila automaticamente i primi quattro campi (codusl, struttura, data_PIC, nprat) copiandoli dal record SPR1 associato. Questi campi sono in sola lettura e non devono essere modificati manualmente per garantire la coerenza dei dati e il superamento della validazione GAUSS.
              </AlertDescription>
            </Alert>
          </div>

          {/* 5.2 Record = 3 – Trattamento */}
          <div>
            <h3 className="font-semibold text-base mb-3">5.2 Record Tipo 3 - Trattamento</h3>
            <p className="mb-3">
              Il record di tipo 3 documenta i periodi di trattamento riabilitativo effettivamente erogati. Possono esistere più record di tipo 3 per lo stesso paziente se il ciclo è suddiviso in più periodi (es. trattamenti mensili).
            </p>
            <div className="space-y-3">
              <div>
                <strong>dataini (Data Inizio Trattamento):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di inizio del periodo di trattamento. Formato: GG/MM/AAAA. Deve essere successiva o uguale alla data_PIC dell'SPR1. Campo obbligatorio. Reperibile dal registro presenze o dalla cartella clinica.
                </p>
              </div>
              <div>
                <strong>datafine (Data Fine Trattamento):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di fine del periodo di trattamento. Formato: GG/MM/AAAA. Deve essere successiva o uguale a dataini. Campo obbligatorio. Reperibile dal registro presenze.
                </p>
              </div>
              <div>
                <strong>numpres (Numero Presenze):</strong>
                <p className="ml-4 text-muted-foreground">
                  Numero totale di accessi/presenze del paziente nel periodo tra dataini e datafine. Campo numerico obbligatorio. Reperibile dal registro presenze. Se si importa il PDF delle presenze, l'app calcola automaticamente questo valore contando le presenze rilevate. Verificare sempre la coerenza con il registro cartaceo.
                </p>
              </div>
              <div>
                <strong>durata (Durata Media in Minuti):</strong>
                <p className="ml-4 text-muted-foreground">
                  Durata media in minuti di ciascun accesso. Campo numerico facoltativo. Se disponibile, l'app lo importa dal PDF delle presenze. In fase di export, l'app converte questo valore da minuti a ore con un decimale (es. 600 minuti = 10,0 ore).
                </p>
              </div>
              <div>
                <strong>tariffa (Tariffa Unitaria):</strong>
                <p className="ml-4 text-muted-foreground">
                  Tariffa unitaria per singola prestazione/accesso. Formato: importo in euro con virgola (es. "20,00"). <strong>Campo obbligatorio</strong> che deve essere sempre compilato manualmente dall'operatore, in quanto i PDF delle presenze non contengono mai questo dato. Reperibile dal tariffario regionale, dal contratto con l'USL o dalle disposizioni aziendali. L'app consente l'inserimento e la modifica libera di questo campo tramite input dedicato.
                </p>
              </div>
              <div>
                <strong>impres (Importo Prestazione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Importo lordo totale del periodo di trattamento. Formula: tariffa × numpres. Formato: importo in euro con virgola (es. "200,00"). <strong>Questo campo è calcolato automaticamente dall'applicazione</strong> ogni volta che si modifica la tariffa o il numero presenze. Non è modificabile manualmente. L'app mostra il valore calcolato in tempo reale. In fase di export, l'app ricalcola sempre l'importo per garantire la coerenza matematica e il superamento della validazione GAUSS.
                </p>
              </div>
            </div>
            <Alert className="border-amber-500/50 bg-amber-500/5 mt-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                <strong>Attenzione:</strong> Dopo l'importazione dal PDF, l'app crea automaticamente i record SPR2 di tipo 3 con i campi dataini, datafine, numpres e durata compilati. Il campo tariffa sarà inizialmente vuoto o impostato a zero. È <strong>obbligatorio</strong> entrare nel Tab SPR2, aprire ogni record di tipo 3 e compilare manualmente il campo tariffa. Solo dopo aver inserito la tariffa, l'app calcolerà automaticamente l'importo (impres).
              </AlertDescription>
            </Alert>
          </div>

          {/* 5.3 Record = 4 – Rivalutazione / Valutazione finale */}
          <div>
            <h3 className="font-semibold text-base mb-3">5.3 Record Tipo 4 - Rivalutazione / Valutazione Finale</h3>
            <p className="mb-3">
              Il record di tipo 4 documenta le rivalutazioni intermedie e la valutazione finale del percorso riabilitativo. È obbligatorio inserire almeno un record di tipo 4 per ogni ciclo riabilitativo.
            </p>
            <div className="space-y-3">
              <div>
                <strong>dt_Rival_ValF (Data Rivalutazione/Valutazione Finale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data della rivalutazione o della valutazione finale. Formato: GG/MM/AAAA. Campo obbligatorio. Deve essere successiva alla data_PIC. Reperibile dalla cartella clinica o dal verbale di rivalutazione.
                </p>
              </div>
              <div>
                <strong>motiv_RivalValF (Motivo Rivalutazione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice del motivo della rivalutazione. Valori: 1=Rivalutazione periodica programmata, 2=Valutazione finale, 3=Rivalutazione per cambiamento clinico significativo, 4=Altro. Reperibile dalla tabella regionale "MOTIVI RIVALUTAZIONE". L'app fornisce menu a tendina con i valori ammessi.
                </p>
              </div>
              <div>
                <strong>confValPrec (Conferma Valutazione Precedente):</strong>
                <p className="ml-4 text-muted-foreground">
                  Indica se la valutazione corrente conferma quella precedente. Valori: 1=Sì (confermata), 2=No (non confermata). Se si seleziona "1" (Sì), tutti i campi clinici successivi (diagnosi aggiornate, variabili di esito, scale finali) vengono automaticamente disabilitati e non devono essere compilati. Se si seleziona "2" (No), l'app abilita tutti i campi clinici che devono essere compilati con i nuovi valori rilevati.
                </p>
              </div>
              <div>
                <strong>Campi Clinici Condizionali (attivi solo se confValPrec = No):</strong>
                <ul className="ml-4 space-y-2 text-muted-foreground">
                  <li>
                    <strong>R_ICD9CM (Diagnosi Principale Aggiornata):</strong> Codice ICD-9-CM della diagnosi principale rilevata alla rivalutazione. Reperibile dalla tabella "DIAGNOSIICD9CM" regionale.
                  </li>
                  <li>
                    <strong>trSocioRiab (Trattamento Socio-Riabilitativo):</strong> Codice del trattamento socio-riabilitativo principale in atto. Reperibile dalla tabella regionale dei trattamenti.
                  </li>
                  <li>
                    <strong>Variabili di Esito (rvf_stabclin, rvf_vitaq, rvf_mob, rvf_cogn, rvf_comp, rvf_comu, rvf_sensor, rvf_bisogni, rvf_supsoc):</strong> Valutazioni cliniche aggiornate su vari domini funzionali. Valori: 1=Migliorato, 2=Stabile, 3=Peggiorato, 9=Non rilevato. Reperire i dati dalla rivalutazione clinica documentata.
                  </li>
                  <li>
                    <strong>Scale di Disabilità a Fine Rivalutazione:</strong> Punteggi aggiornati delle scale di disabilità utilizzate. Stessi codici scala dell'SPR1 (scalaDis_x) con nuovi punteggi (disFinal_x).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 5.4 Record = 5 – Sospensione */}
          <div>
            <h3 className="font-semibold text-base mb-3">5.4 Record Tipo 5 - Sospensione</h3>
            <p className="mb-3">
              Il record di tipo 5 documenta eventuali interruzioni temporanee del percorso riabilitativo. Utilizzare questo record solo quando il percorso viene sospeso per un periodo significativo (es. ricovero ospedaliero, assenza prolungata del paziente) ma è prevista la ripresa del trattamento.
            </p>
            <div className="space-y-3">
              <div>
                <strong>dataSosp_I (Data Inizio Sospensione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di inizio della sospensione. Formato: GG/MM/AAAA. Campo obbligatorio. Deve essere successiva alla data_PIC. Reperibile dalla cartella clinica o dalla comunicazione di sospensione.
                </p>
              </div>
              <div>
                <strong>dataSosp_F (Data Fine Sospensione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di fine della sospensione (ripresa del trattamento). Formato: GG/MM/AAAA. Campo obbligatorio. Deve essere successiva o uguale a dataSosp_I. Se al momento della compilazione il percorso è ancora sospeso, inserire una data prevista di ripresa o lasciare vuoto fino alla ripresa effettiva.
                </p>
              </div>
              <div>
                <strong>motivo_Sosp (Motivo Sospensione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice del motivo della sospensione. Valori: 1=Ricovero ospedaliero, 2=Rifiuto temporaneo del paziente, 3=Motivi organizzativi, 4=Altro. Reperibile dalla tabella regionale "MOTIVI SOSPENSIONE". L'app fornisce menu a tendina con i valori ammessi.
                </p>
              </div>
            </div>
          </div>

          {/* 5.5 Record = 6 – Conclusione */}
          <div>
            <h3 className="font-semibold text-base mb-3">5.5 Record Tipo 6 - Conclusione</h3>
            <p className="mb-3">
              Il record di tipo 6 chiude il ciclo riabilitativo. <strong>È obbligatorio inserire un unico record di tipo 6 per ogni ciclo riabilitativo completato.</strong> Non inserire il record di tipo 6 se il percorso è ancora in corso.
            </p>
            <div className="space-y-3">
              <div>
                <strong>d_fineciclo (Data Fine Ciclo):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data di conclusione del ciclo riabilitativo. Formato: GG/MM/AAAA. Campo obbligatorio. Deve essere successiva alla data_PIC e all'ultima data di trattamento (datafine del record SPR2 tipo 3 più recente). Reperibile dalla cartella clinica o dal verbale di dimissione.
                </p>
              </div>
              <div>
                <strong>dim_ute (Motivo Dimissione):</strong>
                <p className="ml-4 text-muted-foreground">
                  Codice del motivo di dimissione/conclusione del percorso. Esempi: 1=Obiettivi raggiunti, 2=Dimissione volontaria, 3=Decesso, 4=Trasferimento ad altra struttura, 5=Interruzione per mancata adesione. Reperibile dalla tabella regionale "MOTIVI DIMISSIONE". L'app fornisce menu a tendina con i valori ammessi. Interpretazione dei codici:
                </p>
                <ul className="ml-8 mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>1 (Obiettivi raggiunti):</strong> Il paziente ha completato il percorso con successo.</li>
                  <li><strong>2 (Dimissione volontaria):</strong> Il paziente ha deciso autonomamente di interrompere il percorso.</li>
                  <li><strong>3 (Decesso):</strong> Il paziente è deceduto durante il percorso.</li>
                  <li><strong>4 (Trasferimento):</strong> Il paziente prosegue il percorso in altra struttura.</li>
                  <li><strong>5 (Interruzione per mancata adesione):</strong> Il percorso viene chiuso per assenza prolungata o non collaborazione del paziente.</li>
                </ul>
              </div>
              <div>
                <strong>DriunioneF (Data Riunione Finale):</strong>
                <p className="ml-4 text-muted-foreground">
                  Data dell'eventuale riunione finale del team multidisciplinare. Formato: GG/MM/AAAA. Campo facoltativo. Reperibile dal verbale di riunione finale se previsto dalle procedure aziendali.
                </p>
              </div>
              <div>
                <strong>Scale di Disabilità Finali (disFinal_1 ... disFinal_6):</strong>
                <p className="ml-4 text-muted-foreground">
                  Punteggi finali delle scale di disabilità utilizzate, rilevati alla conclusione del percorso. Utilizzare gli stessi codici scala dell'SPR1 (scalaDis_x). I punteggi finali permettono di valutare l'outcome del trattamento confrontandoli con i punteggi iniziali (disIngr_x).
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. IMPORTAZIONE DATI - EXCEL E PDF */}
      <Card>
        <CardHeader>
          <CardTitle>6. Importazione Dati da Excel e PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            L'applicazione supporta l'importazione dati da due fonti: file Excel (per dati economici e prestazioni) e file PDF (per dati anagrafici e presenze). I dati vengono automaticamente unificati usando il Codice Fiscale come chiave primaria.
          </p>

          {/* 6.1 IMPORTAZIONE EXCEL */}
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold mb-2 text-base">6.1 Importazione da File Excel (Prestazioni)</h3>
            <p className="text-muted-foreground mb-3">
              L'importazione Excel è ottimizzata per il file "Richiesta Prestazioni" che contiene i dati economici e le ore erogate per paziente.
            </p>
            
            <div className="space-y-3">
              <div>
                <strong>Formato File Supportato:</strong>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li>File .xlsx o .xls con dati strutturati in colonne</li>
                  <li><strong>Colonna 3:</strong> Codice Fiscale paziente (16 caratteri)</li>
                  <li><strong>Colonna 7:</strong> Numero Prestazioni (formato: "417.1x6; 405.1x4")</li>
                  <li><strong>Colonne 8-9:</strong> Eventuali dati overflow (concatenati automaticamente)</li>
                </ul>
              </div>
              
              <div>
                <strong>Parsing delle Prestazioni:</strong>
                <p className="text-muted-foreground ml-4">
                  L'app riconosce automaticamente i codici prestazione usando il pattern <code className="bg-muted px-1 rounded">(417.1|405.1) x N</code>:
                </p>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li><strong>417.1</strong> (AC - Ambulatoriale Complessa): Tariffa €54,25/ora</li>
                  <li><strong>405.1</strong> (AA - Ambulatoriale Altro): Tariffa €44,90/ora</li>
                </ul>
              </div>

              <div>
                <strong>Calcoli Automatici per ogni Match:</strong>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li><strong>Ore:</strong> Numero dopo la "x" (es. "417.1x6" → 6 ore)</li>
                  <li><strong>Durata:</strong> Ore × 60 minuti</li>
                  <li><strong>Importo Riga:</strong> Tariffa × Ore</li>
                </ul>
              </div>

              <div>
                <strong>Aggregazione per Paziente (SPR1):</strong>
                <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
                  <li><strong>ore_prev:</strong> Somma di tutte le ore da tutti i match</li>
                  <li><strong>impatt:</strong> Somma di tutti gli importi riga</li>
                </ul>
              </div>

              <div>
                <strong>Generazione SPR2:</strong>
                <p className="text-muted-foreground ml-4">
                  Viene creato UN record SPR2 di tipo 3 per OGNI match trovato. Esempio: "417.1x6; 417.1x34; 405.1x6" genera 3 record SPR2 distinti.
                </p>
              </div>
            </div>

            <Alert className="border-primary/50 bg-primary/5 mt-4">
              <AlertDescription className="text-sm">
                <strong>Esempio Pratico:</strong><br/>
                Input: "417.1x 6; 417.1x34; 405.1x6"<br/>
                <ul className="mt-2 space-y-1">
                  <li>• Match 1: 417.1 × 6 ore = €325,50</li>
                  <li>• Match 2: 417.1 × 34 ore = €1.844,50</li>
                  <li>• Match 3: 405.1 × 6 ore = €269,40</li>
                </ul>
                <strong className="mt-2 block">Totale SPR1:</strong> ore_prev=46, impatt=€2.439,40
              </AlertDescription>
            </Alert>
          </div>

          {/* 6.2 IMPORTAZIONE PDF */}
          <div className="border-l-4 border-amber-500 pl-4 mt-6">
            <h3 className="font-semibold mb-2 text-base">6.2 Importazione da PDF (Presenze)</h3>
            <p className="text-muted-foreground mb-3">
              L'importazione PDF è ottimizzata per la "Scheda Attività" e fornisce i dati anagrafici e le date delle presenze.
            </p>

            <div>
              <strong>Formato PDF Supportato:</strong>
              <p className="ml-4 text-muted-foreground">
                Scheda Attività con nome/cognome paziente, date degli accessi e durata sessioni. Il PDF deve essere leggibile (non scansionato in bassa qualità).
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Procedura di Importazione</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <strong>Aprire il modulo di importazione:</strong> Cliccare sul pulsante "Importa Registro PDF" nella barra degli strumenti principale.
              </li>
              <li>
                <strong>Caricare il file PDF:</strong> Selezionare il file PDF del registro presenze dal proprio computer. L'app inizierà automaticamente la lettura e l'estrazione dei dati.
              </li>
              <li>
                <strong>Attendere l'elaborazione:</strong> L'app analizza il PDF, riconosce le presenze e tenta di abbinare automaticamente ciascuna presenza a un record SPR1 esistente tramite confronto del nome e cognome del paziente.
              </li>
              <li>
                <strong>Verificare gli abbinamenti:</strong> L'app mostra a video le presenze riconosciute e gli abbinamenti proposti. Verificare che ogni presenza sia stata correttamente associata al paziente corretto. In caso di omonimia o ambiguità, selezionare manualmente il paziente corretto dal menu a tendina.
              </li>
              <li>
                <strong>Confermare e generare i record SPR2:</strong> Cliccare su "Conferma" per generare automaticamente i record SPR2 di tipo 3 (Trattamento) con i seguenti dati pre-compilati:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-muted-foreground">
                  <li>dataini: prima data di presenza rilevata nel periodo</li>
                  <li>datafine: ultima data di presenza rilevata nel periodo</li>
                  <li>numpres: conteggio totale delle presenze nel periodo</li>
                  <li>durata: durata media delle sessioni in minuti (se rilevata dal PDF)</li>
                  <li>tariffa: campo vuoto o impostato a zero (da compilare manualmente)</li>
                  <li>impres: calcolato automaticamente dopo l'inserimento della tariffa</li>
                </ul>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Regole di Abbinamento Nome PDF ↔ SPR1</h3>
            <p className="text-muted-foreground mb-2">
              L'app confronta il nome completo del paziente estratto dal PDF (es. "Rossi Mario") con i campi Cognome e Nome presenti nei record SPR1. L'abbinamento avviene se:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
              <li>Cognome e Nome corrispondono esattamente (non case-sensitive)</li>
              <li>Cognome e Nome corrispondono ignorando spazi extra o caratteri speciali</li>
              <li>L'app gestisce varianti comuni (es. "De Luca" vs "Deluca")</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              In caso di omonimia (più pazienti con stesso nome e cognome), l'app mostra tutti i possibili abbinamenti e richiede la selezione manuale basata su altri dati (data di nascita, numero pratica).
            </p>
          </div>

          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              <p className="font-semibold mb-2">Importante: Azioni Post-Importazione</p>
              <p className="text-sm mb-2">
                Dopo aver confermato l'importazione dal PDF, è <strong>obbligatorio</strong> eseguire le seguenti operazioni:
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside ml-4">
                <li>Passare al Tab SPR2 e aprire ogni record di tipo 3 generato dall'importazione</li>
                <li>Verificare la correttezza dei campi dataini, datafine e numpres</li>
                <li>Compilare manualmente il campo "Tariffa" per ogni record (il PDF non contiene mai questo dato)</li>
                <li>Verificare che l'importo (impres) venga calcolato automaticamente e sia corretto</li>
                <li>Salvare le modifiche</li>
              </ol>
              <p className="text-sm mt-2">
                Senza la compilazione della tariffa, il record SPR2 sarà incompleto e l'export verso GAUSS fallirà in fase di validazione.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 7. ESPORTAZIONE TXT E GAUSS */}
      <Card>
        <CardHeader>
          <CardTitle>7. Esportazione TXT e Caricamento in GAUSS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Procedura di Esportazione</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                <strong>Avviare l'esportazione:</strong> Dopo aver completato la compilazione di tutti i record SPR1 e SPR2, cliccare sul pulsante "Esporta Flussi GAUSS" nella barra degli strumenti principale.
              </li>
              <li>
                <strong>Controlli automatici pre-export:</strong> L'app esegue automaticamente una serie di controlli di validazione prima di generare i file. Questi controlli verificano:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-muted-foreground">
                  <li>Presenza di tutti i campi obbligatori in SPR1 e SPR2</li>
                  <li>Coerenza delle chiavi tra record SPR1 e SPR2 (codusl, struttura, data_PIC, nprat)</li>
                  <li>Correttezza dei formati (date, codici fiscali, codici tabellari)</li>
                  <li>Coerenza economica: somma degli impres SPR2 rispetto a impatt SPR1</li>
                  <li>Presenza obbligatoria della tariffa per tutti i record SPR2 di tipo 3</li>
                  <li>Assenza di record SPR2 "orfani" (non collegati a nessun SPR1)</li>
                </ul>
              </li>
              <li>
                <strong>Visualizzazione esito validazione:</strong> Se l'app rileva errori o warning, mostra un dialog con l'elenco completo dei problemi riscontrati. Gli errori bloccanti impediscono l'export fino alla loro risoluzione. I warning non bloccanti possono essere ignorati dall'operatore se ritenuti non critici.
              </li>
              <li>
                <strong>Generazione file TXT:</strong> Se tutti i controlli sono superati, l'app genera automaticamente due file:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-muted-foreground">
                  <li><strong>SPR1.txt:</strong> Contiene tutti i record SPR1 (uno per ogni paziente/ciclo)</li>
                  <li><strong>SPR2.txt:</strong> Contiene tutti i record SPR2 (trattamenti, rivalutazioni, sospensioni, conclusioni) se presenti</li>
                </ul>
              </li>
              <li>
                <strong>Download dei file:</strong> I file vengono scaricati automaticamente nella cartella Download del browser. Conservare i file in una cartella dedicata per eventuali successive verifiche.
              </li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Caratteristiche Tecniche dei File TXT</h3>
            <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
              <li><strong>Formato:</strong> Testo posizionale a larghezza fissa (Fixed-Width). Nessun separatore tra i campi.</li>
              <li><strong>Encoding:</strong> Windows-1252 (ANSI). NON UTF-8.</li>
              <li><strong>Fine Riga:</strong> LF (Unix Style - carattere ASCII 10). NON CRLF (Windows).</li>
              <li><strong>Lunghezza Record SPR1:</strong> 360 caratteri + LF (totale 361 byte)</li>
              <li><strong>Lunghezza Record SPR2:</strong> 167 caratteri + LF (totale 168 byte)</li>
              <li><strong>Filler Finale:</strong> Ogni riga termina con un carattere spazio (ASCII 32) all'ultima posizione prima del LF per raggiungere la lunghezza richiesta.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Controlli da Effettuare Prima dell'Invio</h3>
            <p className="mb-2 text-muted-foreground">
              Prima di caricare i file in GAUSS, verificare manualmente:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
              <li>Assenza di record con campi obbligatori vuoti (l'app dovrebbe già averlo segnalato)</li>
              <li>Coerenza tra impatt SPR1 e somma degli impres SPR2 (verificare con calcolatrice se necessario)</li>
              <li>Corrispondenza esatta tra i primi 28 caratteri (chiave) di SPR1 e SPR2 per ogni paziente</li>
              <li>Presenza di almeno un record SPR2 di tipo 4 (Rivalutazione/Valutazione finale) per ogni ciclo concluso</li>
              <li>Presenza di un unico record SPR2 di tipo 6 (Conclusione) per ogni ciclo concluso</li>
              <li>Correttezza delle date: data_PIC &lt; dataini primo trattamento &lt; datafine ultimo trattamento &lt; d_fineciclo</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Caricamento in GAUSS</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Accedere al sistema GAUSS con le proprie credenziali</li>
              <li>Selezionare la sezione "Flussi SPR" o "Caricamento Flussi Riabilitazione"</li>
              <li>Cliccare su "Carica File" e selezionare prima SPR1.txt, poi SPR2.txt</li>
              <li>Attendere l'elaborazione del sistema (può richiedere alcuni minuti)</li>
              <li>Visualizzare gli esiti di validazione a video o scaricare il report PDF generato da GAUSS</li>
              <li>Se GAUSS segnala errori, annotare i codici errore e i record coinvolti, tornare in SPR Manager, correggere i dati e ripetere l'export</li>
            </ol>
          </div>

          <Alert className="border-primary/50 bg-primary/5">
            <FileText className="h-4 w-4 text-primary" />
            <AlertDescription>
              <p className="font-semibold mb-2">Nota Bene</p>
              <p className="text-sm">
                I controlli automatici effettuati dall'applicazione SPR Manager riducono drasticamente il rischio di errori in GAUSS, ma non possono sostituire completamente la validazione regionale. GAUSS effettua ulteriori controlli di coerenza (es. codici tabellari aggiornati, regole regionali specifiche) che possono generare errori non rilevabili dall'app. In caso di segnalazioni da GAUSS, contattare il referente regionale per chiarimenti.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 8. DIZIONARI TERRITORIALI */}
      <Card>
        <CardHeader>
          <CardTitle>8. Dizionari Territoriali e Compilazione Automatica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            L'applicazione integra i dizionari territoriali ufficiali della Regione Toscana per la compilazione automatica e la validazione dei campi geografici. I dizionari includono validità temporale per gestire correttamente le variazioni storiche (fusioni comuni, modifiche ASL, ecc.).
          </p>

          <div>
            <h3 className="font-semibold mb-2">8.1 Dizionario Comuni (comuni.txt)</h3>
            <p className="text-muted-foreground mb-2">
              Contiene l'elenco di tutti i comuni italiani con:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground">
              <li><strong>Codice ISTAT:</strong> 6 caratteri (es. "048017" per Firenze)</li>
              <li><strong>Denominazione:</strong> Nome ufficiale del comune</li>
              <li><strong>Codice Regione:</strong> 3 caratteri (es. "090" per Toscana)</li>
              <li><strong>Sigla Provincia:</strong> 2 caratteri (es. "FI")</li>
              <li><strong>Data Inizio/Fine Validità:</strong> Per gestire comuni soppressi o fusioni</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">8.2 Dizionario Aziende-Comuni (aziende_comuni.txt)</h3>
            <p className="text-muted-foreground mb-2">
              Contiene l'associazione tra comuni e Aziende Sanitarie Locali (ASL):
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground">
              <li><strong>Codice Regione + ASL:</strong> Identificativo dell'azienda sanitaria</li>
              <li><strong>Codice ISTAT Comune:</strong> Per la lookup inversa</li>
              <li><strong>Data Inizio/Fine Validità:</strong> Per gestire riorganizzazioni ASL</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">8.3 Compilazione Automatica nel Form SPR1</h3>
            <p className="text-muted-foreground mb-2">
              Quando l'operatore seleziona un comune tramite l'autocomplete, l'applicazione compila automaticamente:
            </p>
            <ol className="list-decimal list-inside ml-4 text-muted-foreground space-y-1">
              <li><strong>lures (Comune Residenza):</strong> Codice ISTAT selezionato</li>
              <li><strong>regresu (Regione Residenza):</strong> Derivato dalle prime 3 cifre del codice ISTAT</li>
              <li><strong>uslresu (USL Residenza):</strong> Lookup dal dizionario aziende_comuni.txt</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">8.4 Ricerca Comuni</h3>
            <p className="text-muted-foreground">
              Il campo "Comune Residenza" offre un autocomplete intelligente che permette di cercare per:
            </p>
            <ul className="list-disc list-inside ml-4 text-muted-foreground mt-1">
              <li>Nome comune (es. "Firen" trova "Firenze")</li>
              <li>Codice ISTAT (es. "048017")</li>
              <li>Sigla provincia (es. "FI" mostra tutti i comuni di Firenze)</li>
            </ul>
          </div>

          <Alert className="border-primary/50 bg-primary/5 mt-4">
            <AlertDescription>
              <p className="font-semibold mb-2">Procedura Step-by-Step: Compilazione Geografica</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Nel campo "Comune Residenza", iniziare a digitare il nome del comune</li>
                <li>Selezionare il comune corretto dall'elenco a discesa</li>
                <li>I campi "Regione Residenza" e "USL Residenza" si compilano automaticamente</li>
                <li>Se il paziente è straniero, impostare Cittadinanza diversa da "100" (Italia): i campi geografici si imposteranno automaticamente a "999"</li>
                <li>Se la Regione è diversa da "090" (Toscana), il campo "Accesso" si imposta automaticamente a "3" (Extraregionale)</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 9. GESTIONE TABELLE REGIONALI */}
      <Card>
        <CardHeader>
          <CardTitle>9. Gestione e Aggiornamento delle Tabelle Regionali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            L'applicazione utilizza tabelle di supporto regionali per popolare i menu a tendina, validare i codici inseriti e garantire la conformità ai requisiti del sistema GAUSS.
          </p>

          <div>
            <h3 className="font-semibold mb-2">Principali Tabelle Regionali Necessarie</h3>
            <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
              <li>
                <strong>AZIENDESANITARIE:</strong> Elenco delle Aziende USL della Toscana con relativi codici. Utilizzata per i campi codusl e uslresu.
              </li>
              <li>
                <strong>STRUTTUREOPERATIVE SPR:</strong> Elenco delle strutture erogatrici accreditate per la riabilitazione territoriale. Utilizzata per il campo struttura.
              </li>
              <li>
                <strong>COMUNI (ISTAT):</strong> Elenco dei comuni italiani con codici ISTAT a 6 cifre. Utilizzata per il campo lures (luogo residenza). <strong className="text-primary">Integrato nel dizionario territoriale.</strong>
              </li>
              <li>
                <strong>STATI (Ministero Interno):</strong> Elenco degli Stati con codici di cittadinanza. Utilizzata per il campo cittu.
              </li>
              <li>
                <strong>DIAGNOSIICD9CM:</strong> Catalogo regionale delle diagnosi secondo la classificazione ICD-9-CM. Utilizzata per i campi diagnostici in SPR1 e SPR2.
              </li>
              <li>
                <strong>PRESTAZIONI RIABILITATIVE:</strong> Catalogo regionale dei codici prestazione/intervento riabilitativo. Utilizzata per il campo codpres.
              </li>
              <li>
                <strong>ESENZIONI:</strong> Elenco dei codici di esenzione dal ticket. Utilizzata per il campo codese.
              </li>
              <li>
                <strong>MOTIVI SOSPENSIONE:</strong> Elenco dei motivi di sospensione del percorso (1=Ricovero ospedaliero, 2=Allontanamento temporaneo, 3=Altro).
              </li>
              <li>
                <strong>MOTIVI RIVALUTAZIONE:</strong> Elenco dei motivi di rivalutazione. Utilizzata per il campo motiv_RivalValF in SPR2 tipo 4.
              </li>
              <li>
                <strong>MOTIVI DIMISSIONE:</strong> Elenco standard toscano (00-10) per il campo dim_ute in SPR2 tipo 6.
              </li>
              <li>
                <strong>SCALE DI DISABILITÀ:</strong> Elenco delle scale di valutazione della disabilità ammesse (FIM, Barthel, WHODAS, etc.). Utilizzata per i campi scalaDis_x in SPR1 e SPR2.
              </li>
            </ul>
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/5">
            <FileText className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <p className="font-semibold mb-2">Nota per gli Amministratori</p>
              <p className="text-sm">
                I dizionari territoriali (comuni.txt e aziende_comuni.txt) sono integrati nell'applicazione. Per aggiornamenti, contattare il supporto tecnico. I file sono posizionati nella cartella <code className="bg-muted px-1 rounded">public/data/</code>.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 10. CHECKLIST OPERATORE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            10. Checklist Operatore - Controlli Pre-Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Utilizzare questa checklist per verificare la completezza e la coerenza dei dati prima di esportare i file verso GAUSS.
          </p>

          <div>
            <h3 className="font-semibold mb-2">Controlli SPR1 (Anagrafica e Presa in Carico)</h3>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Campi chiave compilati correttamente: codusl, struttura, data_PIC, nprat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Codice Fiscale (IDutente) presente e valido (16 caratteri)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Genere e data di nascita coerenti con il Codice Fiscale</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se paziente minorenne (età &lt; 18), campo respGen compilato</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Codici geografici corretti: cittu, lures, regresu, uslresu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se cittadinanza non italiana, regresu e uslresu impostati a "999"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se regresu diverso da "090" (Toscana) e "999" (Estero), campo accesso impostato a "3" (Extraregionale)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Almeno una scala di disabilità compilata (scalaDis_1 e disIngr_1)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Campi economici verificati: quoric, imptick, impatt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se imptick &gt; 0, verificare che codese (esenzione) sia vuoto o incoerente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se codese compilato, verificare che imptick sia "0,00"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Almeno un professionista del team selezionato (prof_...)</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Controlli SPR2 (Dettaglio Ciclo Riabilitativo)</h3>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Almeno un record di tipo 3 (Trattamento) presente per ogni paziente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Per ogni record tipo 3: dataini, datafine, numpres compilati</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span><strong>CRITICO:</strong> Per ogni record tipo 3, campo tariffa compilato manualmente (non vuoto, non zero)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Campo impres calcolato automaticamente e visualizzato correttamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Almeno un record di tipo 4 (Rivalutazione/Valutazione finale) presente per cicli conclusi</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Per record tipo 4: campo dt_Rival_ValF compilato</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se confValPrec = "2" (No) in record tipo 4, campi clinici compilati</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Se presente record tipo 5 (Sospensione): dataSosp_I, dataSosp_F, motivo_Sosp compilati</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Per cicli conclusi: un unico record tipo 6 (Conclusione) presente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Per record tipo 6: d_fineciclo e dim_ute compilati</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Controlli Combinati SPR1-SPR2</h3>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Ogni record SPR2 ha un record SPR1 corrispondente (stessa chiave: codusl + struttura + data_PIC + nprat)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Nessun record SPR2 "orfano" (senza SPR1 collegato)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Coerenza economica: impatt (SPR1) ≈ Somma impres (SPR2 tipo 3) - imptick - quoric</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Coerenza temporale: data_PIC (SPR1) &lt; dataini primo trattamento (SPR2)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">□</span>
                <span>Coerenza temporale: datafine ultimo trattamento (SPR2) &lt; d_fineciclo (SPR2 tipo 6)</span>
              </li>
            </ul>
          </div>

          <Alert className="border-primary/50 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription>
              <p className="font-semibold mb-2">Utilizzo della Checklist</p>
              <p className="text-sm">
                Questa checklist può essere stampata e utilizzata come procedura interna prima di ogni export. Si consiglia di conservare una copia compilata per ogni flusso inviato a GAUSS, insieme ai file TXT generati e agli eventuali report di validazione ricevuti da GAUSS.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* SEZIONE TECNICA PER PROGRAMMATORI */}
      <div className="border-t-2 border-border pt-6 mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Sezione Tecnica per Programmatori</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Le seguenti informazioni sono destinate agli sviluppatori e ai tecnici che necessitano di comprendere le specifiche tecniche dei file SPR1 e SPR2.
        </p>

        <Alert className="border-primary/50 bg-primary/5 mb-6">
          <FileText className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold">Template SPR Regione Toscana</p>
            <p className="text-sm">Specifiche Funzionali v2.1 (27/02/2025) - Prestazioni Riabilitazione Territoriale</p>
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-500/50 bg-amber-500/5 mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <p className="font-semibold mb-2">Specifiche Tecniche del File (CRITICO)</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li><strong>Formato:</strong> Testo posizionale a larghezza fissa (Fixed-Width). Nessun separatore.</li>
              <li><strong>Encoding:</strong> Windows-1252 (ANSI). NON usare UTF-8.</li>
              <li><strong>Fine Riga:</strong> LF (Unix Style - \n). NON CRLF.</li>
              <li><strong>Filler Finale:</strong> È obbligatorio inserire un carattere "Spazio" (ASCII 32) all'ultima posizione di ogni riga per raggiungere la lunghezza richiesta.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">1</span>
                Struttura File SPR1 (Testata)
              </CardTitle>
              <CardDescription>
                Dati anagrafici e di presa in carico. Lunghezza: 360 caratteri + invio a capo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <p className="font-semibold">Composizione:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>Pos 1-264:</strong> Campi Standard Regionali (76 campi)</li>
                  <li><strong>Pos 265-359:</strong> Campi Aggiuntivi GAUSS (Cognome, Nome, Progetto, Data Verbale, ecc.)</li>
                  <li><strong>Pos 360:</strong> SPAZIO VUOTO (Filler obbligatorio)</li>
                </ul>
              </div>
              <div className="flex justify-between text-sm mt-4">
                <span className="text-muted-foreground">Lunghezza totale:</span>
                <span className="font-semibold">360 caratteri + LF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Encoding:</span>
                <span className="font-semibold">Windows-1252 (ANSI)</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold">2</span>
                Struttura File SPR2 (Dettaglio)
              </CardTitle>
              <CardDescription>
                Dettagli del ciclo riabilitativo. Lunghezza: 167 caratteri + invio a capo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <p className="font-semibold">Composizione:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>Pos 1-166:</strong> Campi Dati (variabili in base al tipo record 3/4/5/6)</li>
                  <li><strong>Pos 167:</strong> SPAZIO VUOTO (Filler obbligatorio)</li>
                </ul>
              </div>
              <div className="text-sm space-y-1 mt-4">
                <p className="font-semibold mb-2">Tipi record:</p>
                <div className="space-y-1 text-muted-foreground">
                  <p>• <span className="font-mono">record=3</span>: Trattamento</p>
                  <p>• <span className="font-mono">record=4</span>: Rivalutazione/Valutazione finale</p>
                  <p>• <span className="font-mono">record=5</span>: Sospensione</p>
                  <p>• <span className="font-mono">record=6</span>: Conclusione</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mt-4">
                <span className="text-muted-foreground">Lunghezza totale:</span>
                <span className="font-semibold">167 caratteri + LF</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Encoding:</span>
                <span className="font-semibold">Windows-1252 (ANSI)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-primary" />
              Tracciato Completo SPR1 (157 campi - 360 caratteri)
            </CardTitle>
            <CardDescription>
              76 campi dati (pos 1-264) + 76 flag errore (pos 265-340) + 5 campi finali (pos 341-349) + 11 spazi vuoti (pos 350-360)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SPR1FieldsTable />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-primary" />
              Tracciato Completo SPR2 (41 campi - 167 caratteri)
            </CardTitle>
            <CardDescription>
              Campi comuni (pos 1-28) + campi specifici per tipo record (3=Trattamento, 4=Rivalutazione, 5=Sospensione, 6=Conclusione)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SPR2FieldsTable />
          </CardContent>
        </Card>

        <Alert className="border-blue-500/50 bg-blue-500/5">
          <FileText className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <p className="font-semibold mb-2">Regole di Compilazione Tecnica</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li><strong>Date:</strong> Formato rigoroso GGMMAAAA (es. 15012025)</li>
              <li><strong>Importi/Valuta:</strong> Lunghezza 8, allineati a destra, zeri a sinistra, virgola inclusa (es. 00050,00)</li>
              <li><strong>Testo:</strong> Allineato a sinistra, riempito con spazi. Rimuovere caratteri accentati</li>
              <li><strong>Numeri:</strong> Allineati a destra, riempiti con zeri</li>
              <li><strong>Relazione SPR1-SPR2:</strong> I primi 28 caratteri di SPR2 (Chiave: ASL+Struttura+DataPIC+Pratica) devono essere identici al record SPR1 corrispondente</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>;
}