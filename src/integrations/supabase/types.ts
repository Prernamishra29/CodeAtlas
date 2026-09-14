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
      analyses: {
        Row: {
          attempts: number
          cancel_requested: boolean
          completed_at: string | null
          created_at: string
          current_step: string | null
          dead_lettered: boolean
          error: string | null
          id: string
          locked_at: string | null
          max_attempts: number
          next_run_at: string
          progress: number
          repository_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["analysis_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          cancel_requested?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          dead_lettered?: boolean
          error?: string | null
          id?: string
          locked_at?: string | null
          max_attempts?: number
          next_run_at?: string
          progress?: number
          repository_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          cancel_requested?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          dead_lettered?: boolean
          error?: string | null
          id?: string
          locked_at?: string | null
          max_attempts?: number
          next_run_at?: string
          progress?: number
          repository_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_results: {
        Row: {
          analysis_id: string
          avg_complexity: number
          created_at: string
          folders: Json
          health: Json
          id: string
          languages: Json
          largest_files: Json
          max_complexity: number
          repository_id: string
          total_bytes: number
          total_classes: number
          total_dependencies: number
          total_files: number
          total_folders: number
          total_functions: number
          total_lines: number
          total_symbols: number
        }
        Insert: {
          analysis_id: string
          avg_complexity?: number
          created_at?: string
          folders?: Json
          health?: Json
          id?: string
          languages?: Json
          largest_files?: Json
          max_complexity?: number
          repository_id: string
          total_bytes?: number
          total_classes?: number
          total_dependencies?: number
          total_files?: number
          total_folders?: number
          total_functions?: number
          total_lines?: number
          total_symbols?: number
        }
        Update: {
          analysis_id?: string
          avg_complexity?: number
          created_at?: string
          folders?: Json
          health?: Json
          id?: string
          languages?: Json
          largest_files?: Json
          max_complexity?: number
          repository_id?: string
          total_bytes?: number
          total_classes?: number
          total_dependencies?: number
          total_files?: number
          total_folders?: number
          total_functions?: number
          total_lines?: number
          total_symbols?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: true
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_results_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      code_files: {
        Row: {
          analysis_id: string
          avg_complexity: number
          bytes: number
          complexity: number
          created_at: string
          id: string
          import_count: number
          language: string
          lines: number
          max_complexity: number
          parsed: boolean
          path: string
          repository_id: string
          symbol_count: number
        }
        Insert: {
          analysis_id: string
          avg_complexity?: number
          bytes?: number
          complexity?: number
          created_at?: string
          id?: string
          import_count?: number
          language: string
          lines?: number
          max_complexity?: number
          parsed?: boolean
          path: string
          repository_id: string
          symbol_count?: number
        }
        Update: {
          analysis_id?: string
          avg_complexity?: number
          bytes?: number
          complexity?: number
          created_at?: string
          id?: string
          import_count?: number
          language?: string
          lines?: number
          max_complexity?: number
          parsed?: boolean
          path?: string
          repository_id?: string
          symbol_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "code_files_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_files_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencies: {
        Row: {
          analysis_id: string
          created_at: string
          dependency_type: string
          id: string
          repository_id: string
          source_file_id: string | null
          source_path: string
          specifier: string | null
          target_file_id: string | null
          target_path: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          dependency_type: string
          id?: string
          repository_id: string
          source_file_id?: string | null
          source_path: string
          specifier?: string | null
          target_file_id?: string | null
          target_path: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          dependency_type?: string
          id?: string
          repository_id?: string
          source_file_id?: string | null
          source_path?: string
          specifier?: string | null
          target_file_id?: string | null
          target_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependencies_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencies_target_file_id_fkey"
            columns: ["target_file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      repositories: {
        Row: {
          created_at: string
          default_branch: string
          description: string | null
          id: string
          last_analyzed_at: string | null
          name: string
          owner: string
          status: Database["public"]["Enums"]["repository_status"]
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_branch?: string
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          name: string
          owner?: string
          status?: Database["public"]["Enums"]["repository_status"]
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_branch?: string
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          name?: string
          owner?: string
          status?: Database["public"]["Enums"]["repository_status"]
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      symbols: {
        Row: {
          analysis_id: string
          column: number
          complexity: number
          created_at: string
          file_id: string
          id: string
          line: number
          name: string
          parent_symbol: string | null
          repository_id: string
          symbol_type: string
        }
        Insert: {
          analysis_id: string
          column?: number
          complexity?: number
          created_at?: string
          file_id: string
          id?: string
          line?: number
          name: string
          parent_symbol?: string | null
          repository_id: string
          symbol_type: string
        }
        Update: {
          analysis_id?: string
          column?: number
          complexity?: number
          created_at?: string
          file_id?: string
          id?: string
          line?: number
          name?: string
          parent_symbol?: string | null
          repository_id?: string
          symbol_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "symbols_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symbols_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symbols_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      analysis_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cloning"
        | "scanning"
        | "analyzing"
        | "cancelled"
      repository_status:
        | "not_analyzed"
        | "queued"
        | "analyzing"
        | "completed"
        | "failed"
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
      analysis_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "cloning",
        "scanning",
        "analyzing",
        "cancelled",
      ],
      repository_status: [
        "not_analyzed",
        "queued",
        "analyzing",
        "completed",
        "failed",
      ],
    },
  },
} as const
