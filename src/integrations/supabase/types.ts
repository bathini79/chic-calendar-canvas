export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          coupon_amount: number | null
          coupon_code: string | null
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          coupon_id: string | null
          coupon_name: string | null
          created_at: string | null
          customer_id: string
          discount_type: string | null
          discount_value: number | null
          end_time: string
          id: string
          location: string | null
          membership_discount: number | null
          membership_id: string | null
          membership_name: string | null
          notes: string | null
          number_of_bookings: number | null
          original_appointment_id: string | null
          payment_method: string | null
          points_discount_amount: number | null
          points_earned: number | null
          points_redeemed: number | null
          refund_notes: string | null
          refund_reason: string | null
          refunded_by: string | null
          round_off_difference: number | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          subtotal: number | null
          tax_amount: number | null
          tax_id: string | null
          tax_name: string | null
          total_duration: number | null
          total_price: number
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          coupon_amount?: number | null
          coupon_code?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_name?: string | null
          created_at?: string | null
          customer_id: string
          discount_type?: string | null
          discount_value?: number | null
          end_time: string
          id?: string
          location?: string | null
          membership_discount?: number | null
          membership_id?: string | null
          membership_name?: string | null
          notes?: string | null
          number_of_bookings?: number | null
          original_appointment_id?: string | null
          payment_method?: string | null
          points_discount_amount?: number | null
          points_earned?: number | null
          points_redeemed?: number | null
          refund_notes?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          round_off_difference?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_id?: string | null
          tax_name?: string | null
          total_duration?: number | null
          total_price: number
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          coupon_amount?: number | null
          coupon_code?: string | null
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_name?: string | null
          created_at?: string | null
          customer_id?: string
          discount_type?: string | null
          discount_value?: number | null
          end_time?: string
          id?: string
          location?: string | null
          membership_discount?: number | null
          membership_id?: string | null
          membership_name?: string | null
          notes?: string | null
          number_of_bookings?: number | null
          original_appointment_id?: string | null
          payment_method?: string | null
          points_discount_amount?: number | null
          points_earned?: number | null
          points_redeemed?: number | null
          refund_notes?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          round_off_difference?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_id?: string | null
          tax_name?: string | null
          total_duration?: number | null
          total_price?: number
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_original_appointment_id_fkey"
            columns: ["original_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_id: string
          created_at: string | null
          employee_id: string | null
          end_time: string | null
          id: string
          original_price: number | null
          package_id: string | null
          price_paid: number
          refund_notes: string | null
          refund_reason:
            | Database["public"]["Enums"]["refund_reason_type"]
            | null
          refunded_at: string | null
          refunded_by: string | null
          service_id: string | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          original_price?: number | null
          package_id?: string | null
          price_paid: number
          refund_notes?: string | null
          refund_reason?:
            | Database["public"]["Enums"]["refund_reason_type"]
            | null
          refunded_at?: string | null
          refunded_by?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          original_price?: number | null
          package_id?: string | null
          price_paid?: number
          refund_notes?: string | null
          refund_reason?:
            | Database["public"]["Enums"]["refund_reason_type"]
            | null
          refunded_at?: string | null
          refunded_by?: string | null
          service_id?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_refunded_by_fkey"
            columns: ["refunded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_details: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          customer_id: string
          customized_services: string[] | null
          duration: number | null
          id: string
          package_id: string | null
          selling_price: number | null
          service_id: string | null
          status: Database["public"]["Enums"]["cart_item_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customized_services?: string[] | null
          duration?: number | null
          id?: string
          package_id?: string | null
          selling_price?: number | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["cart_item_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customized_services?: string[] | null
          duration?: number | null
          id?: string
          package_id?: string | null
          selling_price?: number | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["cart_item_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_services: {
        Row: {
          coupon_id: string
          created_at: string | null
          service_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          service_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_services_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          apply_to_all: boolean | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          apply_to_all?: boolean | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          apply_to_all?: boolean | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_memberships: {
        Row: {
          amount_paid: number
          created_at: string
          customer_id: string
          end_date: string
          id: string
          membership_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          customer_id: string
          end_date: string
          id?: string
          membership_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_id?: string
          end_date?: string
          id?: string
          membership_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_configs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          is_favorite: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_favorite?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          position: number
          size: string
          title: string
          updated_at: string
          widget_type: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          position: number
          size?: string
          title: string
          updated_at?: string
          widget_type: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          position?: number
          size?: string
          title?: string
          updated_at?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboard_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string | null
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id?: string | null
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string | null
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_locations: {
        Row: {
          created_at: string
          employee_id: string
          location_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          location_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          created_at: string
          employee_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_verification_codes: {
        Row: {
          code: string
          created_at: string
          employee_id: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_verification_codes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_verification_links: {
        Row: {
          created_at: string
          employee_id: string
          expires_at: string
          id: string
          used: boolean
          verification_token: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          expires_at: string
          id?: string
          used?: boolean
          verification_token: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          expires_at?: string
          id?: string
          used?: boolean
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_verification_links_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          employment_type: Database["public"]["Enums"]["employee_type"]
          employment_type_id: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          employment_type?: Database["public"]["Enums"]["employee_type"]
          employment_type_id?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          employment_type?: Database["public"]["Enums"]["employee_type"]
          employment_type_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_employees_employment_type"
            columns: ["employment_type_id"]
            isOneToOne: false
            referencedRelation: "employment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_configurable: boolean | null
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_configurable?: boolean | null
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_configurable?: boolean | null
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_reports: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean | null
          name: string
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          report_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          categories: string[] | null
          created_at: string
          description: string | null
          has_location_specific_data: boolean | null
          id: string
          max_quantity: number
          minimum_quantity: number
          name: string
          quantity: number
          status: string | null
          suggested_order_quantity: number | null
          supplier_id: string | null
          unit_of_quantity: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          description?: string | null
          has_location_specific_data?: boolean | null
          id?: string
          max_quantity?: number
          minimum_quantity?: number
          name: string
          quantity?: number
          status?: string | null
          suggested_order_quantity?: number | null
          supplier_id?: string | null
          unit_of_quantity?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          description?: string | null
          has_location_specific_data?: boolean | null
          id?: string
          max_quantity?: number
          minimum_quantity?: number
          name?: string
          quantity?: number
          status?: string | null
          suggested_order_quantity?: number | null
          supplier_id?: string | null
          unit_of_quantity?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items_categories: {
        Row: {
          category_id: string
          item_id: string
        }
        Insert: {
          category_id: string
          item_id: string
        }
        Update: {
          category_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_categories_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_location_items: {
        Row: {
          categories: string[] | null
          created_at: string
          id: string
          item_id: string
          location_id: string
          max_quantity: number
          minimum_quantity: number
          quantity: number
          status: string
          supplier_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          id?: string
          item_id: string
          location_id: string
          max_quantity?: number
          minimum_quantity?: number
          quantity?: number
          status?: string
          supplier_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string
          max_quantity?: number
          minimum_quantity?: number
          quantity?: number
          status?: string
          supplier_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_location_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_location_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          transaction_type: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          transaction_type: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          transaction_type?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_units: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_closed: boolean | null
          location_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_closed?: boolean | null
          location_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_closed?: boolean | null
          location_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_tax_settings: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          product_tax_id: string | null
          service_tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          product_tax_id?: string | null
          service_tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          product_tax_id?: string | null
          service_tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_tax_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_tax_settings_product_tax_id_fkey"
            columns: ["product_tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_tax_settings_service_tax_id_fkey"
            columns: ["service_tax_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          state: string | null
          status: Database["public"]["Enums"]["location_status"] | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      loyalty_program_settings: {
        Row: {
          applicable_packages: string[] | null
          applicable_services: string[] | null
          apply_to_all: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          max_redemption_percentage: number | null
          max_redemption_points: number | null
          max_redemption_type: string | null
          min_billing_amount: number | null
          min_redemption_points: number
          points_per_spend: number
          points_validity_days: number | null
          updated_at: string | null
        }
        Insert: {
          applicable_packages?: string[] | null
          applicable_services?: string[] | null
          apply_to_all?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_redemption_percentage?: number | null
          max_redemption_points?: number | null
          max_redemption_type?: string | null
          min_billing_amount?: number | null
          min_redemption_points?: number
          points_per_spend?: number
          points_validity_days?: number | null
          updated_at?: string | null
        }
        Update: {
          applicable_packages?: string[] | null
          applicable_services?: string[] | null
          apply_to_all?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_redemption_percentage?: number | null
          max_redemption_points?: number | null
          max_redemption_type?: string | null
          min_billing_amount?: number | null
          min_redemption_points?: number
          points_per_spend?: number
          points_validity_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      membership_sales: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          location_id: string
          membership_id: string
          payment_method: string
          sale_date: string
          status: string
          tax_amount: number | null
          tax_rate_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          location_id: string
          membership_id: string
          payment_method: string
          sale_date?: string
          status?: string
          tax_amount?: number | null
          tax_rate_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          location_id?: string
          membership_id?: string
          payment_method?: string
          sale_date?: string
          status?: string
          tax_amount?: number | null
          tax_rate_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_sales_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_sales_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          applicable_packages: string[] | null
          applicable_services: string[] | null
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_discount_value: number | null
          min_billing_amount: number | null
          name: string
          updated_at: string | null
          validity_period: number
          validity_unit: string
        }
        Insert: {
          applicable_packages?: string[] | null
          applicable_services?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_discount_value?: number | null
          min_billing_amount?: number | null
          name: string
          updated_at?: string | null
          validity_period: number
          validity_unit: string
        }
        Update: {
          applicable_packages?: string[] | null
          applicable_services?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_discount_value?: number | null
          min_billing_amount?: number | null
          name?: string
          updated_at?: string | null
          validity_period?: number
          validity_unit?: string
        }
        Relationships: []
      }
      messaging_providers: {
        Row: {
          configuration: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_name: string
          updated_at: string | null
        }
        Insert: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name: string
          updated_at?: string | null
        }
        Update: {
          configuration?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          error_message: string | null
          external_message_id: string | null
          id: string
          message_content: string
          notification_type: string
          processed_at: string | null
          recipient_number: string
          status: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_content: string
          notification_type: string
          processed_at?: string | null
          recipient_number: string
          status?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          message_content?: string
          notification_type?: string
          processed_at?: string | null
          recipient_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      package_categories: {
        Row: {
          category_id: string
          created_at: string
          package_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          package_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_categories_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          package_id: string
          package_selling_price: number | null
          service_id: string
        }
        Insert: {
          package_id: string
          package_selling_price?: number | null
          service_id: string
        }
        Update: {
          package_id?: string
          package_selling_price?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          categories: string[] | null
          created_at: string
          customizable_services: string[] | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          duration: number | null
          id: string
          image_urls: string[] | null
          is_customizable: boolean | null
          name: string
          price: number
          status: Database["public"]["Enums"]["service_status"] | null
          updated_at: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          customizable_services?: string[] | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          duration?: number | null
          id?: string
          image_urls?: string[] | null
          is_customizable?: boolean | null
          name: string
          price: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          customizable_services?: string[] | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          duration?: number | null
          id?: string
          image_urls?: string[] | null
          is_customizable?: boolean | null
          name?: string
          price?: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          is_enabled: boolean | null
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      phone_auth_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          full_name: string | null
          id: string
          lead_source: string | null
          phone_number: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          full_name?: string | null
          id?: string
          lead_source?: string | null
          phone_number: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          lead_source?: string | null
          phone_number?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_created: boolean | null
          anniversary_date: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          facebook_url: string | null
          full_name: string | null
          gender: string | null
          id: string
          instagram_url: string | null
          last_used: string | null
          lead_source: string | null
          phone_number: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          twitter_url: string | null
          updated_at: string
          wallet_balance: number | null
          whatsapp_number: string | null
        }
        Insert: {
          admin_created?: boolean | null
          anniversary_date?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          instagram_url?: string | null
          last_used?: string | null
          lead_source?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          twitter_url?: string | null
          updated_at?: string
          wallet_balance?: number | null
          whatsapp_number?: string | null
        }
        Update: {
          admin_created?: boolean | null
          anniversary_date?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          instagram_url?: string | null
          last_used?: string | null
          lead_source?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          twitter_url?: string | null
          updated_at?: string
          wallet_balance?: number | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          item_id: string | null
          purchase_order_id: string | null
          purchase_price: number | null
          quantity: number
          received_quantity: number | null
          tax_rate: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          purchase_order_id?: string | null
          purchase_price?: number | null
          quantity: number
          received_quantity?: number | null
          tax_rate?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          purchase_order_id?: string | null
          purchase_price?: number | null
          quantity?: number
          received_quantity?: number | null
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_order_items_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchase_order_items_purchase_order"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          invoice_number: string | null
          notes: string | null
          order_date: string
          receipt_number: string | null
          status: string | null
          supplier_id: string | null
          tax_inclusive: boolean | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_date?: string
          receipt_number?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_inclusive?: boolean | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_date?: string
          receipt_number?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_inclusive?: boolean | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_orders_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_settings: {
        Row: {
          created_at: string | null
          id: string
          location_id: string | null
          next_number: number | null
          prefix: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          next_number?: number | null
          prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string | null
          next_number?: number | null
          prefix?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_shifts: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string
          effective_until: string | null
          employee_id: string | null
          end_time: string
          id: string
          location_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          effective_from?: string
          effective_until?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          effective_from?: string
          effective_until?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_inventory_requirements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity_required: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity_required?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity_required?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_inventory_requirements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_inventory_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          created_at: string
          location_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          location_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          location_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_locations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration: number
          gender: string | null
          id: string
          image_urls: string[] | null
          name: string
          original_price: number
          selling_price: number
          status: Database["public"]["Enums"]["service_status"] | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration: number
          gender?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          original_price: number
          selling_price: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number
          gender?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          original_price?: number
          selling_price?: number
          status?: Database["public"]["Enums"]["service_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      services_categories: {
        Row: {
          category_id: string
          created_at: string
          service_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          service_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_categories_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          employee_id: string | null
          end_time: string
          id: string
          is_pattern_generated: boolean | null
          location_id: string | null
          pattern_id: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          end_time: string
          id?: string
          is_pattern_generated?: boolean | null
          location_id?: string | null
          pattern_id?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          end_time?: string
          id?: string
          is_pattern_generated?: boolean | null
          location_id?: string | null
          pattern_id?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "recurring_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          created_at: string
          is_primary_supplier: boolean | null
          item_id: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_primary_supplier?: boolean | null
          item_id: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_primary_supplier?: boolean | null
          item_id?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          percentage: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          employee_id: string | null
          end_date: string
          id: string
          location_id: string | null
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["shift_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          end_date: string
          id?: string
          location_id?: string | null
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          end_date?: string
          id?: string
          location_id?: string | null
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["shift_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          item_id: string | null
          item_type: string | null
          payment_method: string
          tax_amount: number | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          payment_method?: string
          tax_amount?: number | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          payment_method?: string
          tax_amount?: number | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_suggested_order_quantity: {
        Args: { current_qty: number; min_qty: number; max_qty: number }
        Returns: number
      }
      create_appointment_and_bookings: {
        Args: {
          customer_id_param: string
          total_price_param: number
          booking_data: Json[]
        }
        Returns: undefined
      }
      delete_claim: {
        Args: { uid: string; claim: string }
        Returns: string
      }
      get_claim: {
        Args: { uid: string; claim: string }
        Returns: Json
      }
      get_claims: {
        Args: { uid: string }
        Returns: Json
      }
      get_customer_appointments: {
        Args: { customer_id_param: string }
        Returns: {
          appointment_id: string
          customer_id: string
          start_time: string
          end_time: string
          appointment_notes: string
          appointment_status: string
          booking_id: string
          service_id: string
          package_id: string
          employee_id: string
          booking_status: string
          service: Json
          package: Json
          employee: Json
        }[]
      }
      get_customer_bookings: {
        Args: { customer_id_param: string }
        Returns: {
          appointment_id: string
          customer_id: string
          start_time: string
          end_time: string
          appointment_notes: string
          appointment_status: string
          bookings: Json
        }[]
      }
      get_my_claim: {
        Args: { claim: string }
        Returns: Json
      }
      get_my_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_recent_sales: {
        Args: { days_param?: number; limit_param?: number }
        Returns: {
          id: string
          customer_id: string
          customer_name: string
          customer_email: string
          customer_phone: string
          amount: number
          created_at: string
          sale_type: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_claims_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      remove_old_verification_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_appointment_notification_internal: {
        Args: { appointment_id: string; notification_type: string }
        Returns: boolean
      }
      set_claim: {
        Args: { uid: string; claim: string; value: Json }
        Returns: string
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "canceled"
        | "completed"
        | "inprogress"
        | "voided"
        | "refunded"
        | "partially_refunded"
        | "noshow"
        | "booked"
      booking_status:
        | "pending"
        | "confirmed"
        | "canceled"
        | "completed"
        | "inprogress"
      cart_item_status: "pending" | "scheduled" | "removed"
      employee_status: "active" | "inactive"
      employee_type: "stylist" | "operations"
      location_status: "active" | "inactive"
      refund_reason_type:
        | "customer_dissatisfaction"
        | "service_quality_issue"
        | "scheduling_error"
        | "health_concern"
        | "price_dispute"
        | "other"
      service_status: "active" | "inactive" | "archived"
      shift_status: "pending" | "approved" | "declined"
      user_role: "customer" | "employee" | "admin" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "canceled",
        "completed",
        "inprogress",
        "voided",
        "refunded",
        "partially_refunded",
        "noshow",
        "booked",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "canceled",
        "completed",
        "inprogress",
      ],
      cart_item_status: ["pending", "scheduled", "removed"],
      employee_status: ["active", "inactive"],
      employee_type: ["stylist", "operations"],
      location_status: ["active", "inactive"],
      refund_reason_type: [
        "customer_dissatisfaction",
        "service_quality_issue",
        "scheduling_error",
        "health_concern",
        "price_dispute",
        "other",
      ],
      service_status: ["active", "inactive", "archived"],
      shift_status: ["pending", "approved", "declined"],
      user_role: ["customer", "employee", "admin", "superadmin"],
    },
  },
} as const
