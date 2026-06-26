import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(url, key);

export type Database = {
  public: {
    Tables: {
      strategies: {
        Row: {
          id: string;
          user_id: string;
          map: string;
          title: string;
          description: string | null;
          tags: string[] | null;
          is_public: boolean;
          board_json: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["strategies"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["strategies"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
    };
  };
};
