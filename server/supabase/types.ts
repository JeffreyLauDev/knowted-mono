export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_conversation_histories: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          id: number;
          message: Json;
          session_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          id?: number;
          message: Json;
          session_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          id?: number;
          message?: Json;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_histories_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversation_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversation_sessions: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string | null;
          title: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id?: string | null;
          title?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string | null;
          title?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversation_sessions_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      calendars: {
        Row: {
          active: boolean | null;
          calender_id: string;
          email: string | null;
          google_id: string;
          id: string;
          name: string | null;
          organization_id: string | null;
          resource_id: string | null;
          user_id: string | null;
        };
        Insert: {
          active?: boolean | null;
          calender_id: string;
          email?: string | null;
          google_id: string;
          id?: string;
          name?: string | null;
          organization_id?: string | null;
          resource_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          active?: boolean | null;
          calender_id?: string;
          email?: string | null;
          google_id?: string;
          id?: string;
          name?: string | null;
          organization_id?: string | null;
          resource_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendars_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          content: string | null;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string | null;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          feedback: string | null;
          id: string;
          organization_id: string;
          user_id: string | null;
        };
        Insert: {
          feedback?: string | null;
          id?: string;
          organization_id: string;
          user_id?: string | null;
        };
        Update: {
          feedback?: string | null;
          id?: string;
          organization_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_shares: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          expires_at: string | null;
          id: string;
          is_enabled: boolean | null;
          meeting_id: string | null;
          share_token: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          meeting_id?: string | null;
          share_token?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          meeting_id?: string | null;
          share_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_shares_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meeting_with_type_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_shares_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_type_permissions: {
        Row: {
          can_read: boolean | null;
          can_write: boolean | null;
          created_at: string | null;
          id: string;
          meeting_type_id: string;
          permission_group_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          can_read?: boolean | null;
          can_write?: boolean | null;
          created_at?: string | null;
          id?: string;
          meeting_type_id: string;
          permission_group_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          can_read?: boolean | null;
          can_write?: boolean | null;
          created_at?: string | null;
          id?: string;
          meeting_type_id?: string;
          permission_group_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_type_permissions_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "meeting_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meeting_type_permissions_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "organization_member_meeting_type_details";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "meeting_type_permissions_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "meeting_type_permissions_permission_group_id_fkey";
            columns: ["permission_group_id"];
            isOneToOne: false;
            referencedRelation: "permission_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_types: {
        Row: {
          analysis_metadata_structure: Json | null;
          created_at: string;
          description_llm: string | null;
          id: string;
          meeting_type: string | null;
          organization_id: string | null;
        };
        Insert: {
          analysis_metadata_structure?: Json | null;
          created_at?: string;
          description_llm?: string | null;
          id?: string;
          meeting_type?: string | null;
          organization_id?: string | null;
        };
        Update: {
          analysis_metadata_structure?: Json | null;
          created_at?: string;
          description_llm?: string | null;
          id?: string;
          meeting_type?: string | null;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meeting_types_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          analysed: boolean;
          bot_id: string | null;
          chapters: string | null;
          duration: number;
          host_email: string | null;
          id: string;
          meeting_date: string | null;
          meeting_type_id: string | null;
          meeting_url: string | null;
          meta_data: Json | null;
          organization_id: string;
          participants_email: string[];
          summary: string | null;
          summary_meta_data: Json | null;
          thumbnail: string | null;
          title: string | null;
          transcript: string | null;
          transcript_json: Json[] | null;
          transcript_url: string | null;
          user_id: string | null;
          video_url: string | null;
        };
        Insert: {
          analysed?: boolean;
          bot_id?: string | null;
          chapters?: string | null;
          duration: number;
          host_email?: string | null;
          id?: string;
          meeting_date?: string | null;
          meeting_type_id?: string | null;
          meeting_url?: string | null;
          meta_data?: Json | null;
          organization_id: string;
          participants_email: string[];
          summary?: string | null;
          summary_meta_data?: Json | null;
          thumbnail?: string | null;
          title?: string | null;
          transcript?: string | null;
          transcript_json?: Json[] | null;
          transcript_url?: string | null;
          user_id?: string | null;
          video_url?: string | null;
        };
        Update: {
          analysed?: boolean;
          bot_id?: string | null;
          chapters?: string | null;
          duration?: number;
          host_email?: string | null;
          id?: string;
          meeting_date?: string | null;
          meeting_type_id?: string | null;
          meeting_url?: string | null;
          meta_data?: Json | null;
          organization_id?: string;
          participants_email?: string[];
          summary?: string | null;
          summary_meta_data?: Json | null;
          thumbnail?: string | null;
          title?: string | null;
          transcript?: string | null;
          transcript_json?: Json[] | null;
          transcript_url?: string | null;
          user_id?: string | null;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "meeting_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meetings_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "organization_member_meeting_type_details";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "meetings_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "meetings_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      n8n_chat_histories: {
        Row: {
          id: number;
          message: Json;
          session_id: string;
        };
        Insert: {
          id?: number;
          message: Json;
          session_id: string;
        };
        Update: {
          id?: number;
          message?: Json;
          session_id?: string;
        };
        Relationships: [];
      };
      organization_member_meeting_types: {
        Row: {
          created_at: string;
          meeting_type_id: string;
          organization_member_id: string;
        };
        Insert: {
          created_at?: string;
          meeting_type_id: string;
          organization_member_id: string;
        };
        Update: {
          created_at?: string;
          meeting_type_id?: string;
          organization_member_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_member_meeting_types_meeting_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "meeting_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organisation_member_meeting_types_meeting_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "organization_member_meeting_type_details";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "organisation_member_meeting_types_meeting_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "organisation_member_meeting_types_member_fkey";
            columns: ["organization_member_id"];
            isOneToOne: false;
            referencedRelation: "organization_members";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          email: string | null;
          google_oauth_refresh_token: string | null;
          id: string;
          is_default: boolean;
          microsoft_oauth_refresh_token: string | null;
          name: string | null;
          organization_id: string;
          team_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          google_oauth_refresh_token?: string | null;
          id?: string;
          is_default?: boolean;
          microsoft_oauth_refresh_token?: string | null;
          name?: string | null;
          organization_id: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          google_oauth_refresh_token?: string | null;
          id?: string;
          is_default?: boolean;
          microsoft_oauth_refresh_token?: string | null;
          name?: string | null;
          organization_id?: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          api_token: string | null;
          created_at: string;
          id: string;
          name: string | null;
          owner_id: string;
        };
        Insert: {
          api_token?: string | null;
          created_at?: string;
          id?: string;
          name?: string | null;
          owner_id: string;
        };
        Update: {
          api_token?: string | null;
          created_at?: string;
          id?: string;
          name?: string | null;
          owner_id?: string;
        };
        Relationships: [];
      };
      permission_groups: {
        Row: {
          can_read_billing: boolean | null;
          can_read_calendar: boolean | null;
          can_read_integrations: boolean | null;
          can_read_meeting_types: boolean | null;
          can_read_organization_details: boolean | null;
          can_read_permission_groups: boolean | null;
          can_read_report_types: boolean | null;
          can_read_teams: boolean | null;
          can_read_webhooks: boolean | null;
          can_write_billing: boolean | null;
          can_write_calendar: boolean | null;
          can_write_integrations: boolean | null;
          can_write_meeting_types: boolean | null;
          can_write_organization_details: boolean | null;
          can_write_permission_groups: boolean | null;
          can_write_report_types: boolean | null;
          can_write_teams: boolean | null;
          can_write_webhooks: boolean | null;
          created_at: string;
          id: string;
          is_monthly_report_enabled: boolean | null;
          team_id: string | null;
          updated_at: string;
        };
        Insert: {
          can_read_billing?: boolean | null;
          can_read_calendar?: boolean | null;
          can_read_integrations?: boolean | null;
          can_read_meeting_types?: boolean | null;
          can_read_organization_details?: boolean | null;
          can_read_permission_groups?: boolean | null;
          can_read_report_types?: boolean | null;
          can_read_teams?: boolean | null;
          can_read_webhooks?: boolean | null;
          can_write_billing?: boolean | null;
          can_write_calendar?: boolean | null;
          can_write_integrations?: boolean | null;
          can_write_meeting_types?: boolean | null;
          can_write_organization_details?: boolean | null;
          can_write_permission_groups?: boolean | null;
          can_write_report_types?: boolean | null;
          can_write_teams?: boolean | null;
          can_write_webhooks?: boolean | null;
          created_at?: string;
          id?: string;
          is_monthly_report_enabled?: boolean | null;
          team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          can_read_billing?: boolean | null;
          can_read_calendar?: boolean | null;
          can_read_integrations?: boolean | null;
          can_read_meeting_types?: boolean | null;
          can_read_organization_details?: boolean | null;
          can_read_permission_groups?: boolean | null;
          can_read_report_types?: boolean | null;
          can_read_teams?: boolean | null;
          can_read_webhooks?: boolean | null;
          can_write_billing?: boolean | null;
          can_write_calendar?: boolean | null;
          can_write_integrations?: boolean | null;
          can_write_meeting_types?: boolean | null;
          can_write_organization_details?: boolean | null;
          can_write_permission_groups?: boolean | null;
          can_write_report_types?: boolean | null;
          can_write_teams?: boolean | null;
          can_write_webhooks?: boolean | null;
          created_at?: string;
          id?: string;
          is_monthly_report_enabled?: boolean | null;
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "permission_groups_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      report_type_meeting_types: {
        Row: {
          created_at: string;
          meeting_type_id: string;
          report_type_id: string;
        };
        Insert: {
          created_at?: string;
          meeting_type_id: string;
          report_type_id: string;
        };
        Update: {
          created_at?: string;
          meeting_type_id?: string;
          report_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_type_meeting_types_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "meeting_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_type_meeting_types_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "organization_member_meeting_type_details";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "report_type_meeting_types_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "report_type_meeting_types_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "report_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_type_meeting_types_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["report_type_id"];
          },
        ];
      };
      report_type_permissions: {
        Row: {
          can_read: boolean | null;
          can_write: boolean | null;
          created_at: string | null;
          id: string;
          permission_group_id: string | null;
          report_type_id: string;
          updated_at: string | null;
        };
        Insert: {
          can_read?: boolean | null;
          can_write?: boolean | null;
          created_at?: string | null;
          id?: string;
          permission_group_id?: string | null;
          report_type_id: string;
          updated_at?: string | null;
        };
        Update: {
          can_read?: boolean | null;
          can_write?: boolean | null;
          created_at?: string | null;
          id?: string;
          permission_group_id?: string | null;
          report_type_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_type_permissions_permission_group_id_fkey";
            columns: ["permission_group_id"];
            isOneToOne: false;
            referencedRelation: "permission_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_type_permissions_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "report_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_type_permissions_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["report_type_id"];
          },
        ];
      };
      report_types: {
        Row: {
          active: boolean | null;
          created_at: string;
          generation_date: string | null;
          id: string;
          organization_id: string;
          report_prompt: string;
          report_schedule: Json;
          report_title: string;
          run_at_utc: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string;
          generation_date?: string | null;
          id?: string;
          organization_id: string;
          report_prompt: string;
          report_schedule?: Json;
          report_title: string;
          run_at_utc?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean | null;
          created_at?: string;
          generation_date?: string | null;
          id?: string;
          organization_id?: string;
          report_prompt?: string;
          report_schedule?: Json;
          report_title?: string;
          run_at_utc?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_types_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          meeting_type_id: string;
          organization_id: string;
          report_date: string;
          report_detail: Json;
          report_prompt: Json;
          report_status: Database["public"]["Enums"]["report_status"];
          report_title: string;
          report_type_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          meeting_type_id: string;
          organization_id: string;
          report_date: string;
          report_detail: Json;
          report_prompt: Json;
          report_status?: Database["public"]["Enums"]["report_status"];
          report_title: string;
          report_type_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          meeting_type_id?: string;
          organization_id?: string;
          report_date?: string;
          report_detail?: Json;
          report_prompt?: Json;
          report_status?: Database["public"]["Enums"]["report_status"];
          report_title?: string;
          report_type_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "meeting_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "organization_member_meeting_type_details";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "reports_meeting_type_id_fkey";
            columns: ["meeting_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["meeting_type_id"];
          },
          {
            foreignKeyName: "reports_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "report_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_report_type_id_fkey";
            columns: ["report_type_id"];
            isOneToOne: false;
            referencedRelation: "v_user_report_type_meeting_types";
            referencedColumns: ["report_type_id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          permission_group_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          permission_group_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          permission_group_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_permission_group_id_fkey";
            columns: ["permission_group_id"];
            isOneToOne: false;
            referencedRelation: "permission_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      meeting_with_type_view: {
        Row: {
          duration: number | null;
          host_email: string | null;
          id: string | null;
          meeting_date: string | null;
          meeting_type: string | null;
          meta_data: Json | null;
          organization_id: string | null;
          participants_email: string[] | null;
          summary_meta_data: Json | null;
          title: string | null;
          transcript: string | null;
          transcript_url: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_member_meeting_type_details: {
        Row: {
          analysis_metadata_structure: Json | null;
          description_llm: string | null;
          meeting_type: string | null;
          meeting_type_id: string | null;
          organization_id: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      v_user_report_type_meeting_types: {
        Row: {
          active: boolean | null;
          analysis_metadata_structure: Json | null;
          description_llm: string | null;
          meeting_type: string | null;
          meeting_type_id: string | null;
          organisation_id: string | null;
          report_prompt: string | null;
          report_schedule: Json | null;
          report_type_id: string | null;
          report_type_title: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "report_types_organization_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown };
        Returns: unknown;
      };
      create_organisation_for_user: {
        Args: { org_name: string; user_id: string };
        Returns: string;
      };
      get_current_org_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_team_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_shared_meeting_by_id: {
        Args: { meeting_id: string; share_token: string };
        Returns: {
          analysed: boolean;
          bot_id: string | null;
          chapters: string | null;
          duration: number;
          host_email: string | null;
          id: string;
          meeting_date: string | null;
          meeting_type_id: string | null;
          meeting_url: string | null;
          meta_data: Json | null;
          organization_id: string;
          participants_email: string[];
          summary: string | null;
          summary_meta_data: Json | null;
          thumbnail: string | null;
          title: string | null;
          transcript: string | null;
          transcript_json: Json[] | null;
          transcript_url: string | null;
          user_id: string | null;
          video_url: string | null;
        }[];
      };
      get_user_team_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      halfvec_avg: {
        Args: { "": number[] };
        Returns: unknown;
      };
      halfvec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      halfvec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      halfvec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      has_meeting_type_read_access: {
        Args: { meeting_type_id: string };
        Returns: boolean;
      };
      has_meeting_type_write_access: {
        Args: { meeting_type_id: string };
        Returns: boolean;
      };
      has_meeting_write_access: {
        Args: { meeting_type_id: string };
        Returns: boolean;
      };
      has_report_type_read_access: {
        Args: { report_type_id: string };
        Returns: boolean;
      };
      has_report_type_write_access: {
        Args: { report_type_id: string };
        Returns: boolean;
      };
      has_team_permission: {
        Args: { permission_name: string };
        Returns: boolean;
      };
      hnsw_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnsw_sparsevec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      hnswhandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      is_org_member: {
        Args: Record<PropertyKey, never> | { org_id: string };
        Returns: boolean;
      };
      is_org_owner: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_user_in_organisation: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_valid_share_token: {
        Args: { meeting_id: string; token: string };
        Returns: boolean;
      };
      ivfflat_bit_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflat_halfvec_support: {
        Args: { "": unknown };
        Returns: unknown;
      };
      ivfflathandler: {
        Args: { "": unknown };
        Returns: unknown;
      };
      l2_norm: {
        Args: { "": unknown } | { "": unknown };
        Returns: number;
      };
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown };
        Returns: unknown;
      };
      match_documents: {
        Args: { query_embedding: string; match_count?: number; filter?: Json };
        Returns: {
          id: number;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      set_current_org: {
        Args: { org_id: string } | { org_id: string; team_id: string };
        Returns: undefined;
      };
      sparsevec_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      sparsevec_send: {
        Args: { "": unknown };
        Returns: string;
      };
      sparsevec_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      user_has_access_to_meeting_type: {
        Args: { user_id: string; meeting_type_id: string };
        Returns: boolean;
      };
      vector_avg: {
        Args: { "": number[] };
        Returns: string;
      };
      vector_dims: {
        Args: { "": string } | { "": unknown };
        Returns: number;
      };
      vector_norm: {
        Args: { "": string };
        Returns: number;
      };
      vector_out: {
        Args: { "": string };
        Returns: unknown;
      };
      vector_send: {
        Args: { "": string };
        Returns: string;
      };
      vector_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
    };
    Enums: {
      report_schedule_frequency: "weekly" | "monthly" | "quarterly";
      report_status: "draft" | "active" | "archived";
      resource_type:
        | "meeting_types"
        | "meetings"
        | "members"
        | "billing"
        | "reports"
        | "integrations"
        | "calendar";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      report_schedule_frequency: ["weekly", "monthly", "quarterly"],
      report_status: ["draft", "active", "archived"],
      resource_type: [
        "meeting_types",
        "meetings",
        "members",
        "billing",
        "reports",
        "integrations",
        "calendar",
      ],
    },
  },
} as const;
