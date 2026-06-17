import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Field {
  pos: number;
  length: number;
  num: string;
  name: string;
  type: string;
}

const spr1Fields: Field[] = [
  { pos: 1, length: 1, num: "1", name: "record", type: "C" },
  { pos: 2, length: 1, num: "2", name: "opera", type: "C" },
  { pos: 3, length: 3, num: "3", name: "codusl", type: "C" },
  { pos: 6, length: 6, num: "4", name: "struttura", type: "C" },
  { pos: 12, length: 8, num: "5", name: "data_PIC", type: "D" },
  { pos: 20, length: 10, num: "6", name: "nprat", type: "C" },
  { pos: 30, length: 1, num: "7", name: "tipoindu", type: "C" },
  { pos: 31, length: 24, num: "8", name: "IDutente", type: "C" },
  { pos: 55, length: 1, num: "9", name: "genere", type: "C" },
  { pos: 56, length: 8, num: "10", name: "datanasc", type: "D" },
  { pos: 64, length: 1, num: "11", name: "respGen", type: "C" },
  { pos: 65, length: 3, num: "12", name: "cittu", type: "C" },
  { pos: 68, length: 6, num: "13", name: "lures", type: "C" },
  { pos: 74, length: 3, num: "14", name: "regresu", type: "C" },
  { pos: 77, length: 3, num: "15", name: "uslresu", type: "C" },
  { pos: 80, length: 2, num: "16", name: "statciv", type: "C" },
  { pos: 82, length: 1, num: "17", name: "titstud", type: "C" },
  { pos: 83, length: 1, num: "18", name: "condprof", type: "C" },
  { pos: 84, length: 2, num: "19", name: "soggRich", type: "C" },
  { pos: 86, length: 1, num: "20", name: "setting", type: "C" },
  { pos: 87, length: 8, num: "21", name: "codpres", type: "C" },
  { pos: 95, length: 1, num: "22", name: "accesso", type: "C" },
  { pos: 96, length: 5, num: "23", name: "ICD9CM", type: "C" },
  { pos: 101, length: 5, num: "24", name: "ICD9CM_c", type: "C" },
  { pos: 106, length: 3, num: "25", name: "proroghe", type: "N" },
  { pos: 109, length: 3, num: "26", name: "%_SSN", type: "N" },
  { pos: 112, length: 1, num: "27", name: "pianif", type: "C" },
  { pos: 113, length: 8, num: "28", name: "data_val", type: "D" },
  { pos: 121, length: 1, num: "29", name: "care_giver", type: "C" },
  { pos: 122, length: 2, num: "30", name: "IntPRIPAI_1", type: "C" },
  { pos: 124, length: 2, num: "31", name: "IntPRIPAI_2", type: "C" },
  { pos: 126, length: 2, num: "32", name: "IntPRIPAI_3", type: "C" },
  { pos: 128, length: 2, num: "33", name: "IntPRIPAI_4", type: "C" },
  { pos: 130, length: 2, num: "34", name: "IntPRIPAI_5", type: "C" },
  { pos: 132, length: 2, num: "35", name: "IntPRIPAI_6", type: "C" },
  { pos: 134, length: 2, num: "36", name: "scalaDis_1", type: "C" },
  { pos: 136, length: 5, num: "37", name: "disIngr_1", type: "C" },
  { pos: 141, length: 2, num: "38", name: "scalaDis_2", type: "C" },
  { pos: 143, length: 5, num: "39", name: "disIngr_2", type: "C" },
  { pos: 148, length: 2, num: "40", name: "scalaDis_3", type: "C" },
  { pos: 150, length: 5, num: "41", name: "disIngr_3", type: "C" },
  { pos: 155, length: 2, num: "42", name: "scalaDis_4", type: "C" },
  { pos: 157, length: 5, num: "43", name: "disIngr_4", type: "C" },
  { pos: 162, length: 2, num: "44", name: "scalaDis_5", type: "C" },
  { pos: 164, length: 5, num: "45", name: "disIngr_5", type: "C" },
  { pos: 169, length: 2, num: "46", name: "scalaDis_6", type: "C" },
  { pos: 171, length: 5, num: "47", name: "disIngr_6", type: "C" },
  { pos: 176, length: 1, num: "48", name: "vi_stabclin", type: "C" },
  { pos: 177, length: 1, num: "49", name: "vi_vitaq", type: "C" },
  { pos: 178, length: 1, num: "50", name: "vi_mob", type: "C" },
  { pos: 179, length: 1, num: "51", name: "vi_cogn", type: "C" },
  { pos: 180, length: 1, num: "52", name: "vi_comp", type: "C" },
  { pos: 181, length: 1, num: "53", name: "vi_comu", type: "C" },
  { pos: 182, length: 1, num: "54", name: "vi_sensor", type: "C" },
  { pos: 183, length: 1, num: "55", name: "vi_bisogni", type: "C" },
  { pos: 184, length: 1, num: "56", name: "vi_supsoc", type: "C" },
  { pos: 185, length: 1, num: "57", name: "protesi", type: "C" },
  { pos: 186, length: 3, num: "58", name: "durata_prev", type: "N" },
  { pos: 189, length: 4, num: "59", name: "ore_prev", type: "N" },
  { pos: 193, length: 1, num: "60", name: "prof_MMGPLS", type: "C" },
  { pos: 194, length: 1, num: "61", name: "prof_spec", type: "C" },
  { pos: 195, length: 1, num: "62", name: "prof_inf", type: "C" },
  { pos: 196, length: 1, num: "63", name: "prof_oss", type: "C" },
  { pos: 197, length: 1, num: "64", name: "prof_fisiot", type: "C" },
  { pos: 198, length: 1, num: "65", name: "prof_log", type: "C" },
  { pos: 199, length: 1, num: "66", name: "prof_terap_ev", type: "C" },
  { pos: 200, length: 1, num: "67", name: "prof_occup", type: "C" },
  { pos: 201, length: 1, num: "68", name: "prof_psic", type: "C" },
  { pos: 202, length: 1, num: "69", name: "prof_as", type: "C" },
  { pos: 203, length: 1, num: "70", name: "prof_educ", type: "C" },
  { pos: 204, length: 1, num: "71", name: "prof_altri_san", type: "C" },
  { pos: 205, length: 30, num: "72", name: "d_prof_altri", type: "C" },
  { pos: 235, length: 8, num: "73", name: "quoric", type: "E" },
  { pos: 243, length: 8, num: "74", name: "imptick", type: "E" },
  { pos: 251, length: 8, num: "75", name: "impatt", type: "E" },
  { pos: 259, length: 6, num: "76", name: "codese", type: "C" },
  { pos: 265, length: 20, num: "--", name: "Cognome", type: "C" },
  { pos: 285, length: 20, num: "--", name: "Nome", type: "C" },
  { pos: 305, length: 2, num: "--", name: "Progetto", type: "C" },
  { pos: 307, length: 2, num: "--", name: "Pacchetto", type: "C" },
  { pos: 309, length: 8, num: "--", name: "Pres_inviante", type: "C" },
  { pos: 317, length: 2, num: "--", name: "Distr_inviante", type: "C" },
  { pos: 319, length: 10, num: "--", name: "Evento", type: "C" },
  { pos: 329, length: 1, num: "--", name: "Quota", type: "C" },
  { pos: 330, length: 1, num: "--", name: "Chiusura", type: "C" },
  { pos: 331, length: 8, num: "--", name: "Localizzazione", type: "C" },
  { pos: 339, length: 1, num: "--", name: "Gest_Tetto", type: "C" },
  { pos: 340, length: 12, num: "--", name: "Num_verbale", type: "C" },
  { pos: 352, length: 8, num: "--", name: "Data_verbale", type: "D" },
];

export function SPR1FieldsTable() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Campo</TableHead>
            <TableHead>Nome Campo</TableHead>
            <TableHead className="w-24">Posizione</TableHead>
            <TableHead className="w-24">Lunghezza</TableHead>
            <TableHead className="w-16">Tipo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {spr1Fields.map((field, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{field.num}</TableCell>
              <TableCell className="font-medium">{field.name}</TableCell>
              <TableCell className="font-mono text-xs">{field.pos}</TableCell>
              <TableCell className="font-mono text-xs">{field.length}</TableCell>
              <TableCell className="font-mono text-xs">{field.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
