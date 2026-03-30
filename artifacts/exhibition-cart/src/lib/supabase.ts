import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
