export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      name_aliases: {
        Row: {
          created_at: string
          id: string
          pdf_name: string
          spr1_cf: string
          spr1_cognome: string | null
          spr1_nome: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_name: string
          spr1_cf: string
          spr1_cognome?: string | null
          spr1_nome?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pdf_name?: string
          spr1_cf?: string
          spr1_cognome?: string | null
          spr1_nome?: string | null
        }
        Relationships: []
      }
      pending_records: {
        Row: {
          created_at: string
          error_reason: string | null
          id: string
          patient_name: string | null
          raw_data: Json
          record_type: string
          reference_month: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_reason?: string | null
          id?: string
          patient_name?: string | null
          raw_data?: Json
          record_type?: string
          reference_month?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_reason?: string | null
          id?: string
          patient_name?: string | null
          raw_data?: Json
          record_type?: string
          reference_month?: string | null
          status?: string
        }
        Relationships: []
      }
      spr1_records: {
        Row: {
          accesso: string | null
          cittu: string | null
          codese: string | null
          codpres: string | null
          codusl: string
          cognome: string | null
          condprof: string | null
          created_at: string | null
          data_pic: string | null
          data_val: string | null
          datanasc: string | null
          dis_ingr_1: string | null
          dis_ingr_2: string | null
          dis_ingr_3: string | null
          durata_prev: string | null
          genere: string | null
          icd9cm: string | null
          icd9cm_c: string | null
          id: string
          id_utente: string | null
          impatt: string | null
          imptick: string | null
          intpripai_1: string | null
          lures: string | null
          nome: string | null
          nprat: string | null
          opera: string | null
          ore_prev: string | null
          proroghe: string | null
          quoric: string | null
          regresu: string | null
          scala_dis_1: string | null
          scala_dis_2: string | null
          scala_dis_3: string | null
          setting: string | null
          soggrich: string | null
          statciv: string | null
          struttura: string
          titstud: string | null
          updated_at: string | null
          uslresu: string | null
        }
        Insert: {
          accesso?: string | null
          cittu?: string | null
          codese?: string | null
          codpres?: string | null
          codusl?: string
          cognome?: string | null
          condprof?: string | null
          created_at?: string | null
          data_pic?: string | null
          data_val?: string | null
          datanasc?: string | null
          dis_ingr_1?: string | null
          dis_ingr_2?: string | null
          dis_ingr_3?: string | null
          durata_prev?: string | null
          genere?: string | null
          icd9cm?: string | null
          icd9cm_c?: string | null
          id?: string
          id_utente?: string | null
          impatt?: string | null
          imptick?: string | null
          intpripai_1?: string | null
          lures?: string | null
          nome?: string | null
          nprat?: string | null
          opera?: string | null
          ore_prev?: string | null
          proroghe?: string | null
          quoric?: string | null
          regresu?: string | null
          scala_dis_1?: string | null
          scala_dis_2?: string | null
          scala_dis_3?: string | null
          setting?: string | null
          soggrich?: string | null
          statciv?: string | null
          struttura?: string
          titstud?: string | null
          updated_at?: string | null
          uslresu?: string | null
        }
        Update: {
          accesso?: string | null
          cittu?: string | null
          codese?: string | null
          codpres?: string | null
          codusl?: string
          cognome?: string | null
          condprof?: string | null
          created_at?: string | null
          data_pic?: string | null
          data_val?: string | null
          datanasc?: string | null
          dis_ingr_1?: string | null
          dis_ingr_2?: string | null
          dis_ingr_3?: string | null
          durata_prev?: string | null
          genere?: string | null
          icd9cm?: string | null
          icd9cm_c?: string | null
          id?: string
          id_utente?: string | null
          impatt?: string | null
          imptick?: string | null
          intpripai_1?: string | null
          lures?: string | null
          nome?: string | null
          nprat?: string | null
          opera?: string | null
          ore_prev?: string | null
          proroghe?: string | null
          quoric?: string | null
          regresu?: string | null
          scala_dis_1?: string | null
          scala_dis_2?: string | null
          scala_dis_3?: string | null
          setting?: string | null
          soggrich?: string | null
          statciv?: string | null
          struttura?: string
          titstud?: string | null
          updated_at?: string | null
          uslresu?: string | null
        }
        Relationships: []
      }
      spr2_records: {
        Row: {
          codpres: string | null
          codusl: string | null
          compensa: string | null
          created_at: string | null
          data_pic: string | null
          datafine: string | null
          dataini: string | null
          durata: number | null
          id: string
          impres: number | null
          is_remote: boolean | null
          nprat: string | null
          numpres: number | null
          record: string | null
          spr1_id: string | null
          struttura: string | null
          tariffa: number | null
        }
        Insert: {
          codpres?: string | null
          codusl?: string | null
          compensa?: string | null
          created_at?: string | null
          data_pic?: string | null
          datafine?: string | null
          dataini?: string | null
          durata?: number | null
          id?: string
          impres?: number | null
          is_remote?: boolean | null
          nprat?: string | null
          numpres?: number | null
          record?: string | null
          spr1_id?: string | null
          struttura?: string | null
          tariffa?: number | null
        }
        Update: {
          codpres?: string | null
          codusl?: string | null
          compensa?: string | null
          created_at?: string | null
          data_pic?: string | null
          datafine?: string | null
          dataini?: string | null
          durata?: number | null
          id?: string
          impres?: number | null
          is_remote?: boolean | null
          nprat?: string | null
          numpres?: number | null
          record?: string | null
          spr1_id?: string | null
          struttura?: string | null
          tariffa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spr2_records_spr1_id_fkey"
            columns: ["spr1_id"]
            isOneToOne: false
            referencedRelation: "spr1_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_authorized_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
