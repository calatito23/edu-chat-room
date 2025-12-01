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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_teachers: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          course_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          course_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          course_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_grade_columns: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
          order_number: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
          order_number?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          order_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_grade_columns_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_grades: {
        Row: {
          column_id: string
          created_at: string
          id: string
          max_score: number
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          max_score?: number
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_grades_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "custom_grade_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_answers: {
        Row: {
          answer: Json
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          submission_id: string
        }
        Insert: {
          answer: Json
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          submission_id: string
        }
        Update: {
          answer?: Json
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "evaluation_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_questions: {
        Row: {
          correct_answer: Json
          created_at: string | null
          evaluation_id: string
          id: string
          images: Json | null
          options: Json | null
          order_number: number
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct_answer: Json
          created_at?: string | null
          evaluation_id: string
          id?: string
          images?: Json | null
          options?: Json | null
          order_number: number
          points?: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct_answer?: Json
          created_at?: string | null
          evaluation_id?: string
          id?: string
          images?: Json | null
          options?: Json | null
          order_number?: number
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_questions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_submissions: {
        Row: {
          evaluation_id: string
          id: string
          score: number | null
          student_id: string
          submitted_at: string | null
          total_points: number | null
        }
        Insert: {
          evaluation_id: string
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string | null
          total_points?: number | null
        }
        Update: {
          evaluation_id?: string
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string | null
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_submissions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          id: string
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          course_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_recording: boolean
          mime_type: string
          uploader_id: string
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_recording?: boolean
          mime_type: string
          uploader_id: string
          week_number?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_recording?: boolean
          mime_type?: string
          uploader_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          sender_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          sender_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          professional_school: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          professional_school?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          professional_school?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      zoom_meetings: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          duration: number
          id: string
          join_url: string
          meeting_id: string
          password: string | null
          start_time: string
          topic: string
          updated_at: string
          week_number: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          duration: number
          id?: string
          join_url: string
          meeting_id: string
          password?: string | null
          start_time: string
          topic: string
          updated_at?: string
          week_number?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          duration?: number
          id?: string
          join_url?: string
          meeting_id?: string
          password?: string | null
          start_time?: string
          topic?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "zoom_meetings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_recordings: {
        Row: {
          course_id: string
          created_at: string
          download_url: string | null
          duration: number
          file_size: number | null
          file_type: string | null
          id: string
          meeting_id: string
          recording_count: number
          recording_id: string
          recording_play_url: string | null
          share_url: string | null
          start_time: string
          topic: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          download_url?: string | null
          duration: number
          file_size?: number | null
          file_type?: string | null
          id?: string
          meeting_id: string
          recording_count?: number
          recording_id: string
          recording_play_url?: string | null
          share_url?: string | null
          start_time: string
          topic: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          download_url?: string | null
          duration?: number
          file_size?: number | null
          file_type?: string | null
          id?: string
          meeting_id?: string
          recording_count?: number
          recording_id?: string
          recording_play_url?: string | null
          share_url?: string | null
          start_time?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_course"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_course_files: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _link?: string
          _message: string
          _sender_id: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_member: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      question_type:
        | "short_answer"
        | "multiple_choice"
        | "multiple_select"
        | "file_upload"
        | "true_false"
        | "matching"
      user_role: "student" | "teacher" | "administrator"
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
      question_type: [
        "short_answer",
        "multiple_choice",
        "multiple_select",
        "file_upload",
        "true_false",
        "matching",
      ],
      user_role: ["student", "teacher", "administrator"],
    },
  },
} as const
