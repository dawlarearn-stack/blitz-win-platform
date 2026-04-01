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
      payment_requests: {
        Row: {
          created_at: string
          energy_amount: number
          expires_at: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          price_mmk: string
          receipt_last4: string
          screenshot_url: string | null
          sender_name: string
          sender_phone: string
          status: Database["public"]["Enums"]["payment_status"]
          telegram_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          energy_amount: number
          expires_at: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          price_mmk: string
          receipt_last4: string
          screenshot_url?: string | null
          sender_name: string
          sender_phone: string
          status?: Database["public"]["Enums"]["payment_status"]
          telegram_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          energy_amount?: number
          expires_at?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          price_mmk?: string
          receipt_last4?: string
          screenshot_url?: string | null
          sender_name?: string
          sender_phone?: string
          status?: Database["public"]["Enums"]["payment_status"]
          telegram_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string | null
          amount_mmk: string | null
          amount_points: number
          amount_usd: string | null
          bep20_address: string | null
          binance_account_name: string | null
          binance_uid: string | null
          created_at: string
          currency: string
          id: string
          phone_number: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          telegram_id: string
          updated_at: string
          withdrawal_method: Database["public"]["Enums"]["withdrawal_method"]
        }
        Insert: {
          account_name?: string | null
          amount_mmk?: string | null
          amount_points: number
          amount_usd?: string | null
          bep20_address?: string | null
          binance_account_name?: string | null
          binance_uid?: string | null
          created_at?: string
          currency: string
          id?: string
          phone_number?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          telegram_id: string
          updated_at?: string
          withdrawal_method: Database["public"]["Enums"]["withdrawal_method"]
        }
        Update: {
          account_name?: string | null
          amount_mmk?: string | null
          amount_points?: number
          amount_usd?: string | null
          bep20_address?: string | null
          binance_account_name?: string | null
          binance_uid?: string | null
          created_at?: string
          currency?: string
          id?: string
          phone_number?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          telegram_id?: string
          updated_at?: string
          withdrawal_method?: Database["public"]["Enums"]["withdrawal_method"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_payment_request: {
        Args: {
          p_energy_amount: number
          p_expires_at?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_price_mmk: string
          p_receipt_last4: string
          p_screenshot_url?: string
          p_sender_name: string
          p_sender_phone: string
          p_telegram_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      payment_method: "kpay" | "wavepay" | "binance"
      payment_status: "pending" | "approved" | "rejected"
      withdrawal_method: "binance_id" | "bep20" | "kbz_pay" | "wave_pay"
      withdrawal_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      payment_method: ["kpay", "wavepay", "binance"],
      payment_status: ["pending", "approved", "rejected"],
      withdrawal_method: ["binance_id", "bep20", "kbz_pay", "wave_pay"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
