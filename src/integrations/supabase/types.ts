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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      plan_items: {
        Row: {
          action: string
          created_at: string
          done: boolean
          id: string
          note: string | null
          occurrence_count: number
          plan_id: string
          priority: string
          recurring: boolean
          sort_order: number
          when_text: string | null
        }
        Insert: {
          action: string
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          occurrence_count?: number
          plan_id: string
          priority: string
          recurring?: boolean
          sort_order?: number
          when_text?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          done?: boolean
          id?: string
          note?: string | null
          occurrence_count?: number
          plan_id?: string
          priority?: string
          recurring?: boolean
          sort_order?: number
          when_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          raw_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_text?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_sends: {
        Row: {
          id: string
          item_id: string
          kind: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          kind: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          kind?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_sends_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          ls_customer_id: string | null
          ls_ends_at: string | null
          ls_portal_url: string | null
          ls_renews_at: string | null
          ls_status: string | null
          ls_subscription_id: string | null
          period_start: string
          plan: string
          unmess_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ls_customer_id?: string | null
          ls_ends_at?: string | null
          ls_portal_url?: string | null
          ls_renews_at?: string | null
          ls_status?: string | null
          ls_subscription_id?: string | null
          period_start?: string
          plan?: string
          unmess_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ls_customer_id?: string | null
          ls_ends_at?: string | null
          ls_portal_url?: string | null
          ls_renews_at?: string | null
          ls_status?: string | null
          ls_subscription_id?: string | null
          period_start?: string
          plan?: string
          unmess_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_errors: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          message: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          message: string
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          message?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      free_users: {
        Row: {
          created_at: string | null
          period_start: string | null
          plan: string | null
          unmess_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          period_start?: string | null
          plan?: string | null
          unmess_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          period_start?: string | null
          plan?: string | null
          unmess_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pro_subscribers: {
        Row: {
          created_at: string | null
          ls_customer_id: string | null
          ls_renews_at: string | null
          ls_status: string | null
          ls_subscription_id: string | null
          period_start: string | null
          plan: string | null
          unmess_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          ls_customer_id?: string | null
          ls_renews_at?: string | null
          ls_status?: string | null
          ls_subscription_id?: string | null
          period_start?: string | null
          plan?: string | null
          unmess_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          ls_customer_id?: string | null
          ls_renews_at?: string | null
          ls_status?: string | null
          ls_subscription_id?: string | null
          period_start?: string | null
          plan?: string | null
          unmess_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_unmess: { Args: never; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
