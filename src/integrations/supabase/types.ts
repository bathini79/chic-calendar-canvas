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
          created_at: string | null
          customer_id: string
          discount_type: string | null
          discount_value: number | null
          end_time: string
          id: string
          location: string | null
          notes: string | null
          number_of_bookings: number | null
          original_appointment_id: string | null
          original_total_price: number | null
          payment_method: string | null
          refund_notes: string | null
          refund_reason: string | null
          refunded_by: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          total_duration: number | null
          total_price: number
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_type?: string | null
          discount_value?: number | null
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          number_of_bookings?: number | null
          original_appointment_id?: string | null
          original_total_price?: number | null
          payment_method?: string | null
          refund_notes?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          total_duration?: number | null
          total_price: number
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_type?: string | null
          discount_value?: number | null
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          number_of_bookings?: number | null
          original_appointment_id?: string | null
          original_total_price?: number | null
          payment_method?: string | null
          refund_notes?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          total_duration?: number | null
          total_price?: number
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
      employees: {
        Row: {
          created_at: string
          email: string
          employment_type: Database["public"]["Enums"]["employee_type"]
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          employment_type?: Database["public"]["Enums"]["employee_type"]
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employment_type?: Database["public"]["Enums"]["employee_type"]
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
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
      locations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["location_status"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["location_status"] | null
          updated_at?: string
        }
        Relationships: []
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
          service_id: string
        }
        Insert: {
          package_id: string
          service_id: string
        }
        Update: {
          package_id?: string
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
      profiles: {
        Row: {
          admin_created: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone_number: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          admin_created?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          admin_created?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone_number?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
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
      recurring_shifts: {
        Row: {
          created_at: string
          day_of_week: number
          effective_from: string
          effective_until: string | null
          employee_id: string | null
          end_time: string
          id: string
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
      time_off_requests: {
        Row: {
          created_at: string
          employee_id: string | null
          end_date: string
          id: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_suggested_order_quantity: {
        Args: {
          current_qty: number
          min_qty: number
          max_qty: number
        }
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
        Args: {
          uid: string
          claim: string
        }
        Returns: string
      }
      get_claim: {
        Args: {
          uid: string
          claim: string
        }
        Returns: Json
      }
      get_claims: {
        Args: {
          uid: string
        }
        Returns: Json
      }
      get_customer_appointments: {
        Args: {
          customer_id_param: string
        }
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
        Args: {
          customer_id_param: string
        }
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
        Args: {
          claim: string
        }
        Returns: Json
      }
      get_my_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_claims_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_claim: {
        Args: {
          uid: string
          claim: string
          value: Json
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
