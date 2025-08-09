export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      catalogos_clientes: {
        Row: {
          activo: boolean | null
          cliente_id: string | null
          created_at: string | null
          id: string
          producto_id: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          producto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogos_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogos_clientes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          comercial_id: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          comercial_id?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          comercial_id?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_comercial_id_fkey"
            columns: ["comercial_id"]
            isOneToOne: false
            referencedRelation: "comerciales"
            referencedColumns: ["id"]
          },
        ]
      }
      comerciales: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pedido_items: {
        Row: {
          cantidad: number
          created_at: string | null
          estado: string | null
          fecha_confirmacion: string | null
          id: string
          notas_item: string | null
          pedido_id: string | null
          precio_unitario: number
          producto_id: string | null
          stock_disponible: number | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          estado?: string | null
          fecha_confirmacion?: string | null
          id?: string
          notas_item?: string | null
          pedido_id?: string | null
          precio_unitario: number
          producto_id?: string | null
          stock_disponible?: number | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          estado?: string | null
          fecha_confirmacion?: string | null
          id?: string
          notas_item?: string | null
          pedido_id?: string | null
          precio_unitario?: number
          producto_id?: string | null
          stock_disponible?: number | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          estado: string | null
          fecha_entrega: string | null
          fecha_entrega_estimada: string | null
          fecha_pedido: string | null
          id: string
          items_confirmados: Json | null
          motivo_no_confirmado: string | null
          notas: string | null
          notas_operativas: string | null
          numero_pedido: string
          stock_confirmado: boolean | null
          total: number
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_entrega_estimada?: string | null
          fecha_pedido?: string | null
          id?: string
          items_confirmados?: Json | null
          motivo_no_confirmado?: string | null
          notas?: string | null
          notas_operativas?: string | null
          numero_pedido: string
          stock_confirmado?: boolean | null
          total: number
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_entrega_estimada?: string | null
          fecha_pedido?: string | null
          id?: string
          items_confirmados?: Json | null
          motivo_no_confirmado?: string | null
          notas?: string | null
          notas_operativas?: string | null
          numero_pedido?: string
          stock_confirmado?: boolean | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          precio: number
          sku: string
          updated_at: string | null
          url_imagen: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          precio: number
          sku: string
          updated_at?: string | null
          url_imagen?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          precio?: number
          sku?: string
          updated_at?: string | null
          url_imagen?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_stock_availability: {
        Args: { product_ids: string[] }
        Returns: {
          producto_id: string
          stock_disponible: number
          nombre: string
          precio: number
        }[]
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
