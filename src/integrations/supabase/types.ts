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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      governance_evidence: {
        Row: {
          action: string
          created_at: string
          decision: string
          id: string
          payload_digest: string
          policy_digest: string
          project_id: string | null
          reason_codes: Json
          request_digest: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          decision: string
          id?: string
          payload_digest: string
          policy_digest: string
          project_id?: string | null
          reason_codes: Json
          request_digest: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          decision?: string
          id?: string
          payload_digest?: string
          policy_digest?: string
          project_id?: string | null
          reason_codes?: Json
          request_digest?: string
          user_id?: string
        }
        Relationships: []
      }
      governance_memories: {
        Row: {
          consent_at: string
          content: Json
          created_at: string
          expires_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          consent_at?: string
          content: Json
          created_at?: string
          expires_at: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          consent_at?: string
          content?: Json
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      governance_permits: {
        Row: {
          artifact_digest: string
          audience: string
          consumed_at: string | null
          evidence_id: string
          expires_at: string
          id: string
          idempotency_key: string
          nonce: string
          not_before: string
          project_id: string
          request_digest: string
          user_id: string
        }
        Insert: {
          artifact_digest: string
          audience: string
          consumed_at?: string | null
          evidence_id: string
          expires_at: string
          id?: string
          idempotency_key: string
          nonce?: string
          not_before?: string
          project_id: string
          request_digest: string
          user_id: string
        }
        Update: {
          artifact_digest?: string
          audience?: string
          consumed_at?: string | null
          evidence_id?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          nonce?: string
          not_before?: string
          project_id?: string
          request_digest?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_permits_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "governance_evidence"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_projects: {
        Row: {
          approval_digest: string | null
          artifact: Json
          brief: string
          coordinator: string
          created_at: string
          digest: string
          id: string
          revision: number
          status: string
          title: string
          updated_at: string
          user_id: string
          workflow: string
        }
        Insert: {
          approval_digest?: string | null
          artifact: Json
          brief: string
          coordinator: string
          created_at?: string
          digest: string
          id?: string
          revision?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workflow: string
        }
        Update: {
          approval_digest?: string | null
          artifact?: Json
          brief?: string
          coordinator?: string
          created_at?: string
          digest?: string
          id?: string
          revision?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workflow?: string
        }
        Relationships: []
      }
      tamv_ai_projects: {
        Row: {
          approved_version: number | null
          assessment: Json | null
          config: Json
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          use_case: string
          version: number
        }
        Insert: {
          approved_version?: number | null
          assessment?: Json | null
          config?: Json
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
          use_case: string
          version?: number
        }
        Update: {
          approved_version?: number | null
          assessment?: Json | null
          config?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          use_case?: string
          version?: number
        }
        Relationships: []
      }
      tamv_hypercore_audit_events: {
        Row: {
          core: string
          details: Json
          event_hash: string
          event_id: string
          event_name: string
          input_hash: string
          lane: string | null
          occurred_at: string
          phase: string
          previous_hash: string
          sequence_id: number
          trace_id: string
        }
        Insert: {
          core: string
          details?: Json
          event_hash: string
          event_id?: string
          event_name: string
          input_hash: string
          lane?: string | null
          occurred_at: string
          phase: string
          previous_hash: string
          sequence_id?: never
          trace_id: string
        }
        Update: {
          core?: string
          details?: Json
          event_hash?: string
          event_id?: string
          event_name?: string
          input_hash?: string
          lane?: string | null
          occurred_at?: string
          phase?: string
          previous_hash?: string
          sequence_id?: never
          trace_id?: string
        }
        Relationships: []
      }
      tamv_project_audit: {
        Row: {
          actor_id: string
          created_at: string
          details: Json
          id: string
          kind: string
          policy_version: string
          project_id: string
          project_version: number
        }
        Insert: {
          actor_id: string
          created_at?: string
          details: Json
          id?: string
          kind: string
          policy_version?: string
          project_id: string
          project_version: number
        }
        Update: {
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          policy_version?: string
          project_id?: string
          project_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tamv_project_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tamv_ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_governance_permit: {
        Args: {
          p_audience: string
          p_digest: string
          p_id: string
          p_nonce: string
        }
        Returns: boolean
      }
      execute_local_governance_project: {
        Args: {
          p_key: string
          p_memory_consent?: boolean
          p_project: string
          p_retention_days?: number
        }
        Returns: Json
      }
      record_governance_decision: {
        Args: {
          p_action: string
          p_decision: string
          p_payload_digest: string
          p_policy_digest: string
          p_project: string
          p_reasons: Json
          p_request_digest: string
        }
        Returns: string
      }
      tamv_hypercore_audit_append: {
        Args: {
          p_core: string
          p_details: Json
          p_event_name: string
          p_input_hash: string
          p_lane: string
          p_occurred_at: string
          p_phase: string
          p_trace_id: string
        }
        Returns: undefined
      }
      tamv_project_action: {
        Args: {
          p_action: string
          p_expected_version?: number
          p_payload?: Json
          p_project_id?: string
        }
        Returns: Json
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
