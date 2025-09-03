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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          access_method: string | null
          base_price_cents: number
          booking_status: string | null
          cleaning_date: string
          cleaning_time: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deep_cleaning: boolean | null
          frequency: string
          id: string
          inside_fridge: boolean | null
          inside_windows: boolean | null
          laundry: boolean | null
          parking_info: string | null
          payment_status: string | null
          property_address: string
          property_baths: number
          property_beds: number
          property_city: string
          property_half_baths: number | null
          property_sqft: number
          property_state: string
          property_zipcode: string
          schedule_flexibility: string | null
          service_type: string
          special_instructions: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_setup_intent_id: string | null
          subscription_months: number | null
          total_price_cents: number
          updated_at: string
        }
        Insert: {
          access_method?: string | null
          base_price_cents: number
          booking_status?: string | null
          cleaning_date: string
          cleaning_time?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          deep_cleaning?: boolean | null
          frequency: string
          id?: string
          inside_fridge?: boolean | null
          inside_windows?: boolean | null
          laundry?: boolean | null
          parking_info?: string | null
          payment_status?: string | null
          property_address: string
          property_baths: number
          property_beds: number
          property_city: string
          property_half_baths?: number | null
          property_sqft: number
          property_state: string
          property_zipcode: string
          schedule_flexibility?: string | null
          service_type: string
          special_instructions?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_setup_intent_id?: string | null
          subscription_months?: number | null
          total_price_cents: number
          updated_at?: string
        }
        Update: {
          access_method?: string | null
          base_price_cents?: number
          booking_status?: string | null
          cleaning_date?: string
          cleaning_time?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          deep_cleaning?: boolean | null
          frequency?: string
          id?: string
          inside_fridge?: boolean | null
          inside_windows?: boolean | null
          laundry?: boolean | null
          parking_info?: string | null
          payment_status?: string | null
          property_address?: string
          property_baths?: number
          property_beds?: number
          property_city?: string
          property_half_baths?: number | null
          property_sqft?: number
          property_state?: string
          property_zipcode?: string
          schedule_flexibility?: string | null
          service_type?: string
          special_instructions?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_setup_intent_id?: string | null
          subscription_months?: number | null
          total_price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          city: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string | null
          stripe_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string | null
          stripe_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          city: string | null
          contractor_id: string | null
          created_at: string | null
          date: string
          ics_uid: string | null
          id: string
          is_first_clean: boolean | null
          notes: string | null
          payout_cents: number
          price_cents: number
          property_id: string | null
          status: string | null
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          contractor_id?: string | null
          created_at?: string | null
          date: string
          ics_uid?: string | null
          id?: string
          is_first_clean?: boolean | null
          notes?: string | null
          payout_cents: number
          price_cents: number
          property_id?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          contractor_id?: string | null
          created_at?: string | null
          date?: string
          ics_uid?: string | null
          id?: string
          is_first_clean?: boolean | null
          notes?: string | null
          payout_cents?: number
          price_cents?: number
          property_id?: string | null
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_links: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount_cents: number
          attempt_no: number | null
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string | null
          status: string | null
          stripe_pi_id: string | null
          stripe_tr_id: string | null
          subscription_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          attempt_no?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          stripe_pi_id?: string | null
          stripe_tr_id?: string | null
          subscription_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          attempt_no?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          status?: string | null
          stripe_pi_id?: string | null
          stripe_tr_id?: string | null
          subscription_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address1: string
          address2: string | null
          baths: number
          beds: number
          city: string | null
          created_at: string | null
          customer_id: string | null
          ical_url: string | null
          id: string
          is_vr: boolean | null
          sqft: number | null
          updated_at: string | null
          zipcode: string | null
        }
        Insert: {
          address1: string
          address2?: string | null
          baths: number
          beds: number
          city?: string | null
          created_at?: string | null
          customer_id?: string | null
          ical_url?: string | null
          id?: string
          is_vr?: boolean | null
          sqft?: number | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Update: {
          address1?: string
          address2?: string | null
          baths?: number
          beds?: number
          city?: string | null
          created_at?: string | null
          customer_id?: string | null
          ical_url?: string | null
          id?: string
          is_vr?: boolean | null
          sqft?: number | null
          updated_at?: string | null
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          months: number | null
          property_id: string | null
          start_limit: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          months?: number | null
          property_id?: string | null
          start_limit?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          months?: number | null
          property_id?: string | null
          start_limit?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_payout: {
        Args: { price_cents: number }
        Returns: number
      }
      calculate_price: {
        Args: { baths: number; beds: number; sqft: number }
        Returns: number
      }
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
