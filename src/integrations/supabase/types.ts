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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_wallets: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          wallet_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          wallet_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      allowlist: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          wallet_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          wallet_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      allowlist_requests: {
        Row: {
          decided_at: string | null
          id: string
          requested_at: string
          status: string
          wallet_address: string
        }
        Insert: {
          decided_at?: string | null
          id?: string
          requested_at?: string
          status?: string
          wallet_address: string
        }
        Update: {
          decided_at?: string | null
          id?: string
          requested_at?: string
          status?: string
          wallet_address?: string
        }
        Relationships: []
      }
      aml_scores: {
        Row: {
          id: string
          reason: string
          score: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          id?: string
          reason?: string
          score?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          id?: string
          reason?: string
          score?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      kyt_events: {
        Row: {
          action: string
          amount: string
          asset: string
          created_at: string
          flagged: boolean
          id: string
          wallet_address: string
        }
        Insert: {
          action: string
          amount: string
          asset: string
          created_at?: string
          flagged?: boolean
          id?: string
          wallet_address: string
        }
        Update: {
          action?: string
          amount?: string
          asset?: string
          created_at?: string
          flagged?: boolean
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          asset: string
          created_at: string
          id: string
          price: number
          source: string
          tx_signature: string | null
        }
        Insert: {
          asset?: string
          created_at?: string
          id?: string
          price: number
          source?: string
          tx_signature?: string | null
        }
        Update: {
          asset?: string
          created_at?: string
          id?: string
          price?: number
          source?: string
          tx_signature?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          tx_signature: string
          type: string
          unit: string
          wallet_address: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          tx_signature: string
          type: string
          unit: string
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          tx_signature?: string
          type?: string
          unit?: string
          wallet_address?: string
        }
        Relationships: []
      }
      travel_rule_records: {
        Row: {
          amount: number
          bene_vasp: string
          created_at: string
          id: string
          orig_vasp: string
          pda: string
        }
        Insert: {
          amount: number
          bene_vasp: string
          created_at?: string
          id?: string
          orig_vasp: string
          pda: string
        }
        Update: {
          amount?: number
          bene_vasp?: string
          created_at?: string
          id?: string
          orig_vasp?: string
          pda?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_wallet: { Args: { wallet: string }; Returns: boolean }
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
