// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      exam_results: {
        Row: {
          id: string;
          student_name: string;
          student_class: string;
          exam_title: string;
          score: number;
          correct_answers: number;
          total_questions: number;
          answered: number;
          violations: number;
          answers: Record<number, string>;
          time_taken: number;
          submitted_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["exam_results"]["Row"],
          "id" | "created_at" | "submitted_at"
        >;
      };
      questions: {
        Row: {
          id: string;
          content: string;
          image_url: string | null;
          options: string[];
          answer: string;
          difficulty: "REGULER" | "HOTS";
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["questions"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["questions"]["Row"],
            "id" | "created_at" | "updated_at"
          >
        >;
      };
    };
  };
};
