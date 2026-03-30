import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || "") as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "") as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] 環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を Replit Secrets に追加してください。"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export const STORAGE_BUCKET = "exhibition-images";

export interface Item {
  id?: string;
  name: string;
  url: string;
  category: string;
  language: string;
  created_at?: string;
}

export function detectCategoryAndLanguage(filename: string): {
  category: string;
  language: string;
} {
  const lower = filename.toLowerCase();

  let category = "general";
  if (lower.includes("_poster")) {
    category = "poster";
  }

  let language = "other";
  if (lower.includes("_jp")) {
    language = "ja";
  } else if (lower.includes("_en")) {
    language = "en";
  }

  return { category, language };
}
