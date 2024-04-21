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
      datasource: {
        Row: {
          content: string | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          organization_id: string;
          url: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          organization_id?: string;
          url: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          organization_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_datasource_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
        ];
      };
      email: {
        Row: {
          body: string;
          cleaned_body: string | null;
          created_at: string;
          email_bcc: string[] | null;
          email_cc: string[] | null;
          email_from: string;
          email_from_name: string;
          id: string;
          is_perfect: boolean | null;
          organization_id: string;
          role: string;
          thread_id: string;
        };
        Insert: {
          body: string;
          cleaned_body?: string | null;
          created_at?: string;
          email_bcc?: string[] | null;
          email_cc?: string[] | null;
          email_from: string;
          email_from_name: string;
          id?: string;
          is_perfect?: boolean | null;
          organization_id: string;
          role?: string;
          thread_id?: string;
        };
        Update: {
          body?: string;
          cleaned_body?: string | null;
          created_at?: string;
          email_bcc?: string[] | null;
          email_cc?: string[] | null;
          email_from?: string;
          email_from_name?: string;
          id?: string;
          is_perfect?: boolean | null;
          organization_id?: string;
          role?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_email_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_email_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'thread';
            referencedColumns: ['id'];
          },
        ];
      };
      member: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: number;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_member_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_member_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      organization: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          inbound_email: string;
          name: string;
          onboarding: Json;
          slug: string;
          support_email: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          inbound_email: string;
          name: string;
          onboarding?: Json;
          slug: string;
          support_email: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          inbound_email?: string;
          name?: string;
          onboarding?: Json;
          slug?: string;
          support_email?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_organization_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reply: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_perfect: boolean | null;
          organization_id: string;
          thread_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_perfect?: boolean | null;
          organization_id: string;
          thread_id?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_perfect?: boolean | null;
          organization_id?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_reply_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_reply_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'thread';
            referencedColumns: ['id'];
          },
        ];
      };
      section: {
        Row: {
          content: string;
          datasource_id: string;
          embedding: string | null;
          id: string;
          organization_id: string;
        };
        Insert: {
          content: string;
          datasource_id: string;
          embedding?: string | null;
          id?: string;
          organization_id: string;
        };
        Update: {
          content?: string;
          datasource_id?: string;
          embedding?: string | null;
          id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'public_section_datasource_id_fkey';
            columns: ['datasource_id'];
            isOneToOne: false;
            referencedRelation: 'datasource';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'public_section_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
        ];
      };
      thread: {
        Row: {
          created_at: string;
          email_from: string;
          email_from_name: string;
          id: string;
          last_message_created_at: string;
          message_id: string;
          organization_id: string;
          status: string;
          subject: string;
          tags: string[] | null;
        };
        Insert: {
          created_at?: string;
          email_from: string;
          email_from_name: string;
          id?: string;
          last_message_created_at?: string;
          message_id: string;
          organization_id?: string;
          status?: string;
          subject: string;
          tags?: string[] | null;
        };
        Update: {
          created_at?: string;
          email_from?: string;
          email_from_name?: string;
          id?: string;
          last_message_created_at?: string;
          message_id?: string;
          organization_id?: string;
          status?: string;
          subject?: string;
          tags?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'public_thread_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organization';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_organization_owner: {
        Args: {
          organization_id: string;
        };
        Returns: string[];
      };
      get_user_organizations: {
        Args: {
          user_id: string;
          role: number;
        };
        Returns: string[];
      };
      match_sections: {
        Args: {
          embedding: string;
          match_threshold: number;
          organization_id: string;
        };
        Returns: {
          content: string;
          datasource_id: string;
          embedding: string | null;
          id: string;
          organization_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
