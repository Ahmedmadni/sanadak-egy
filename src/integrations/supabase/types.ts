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
      activity_types: {
        Row: {
          catalog_kind: string
          catalog_label_ar: string
          catalog_label_en: string
          code: string
          created_at: string
          has_bookings: boolean
          has_orders: boolean
          is_active: boolean
          label_ar: string
          label_en: string
          sort_order: number
          staff_label_ar: string
          staff_label_en: string
          updated_at: string
          uses_barcode: boolean
          uses_duration: boolean
          uses_stock: boolean
          uses_variants: boolean
        }
        Insert: {
          catalog_kind?: string
          catalog_label_ar: string
          catalog_label_en: string
          code: string
          created_at?: string
          has_bookings?: boolean
          has_orders?: boolean
          is_active?: boolean
          label_ar: string
          label_en: string
          sort_order?: number
          staff_label_ar?: string
          staff_label_en?: string
          updated_at?: string
          uses_barcode?: boolean
          uses_duration?: boolean
          uses_stock?: boolean
          uses_variants?: boolean
        }
        Update: {
          catalog_kind?: string
          catalog_label_ar?: string
          catalog_label_en?: string
          code?: string
          created_at?: string
          has_bookings?: boolean
          has_orders?: boolean
          is_active?: boolean
          label_ar?: string
          label_en?: string
          sort_order?: number
          staff_label_ar?: string
          staff_label_en?: string
          updated_at?: string
          uses_barcode?: boolean
          uses_duration?: boolean
          uses_stock?: boolean
          uses_variants?: boolean
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          cost: number
          created_at: string
          feature: string
          id: string
          period_month: string
          tenant_id: string
          tokens: number
          user_id: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          feature: string
          id?: string
          period_month?: string
          tenant_id: string
          tokens?: number
          user_id?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          feature?: string
          id?: string
          period_month?: string
          tenant_id?: string
          tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          target_id: string | null
          target_table: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: number
          previous_status: string
          status: string
          tenant_id: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: number
          previous_status: string
          status: string
          tenant_id: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: number
          previous_status?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          branch_id: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          item_id: string | null
          notes: string | null
          serial_no: number
          slot_end: string | null
          slot_start: string
          staff_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          serial_no?: number
          slot_end?: string | null
          slot_start: string
          staff_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          serial_no?: number
          slot_end?: string | null
          slot_start?: string
          staff_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          hours: Json
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_items: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          name: string
          price: number
          sort_order: number
          stock: number | null
          tenant_id: string
          unit_label: string | null
          updated_at: string
          variants: Json
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          name: string
          price?: number
          sort_order?: number
          stock?: number | null
          tenant_id: string
          unit_label?: string | null
          updated_at?: string
          variants?: Json
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          name?: string
          price?: number
          sort_order?: number
          stock?: number | null
          tenant_id?: string
          unit_label?: string | null
          updated_at?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          tenant_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string | null
          tenant_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          tenant_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          name: string
          order_id: string
          qty: number
          total: number
          unit_price: number
          variants: Json
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          name: string
          order_id: string
          qty?: number
          total?: number
          unit_price?: number
          variants?: Json
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          name?: string
          order_id?: string
          qty?: number
          total?: number
          unit_price?: number
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: number
          order_id: string
          previous_status: string
          status: string
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: number
          order_id: string
          previous_status: string
          status: string
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: number
          order_id?: string
          previous_status?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_type: string
          id: string
          inventory_released_at: string | null
          inventory_reserved_at: string | null
          notes: string | null
          payment_status: string
          serial_no: number
          status: string
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_type?: string
          id?: string
          inventory_released_at?: string | null
          inventory_reserved_at?: string | null
          notes?: string | null
          payment_status?: string
          serial_no?: number
          status?: string
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_type?: string
          id?: string
          inventory_released_at?: string | null
          inventory_reserved_at?: string | null
          notes?: string | null
          payment_status?: string
          serial_no?: number
          status?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ai_quota_monthly: number
          code: string
          commission_rate: number
          created_at: string
          currency: string
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name_ar: string
          name_en: string
          price_monthly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_quota_monthly?: number
          code: string
          commission_rate?: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name_ar: string
          name_en: string
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_quota_monthly?: number
          code?: string
          commission_rate?: number
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name_ar?: string
          name_en?: string
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_approved: boolean
          moderated_at: string | null
          moderated_by: string | null
          rating: number
          tenant_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_approved?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          rating: number
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_approved?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string | null
          schedule: Json
          specialty: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          role?: string | null
          schedule?: Json
          specialty?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string | null
          schedule?: Json
          specialty?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requests: {
        Row: {
          area: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          notes: string | null
          owner_name: string | null
          phone: string | null
          status: string
          store_name: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          status?: string
          store_name: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          status?: string
          store_name?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          area: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_method: string | null
          payment_reference: string | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          plan_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          plan_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          plan_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string | null
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_documents: {
        Row: {
          created_at: string
          file_path: string
          id: string
          kind: string
          note: string | null
          status: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          kind: string
          note?: string | null
          status?: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          note?: string | null
          status?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          area: string | null
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          image_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          plan_id: string | null
          settings: Json
          slug: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          area?: string | null
          category: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          area?: string | null
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          plan_id?: string | null
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_tenant: {
        Args: {
          _activate?: boolean
          _area?: string
          _category: string
          _description?: string
          _email?: string
          _image_url?: string
          _name: string
          _phone?: string
          _plan: string
          _slug?: string
        }
        Returns: string
      }
      admin_set_tenant_status: {
        Args: { _status: string; _tenant: string }
        Returns: undefined
      }
      approve_tenant_onboarding: {
        Args: { _tenant: string }
        Returns: {
          current_period_end: string
          current_period_start: string
          subscription_id: string
          tenant_id: string
        }[]
      }
      check_subscription_expiry: {
        Args: { _tenant: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          _branch?: string
          _customer_name: string
          _customer_phone: string
          _item: string
          _notes?: string
          _slot_start: string
          _staff?: string
          _tenant: string
        }
        Returns: {
          booking_id: string
          serial_no: number
          slot_end: string
          slot_start: string
          status: string
        }[]
      }
      set_booking_status: {
        Args: {
          _booking: string
          _cancellation_reason?: string
          _status: string
        }
        Returns: {
          booking_id: string
          cancelled_at: string | null
          status: string
        }[]
      }
      create_order: {
        Args: {
          _customer_address?: string
          _customer_name: string
          _customer_phone: string
          _delivery_type?: string
          _items: Json
          _notes?: string
          _tenant: string
        }
        Returns: {
          currency: string
          order_id: string
          serial_no: number
          subtotal: number
          total: number
        }[]
      }
      delete_own_review: {
        Args: { _review: string }
        Returns: boolean
      }
      get_booking_availability: {
        Args: {
          _branch?: string
          _date: string
          _item: string
          _staff?: string
          _tenant: string
        }
        Returns: {
          slot_end: string
          slot_start: string
        }[]
      }
      moderate_review: {
        Args: { _approved: boolean; _review: string }
        Returns: {
          is_approved: boolean
          moderated_at: string
          review_id: string
        }[]
      }
      search_tenants: {
        Args: {
          _area?: string
          _category?: string
          _limit?: number
          _offset?: number
          _query?: string
          _sort?: string
          _verified_only?: boolean
        }
        Returns: {
          area: string
          category: string
          description: string
          id: string
          image_url: string
          name: string
          slug: string
          total_count: number
          verified_at: string
        }[]
      }
      search_tenants_v2: {
        Args: {
          _query?: string | null
          _category?: string | null
          _area?: string | null
          _verified_only?: boolean
          _sort?: string
          _limit?: number
          _offset?: number
          _service?: string
        }
        Returns: {
          id: string
          slug: string
          name: string
          category: string
          area: string | null
          description: string | null
          image_url: string | null
          verified_at: string | null
          total_count: number
        }[]
      }
      set_order_status: {
        Args: { _order: string; _status: string }
        Returns: {
          inventory_released_at: string
          order_id: string
          status: string
        }[]
      }
      submit_payment_info: {
        Args: { _method: string; _reference: string; _tenant: string }
        Returns: undefined
      }
      submit_review: {
        Args: { _body?: string | null; _rating: number; _tenant: string }
        Returns: {
          is_approved: boolean
          review_id: string
          updated_existing: boolean
        }[]
      }
      tenant_is_visible: { Args: { _tenant: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "platform_admin"
        | "moderator"
        | "business_owner"
        | "store_manager"
        | "employee"
        | "customer"
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
    Enums: {
      app_role: [
        "admin",
        "user",
        "super_admin",
        "platform_admin",
        "moderator",
        "business_owner",
        "store_manager",
        "employee",
        "customer",
      ],
    },
  },
} as const
