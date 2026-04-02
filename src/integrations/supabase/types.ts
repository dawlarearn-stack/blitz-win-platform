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
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          id: string
          reason: string | null
          telegram_id: string
          unbanned_at: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          id?: string
          reason?: string | null
          telegram_id: string
          unbanned_at?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          id?: string
          reason?: string | null
          telegram_id?: string
          unbanned_at?: string | null
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          first_name: string | null
          id: string
          joined_at: string
          telegram_id: string
          username: string | null
        }
        Insert: {
          first_name?: string | null
          id?: string
          joined_at?: string
          telegram_id: string
          username?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          joined_at?: string
          telegram_id?: string
          username?: string | null
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          fingerprint: string
          first_seen_at: string
          id: string
          ip_address: string | null
          last_seen_at: string
          telegram_id: string
          user_agent: string | null
        }
        Insert: {
          fingerprint: string
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          telegram_id: string
          user_agent?: string | null
        }
        Update: {
          fingerprint?: string
          first_seen_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          telegram_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          game_id: string
          id: string
          level: number
          points_awarded: number | null
          started_at: string
          status: string
          telegram_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          game_id: string
          id?: string
          level?: number
          points_awarded?: number | null
          started_at?: string
          status?: string
          telegram_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          game_id?: string
          id?: string
          level?: number
          points_awarded?: number | null
          started_at?: string
          status?: string
          telegram_id?: string
        }
        Relationships: []
      }
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
      suspicious_activity: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          device_info: string | null
          id: string
          ip_address: string | null
          telegram_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          telegram_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          telegram_id?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_game_state: {
        Row: {
          created_at: string
          energy: number
          games_played: number
          points: number
          progress: Json
          referral_code: string
          telegram_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          energy?: number
          games_played?: number
          points?: number
          progress?: Json
          referral_code?: string
          telegram_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          energy?: number
          games_played?: number
          points?: number
          progress?: Json
          referral_code?: string
          telegram_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_heartbeats: {
        Row: {
          last_seen_at: string
          telegram_id: string
        }
        Insert: {
          last_seen_at?: string
          telegram_id: string
        }
        Update: {
          last_seen_at?: string
          telegram_id?: string
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
