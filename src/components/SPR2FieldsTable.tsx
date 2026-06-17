export default function SPR2FieldsTable() {
  return <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-primary/10 text-left">
            <th className="border border-border p-2 font-semibold">#</th>
            <th className="border border-border p-2 font-semibold">Nome Campo</th>
            <th className="border border-border p-2 font-semibold">Posizione</th>
            <th className="border border-border p-2 font-semibold">Lunghezza</th>
            <th className="border border-border p-2 font-semibold">Tipo</th>
            <th className="border border-border p-2 font-semibold">Descrizione</th>
          </tr>
        </thead>
        <tbody>
          {/* Campi comuni a tutti i record */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="border border-border p-2 font-semibold">
              Campi comuni a tutti i record SPR2
            </td>
          </tr>
          <tr><td className="border p-1">1</td><td className="border p-1 font-mono">record</td><td className="border p-1">1</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Tipo record (3/4/5/6)</td></tr>
          <tr><td className="border p-1">2</td><td className="border p-1 font-mono">codusl</td><td className="border p-1">2</td><td className="border p-1">3</td><td className="border p-1">C</td><td className="border p-1">Codice ASL</td></tr>
          <tr><td className="border p-1">3</td><td className="border p-1 font-mono">struttura</td><td className="border p-1">5</td><td className="border p-1">6</td><td className="border p-1">C</td><td className="border p-1">Codice struttura</td></tr>
          <tr><td className="border p-1">4</td><td className="border p-1 font-mono">data_PIC</td><td className="border p-1">11</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data presa in carico</td></tr>
          <tr><td className="border p-1">5</td><td className="border p-1 font-mono">nprat</td><td className="border p-1">19</td><td className="border p-1">10</td><td className="border p-1">C</td><td className="border p-1">Numero pratica</td></tr>

          {/* Record tipo 3: Trattamento */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="border border-border p-2 font-semibold">
              Record tipo 3: Trattamento (Periodo di erogazione)
            </td>
          </tr>
          <tr><td className="border p-1">6</td><td className="border p-1 font-mono">dataini</td><td className="border p-1">29</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data inizio trattamento</td></tr>
          <tr><td className="border p-1">7</td><td className="border p-1 font-mono">datafine</td><td className="border p-1">37</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data fine trattamento</td></tr>
          <tr><td className="border p-1">8</td><td className="border p-1 font-mono">numpres</td><td className="border p-1">45</td><td className="border p-1">3</td><td className="border p-1">N</td><td className="border p-1">Numero prestazioni erogate</td></tr>
          <tr><td className="border p-1">9</td><td className="border p-1 font-mono">tariffa</td><td className="border p-1">48</td><td className="border p-1">8</td><td className="border p-1">E</td><td className="border p-1">Tariffa prestazione</td></tr>
          <tr><td className="border p-1">10</td><td className="border p-1 font-mono">impres</td><td className="border p-1">56</td><td className="border p-1">8</td><td className="border p-1">E</td><td className="border p-1">Importo prestazione</td></tr>
          <tr><td className="border p-1">11</td><td className="border p-1 font-mono">compensa</td><td className="border p-1">64</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Compensabilità</td></tr>
          <tr><td className="border p-1">12</td><td className="border p-1 font-mono">durata</td><td className="border p-1">65</td><td className="border p-1">5</td><td className="border p-1">N</td><td className="border p-1">Durata ciclo (ore)</td></tr>

          {/* Record tipo 4: Rivalutazione */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="border border-border p-2 font-semibold">
              Record tipo 4: Rivalutazione/Valutazione finale
            </td>
          </tr>
          <tr><td className="border p-1">13</td><td className="border p-1 font-mono">dt_Rival_ValF</td><td className="border p-1">70</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data rivalutazione/valutazione finale</td></tr>
          <tr><td className="border p-1">14</td><td className="border p-1 font-mono">motiv_RivalValF</td><td className="border p-1">78</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Motivo rivalutazione</td></tr>
          <tr><td className="border p-1">15</td><td className="border p-1 font-mono">confValPrec</td><td className="border p-1">79</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Conferma valutazione precedente</td></tr>
          <tr><td className="border p-1">16</td><td className="border p-1 font-mono">R_ICD9CM</td><td className="border p-1">80</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione ICD9-CM principale</td></tr>
          <tr><td className="border p-1">17</td><td className="border p-1 font-mono">R_ICD9CM_c</td><td className="border p-1">85</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione ICD9-CM concomitante</td></tr>
          <tr><td className="border p-1">18</td><td className="border p-1 font-mono">trSocioRiab</td><td className="border p-1">90</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Trasferimento socio-riabilitativo</td></tr>
          <tr><td className="border p-1">19</td><td className="border p-1 font-mono">rvf_stabclin</td><td className="border p-1">91</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione stabilità clinica</td></tr>
          <tr><td className="border p-1">20</td><td className="border p-1 font-mono">rvf_vitaq</td><td className="border p-1">92</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione vita quotidiana</td></tr>
          <tr><td className="border p-1">21</td><td className="border p-1 font-mono">rvf_mob</td><td className="border p-1">93</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione mobilità</td></tr>
          <tr><td className="border p-1">22</td><td className="border p-1 font-mono">rvf_cogn</td><td className="border p-1">94</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione cognitività</td></tr>
          <tr><td className="border p-1">23</td><td className="border p-1 font-mono">rvf_comp</td><td className="border p-1">95</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione comportamento</td></tr>
          <tr><td className="border p-1">24</td><td className="border p-1 font-mono">rvf_comu</td><td className="border p-1">96</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione comunicazione</td></tr>
          <tr><td className="border p-1">25</td><td className="border p-1 font-mono">rvf_sensor</td><td className="border p-1">97</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione funzioni sensoriali</td></tr>
          <tr><td className="border p-1">26</td><td className="border p-1 font-mono">rvf_bisogni</td><td className="border p-1">98</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione bisogni</td></tr>
          <tr><td className="border p-1">27</td><td className="border p-1 font-mono">rvf_supsoc</td><td className="border p-1">99</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione supporto sociale</td></tr>
          <tr><td className="border p-1">28</td><td className="border p-1 font-mono">rvf_care_giver</td><td className="border p-1">100</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione caregiver</td></tr>
          <tr><td className="border p-1">29</td><td className="border p-1 font-mono">rvf_protesi</td><td className="border p-1">101</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Rivalutazione protesi</td></tr>

          {/* Record tipo 5: Sospensione */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="border border-border p-2 font-semibold">
              Record tipo 5: Sospensione
            </td>
          </tr>
          <tr><td className="border p-1">30</td><td className="border p-1 font-mono">dataSosp_I</td><td className="border p-1">102</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data inizio sospensione</td></tr>
          <tr><td className="border p-1">31</td><td className="border p-1 font-mono">dataSosp_F</td><td className="border p-1">110</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data fine sospensione</td></tr>
          <tr><td className="border p-1">32</td><td className="border p-1 font-mono">motivo_Sosp</td><td className="border p-1">118</td><td className="border p-1">1</td><td className="border p-1">C</td><td className="border p-1">Motivo sospensione</td></tr>

          {/* Record tipo 6: Conclusione */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="border border-border p-2 font-semibold">
              Record tipo 6: Conclusione ciclo
            </td>
          </tr>
          <tr><td className="border p-1">33</td><td className="border p-1 font-mono">d_fineciclo</td><td className="border p-1">119</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data fine ciclo</td></tr>
          <tr><td className="border p-1">34</td><td className="border p-1 font-mono">dim_ute</td><td className="border p-1">127</td><td className="border p-1">2</td><td className="border p-1">C</td><td className="border p-1">Dimissione utente</td></tr>
          <tr><td className="border p-1">35</td><td className="border p-1 font-mono">disFinal_1</td><td className="border p-1">129</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 1</td></tr>
          <tr><td className="border p-1">36</td><td className="border p-1 font-mono">disFinal_2</td><td className="border p-1">134</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 2</td></tr>
          <tr><td className="border p-1">37</td><td className="border p-1 font-mono">disFinal_3</td><td className="border p-1">139</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 3</td></tr>
          <tr><td className="border p-1">38</td><td className="border p-1 font-mono">disFinal_4</td><td className="border p-1">144</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 4</td></tr>
          <tr><td className="border p-1">39</td><td className="border p-1 font-mono">disFinal_5</td><td className="border p-1">149</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 5</td></tr>
          <tr><td className="border p-1">40</td><td className="border p-1 font-mono">disFinal_6</td><td className="border p-1">154</td><td className="border p-1">5</td><td className="border p-1">C</td><td className="border p-1">Disabilità finale scala 6</td></tr>
          <tr><td className="border p-1">41</td><td className="border p-1 font-mono">DriunioneF</td><td className="border p-1">159</td><td className="border p-1">8</td><td className="border p-1">D</td><td className="border p-1">Data riunione finale</td></tr>

          <tr className="bg-primary/5">
            <td colSpan={6} className="border border-border p-2 font-semibold text-center">
              Totale: 41 campi - Record termina a posizione 167
            </td>
          </tr>
        </tbody>
      </table>
    </div>;
}