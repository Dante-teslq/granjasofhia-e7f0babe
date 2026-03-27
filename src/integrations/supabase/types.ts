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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          device: string | null
          entity: string | null
          id: string
          ip: string | null
          item_description: string
          module: string
          record_id: string | null
          user_agent: string | null
          user_id: string | null
          usuario: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          device?: string | null
          entity?: string | null
          id?: string
          ip?: string | null
          item_description?: string
          module: string
          record_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          usuario: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          device?: string | null
          entity?: string | null
          id?: string
          ip?: string | null
          item_description?: string
          module?: string
          record_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          usuario?: string
        }
        Relationships: []
      }
      estoque_diario: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string
          data_conferencia: string
          id: string
          pdv_id: string
          status: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          data_conferencia: string
          id?: string
          pdv_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string
          data_conferencia?: string
          id?: string
          pdv_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_diario_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_diario_itens: {
        Row: {
          created_at: string
          estoque_diario_id: string
          estoque_loja: number
          estoque_sistema: number
          id: string
          observacao: string
          produto_codigo: string
          produto_descricao: string
          quebrado: number
          trincado: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estoque_diario_id: string
          estoque_loja?: number
          estoque_sistema?: number
          id?: string
          observacao?: string
          produto_codigo?: string
          produto_descricao?: string
          quebrado?: number
          trincado?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estoque_diario_id?: string
          estoque_loja?: number
          estoque_sistema?: number
          id?: string
          observacao?: string
          produto_codigo?: string
          produto_descricao?: string
          quebrado?: number
          trincado?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_diario_itens_estoque_diario_id_fkey"
            columns: ["estoque_diario_id"]
            isOneToOne: false
            referencedRelation: "estoque_diario"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_pdv: {
        Row: {
          created_at: string
          id: string
          pdv_id: string
          produto_codigo: string
          produto_descricao: string
          quantidade: number
          quantidade_minima: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdv_id: string
          produto_codigo: string
          produto_descricao?: string
          quantidade?: number
          quantidade_minima?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pdv_id?: string
          produto_codigo?: string
          produto_descricao?: string
          quantidade?: number
          quantidade_minima?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_pdv_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_registros: {
        Row: {
          codigo: string
          created_at: string
          data: string
          descricao: string
          estoque_loja: number
          estoque_sistema: number
          id: string
          loja: string
          obs: string
          quebrado: number
          trincado: number
          updated_at: string
          usuario: string | null
        }
        Insert: {
          codigo?: string
          created_at?: string
          data: string
          descricao?: string
          estoque_loja?: number
          estoque_sistema?: number
          id?: string
          loja: string
          obs?: string
          quebrado?: number
          trincado?: number
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          data?: string
          descricao?: string
          estoque_loja?: number
          estoque_sistema?: number
          id?: string
          loja?: string
          obs?: string
          quebrado?: number
          trincado?: number
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
      evidencias_perdas: {
        Row: {
          created_at: string
          data: string
          foto_path: string
          foto_url: string
          id: string
          justificativa: string
          ponto_de_venda: string
          quantidade: number
          tipo_perda: string
          usuario: string
        }
        Insert: {
          created_at?: string
          data?: string
          foto_path: string
          foto_url: string
          id?: string
          justificativa: string
          ponto_de_venda: string
          quantidade: number
          tipo_perda: string
          usuario: string
        }
        Update: {
          created_at?: string
          data?: string
          foto_path?: string
          foto_url?: string
          id?: string
          justificativa?: string
          ponto_de_venda?: string
          quantidade?: number
          tipo_perda?: string
          usuario?: string
        }
        Relationships: []
      }
      fechamento_diario_estoque: {
        Row: {
          created_at: string
          data: string
          estoque_final: number
          estoque_inicial: number
          fechado_em: string | null
          fechado_por: string | null
          fechado_por_id: string | null
          id: string
          pdv_id: string
          produto_codigo: string
          produto_descricao: string
          reaberto_em: string | null
          reaberto_por: string | null
          status: string
          total_ajustes: number
          total_entradas: number
          total_perdas: number
          total_saidas: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          estoque_final?: number
          estoque_inicial?: number
          fechado_em?: string | null
          fechado_por?: string | null
          fechado_por_id?: string | null
          id?: string
          pdv_id: string
          produto_codigo?: string
          produto_descricao?: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          status?: string
          total_ajustes?: number
          total_entradas?: number
          total_perdas?: number
          total_saidas?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          estoque_final?: number
          estoque_inicial?: number
          fechado_em?: string | null
          fechado_por?: string | null
          fechado_por_id?: string | null
          id?: string
          pdv_id?: string
          produto_codigo?: string
          produto_descricao?: string
          reaberto_em?: string | null
          reaberto_por?: string | null
          status?: string
          total_ajustes?: number
          total_entradas?: number
          total_perdas?: number
          total_saidas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_diario_estoque_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_alerts: {
        Row: {
          analyst: string | null
          created_at: string
          details: Json | null
          id: string
          link: string
          message: string
          observation: string | null
          operator: string
          severity: string
          status: string
          type: string
        }
        Insert: {
          analyst?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          link?: string
          message?: string
          observation?: string | null
          operator?: string
          severity?: string
          status?: string
          type: string
        }
        Update: {
          analyst?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          link?: string
          message?: string
          observation?: string | null
          operator?: string
          severity?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          confirmado_em: string | null
          confirmado_por: string | null
          created_at: string
          divergencia: number | null
          foto_recebimento: string | null
          id: string
          observacao: string | null
          observacao_recebimento: string | null
          pdv_destino_id: string | null
          pdv_origem_id: string | null
          produto_codigo: string
          produto_descricao: string
          quantidade: number
          quantidade_recebida: number | null
          status: string
          tipo: string
          usuario: string | null
        }
        Insert: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          divergencia?: number | null
          foto_recebimento?: string | null
          id?: string
          observacao?: string | null
          observacao_recebimento?: string | null
          pdv_destino_id?: string | null
          pdv_origem_id?: string | null
          produto_codigo: string
          produto_descricao?: string
          quantidade: number
          quantidade_recebida?: number | null
          status?: string
          tipo: string
          usuario?: string | null
        }
        Update: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          created_at?: string
          divergencia?: number | null
          foto_recebimento?: string | null
          id?: string
          observacao?: string | null
          observacao_recebimento?: string | null
          pdv_destino_id?: string | null
          pdv_origem_id?: string | null
          produto_codigo?: string
          produto_descricao?: string
          quantidade?: number
          quantidade_recebida?: number | null
          status?: string
          tipo?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_pdv_destino_id_fkey"
            columns: ["pdv_destino_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_pdv_origem_id_fkey"
            columns: ["pdv_origem_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_de_venda: {
        Row: {
          created_at: string
          id: string
          nome: string
          permite_venda: boolean
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          permite_venda?: boolean
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          permite_venda?: boolean
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cargo: string
          created_at: string
          email: string
          id: string
          nome: string
          pdv_id: string | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          pdv_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          pdv_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_pdv_id_fkey"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "pontos_de_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      record_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          data_snapshot: Json
          entity: string
          id: string
          record_id: string
          version_number: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          data_snapshot: Json
          entity: string
          id?: string
          record_id: string
          version_number?: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          data_snapshot?: Json
          entity?: string
          id?: string
          record_id?: string
          version_number?: number
        }
        Relationships: []
      }
      sangrias: {
        Row: {
          barbantes: string
          bobinas: string
          caixas_almeida: string
          cartelas_vazias: string
          created_at: string
          data: string
          id: string
          notacoes: string
          ponto_venda: string
          sangria: string
          updated_at: string
          usuario: string | null
        }
        Insert: {
          barbantes?: string
          bobinas?: string
          caixas_almeida?: string
          cartelas_vazias?: string
          created_at?: string
          data?: string
          id?: string
          notacoes?: string
          ponto_venda: string
          sangria?: string
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          barbantes?: string
          bobinas?: string
          caixas_almeida?: string
          cartelas_vazias?: string
          created_at?: string
          data?: string
          id?: string
          notacoes?: string
          ponto_venda?: string
          sangria?: string
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          target_pdv: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          target_pdv?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_pdv?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          module: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          module?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          module?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_risk_profiles: {
        Row: {
          after_hours_ops: number
          high_adjustments: number
          id: string
          multi_edit_count: number
          risk_level: string
          risk_score: number
          total_adjustments: number
          updated_at: string
          user_name: string
        }
        Insert: {
          after_hours_ops?: number
          high_adjustments?: number
          id?: string
          multi_edit_count?: number
          risk_level?: string
          risk_score?: number
          total_adjustments?: number
          updated_at?: string
          user_name: string
        }
        Update: {
          after_hours_ops?: number
          high_adjustments?: number
          id?: string
          multi_edit_count?: number
          risk_level?: string
          risk_score?: number
          total_adjustments?: number
          updated_at?: string
          user_name?: string
        }
        Relationships: []
      }
      vendas_diarias: {
        Row: {
          codigo_produto: string
          created_at: string
          data: string
          forma_pagamento: string
          id: string
          observacao: string
          ponto_venda: string
          produto: string
          quantidade: number
          status: string
          total: number | null
          updated_at: string
          usuario: string | null
          valor_unitario: number
        }
        Insert: {
          codigo_produto?: string
          created_at?: string
          data?: string
          forma_pagamento?: string
          id?: string
          observacao?: string
          ponto_venda: string
          produto: string
          quantidade?: number
          status?: string
          total?: number | null
          updated_at?: string
          usuario?: string | null
          valor_unitario?: number
        }
        Update: {
          codigo_produto?: string
          created_at?: string
          data?: string
          forma_pagamento?: string
          id?: string
          observacao?: string
          ponto_venda?: string
          produto?: string
          quantidade?: number
          status?: string
          total?: number | null
          updated_at?: string
          usuario?: string | null
          valor_unitario?: number
        }
        Relationships: []
      }
      vendas_registros: {
        Row: {
          ano: number
          created_at: string
          dados_customizados: Json | null
          id: string
          mes: number
          ponto_venda: string
          total_calculado: number
          updated_at: string
          usuario: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          dados_customizados?: Json | null
          id?: string
          mes: number
          ponto_venda: string
          total_calculado?: number
          updated_at?: string
          usuario?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          dados_customizados?: Json | null
          id?: string
          mes?: number
          ponto_venda?: string
          total_calculado?: number
          updated_at?: string
          usuario?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_transfer: {
        Args: {
          _confirmado_por: string
          _foto_recebimento?: string
          _observacao_recebimento?: string
          _quantidade_recebida: number
          _transfer_id: string
        }
        Returns: undefined
      }
      get_diario_pdv_id: { Args: { _diario_id: string }; Returns: string }
      get_user_pdv_id: { Args: { _user_id: string }; Returns: string }
      get_user_pdv_name: { Args: { _user_id: string }; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_diario_open: { Args: { _diario_id: string }; Returns: boolean }
      validate_transfer_stock: {
        Args: { _pdv_id: string; _produto_codigo: string; _quantidade: number }
        Returns: boolean
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
