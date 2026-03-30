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
export const LAYOUTS_TABLE = "layouts";

export interface Item {
  id?: string;
  name: string;
  url: string;
  category: string;
  language: string;
  created_at?: string;
}

export type SlotId =
  | "poster"
  | "shelf1_left"
  | "shelf1_right"
  | "shelf2_left"
  | "shelf2_right"
  | "shelf3_left"
  | "shelf3_right";

export type CartLayout = Record<SlotId, Item | null>;

export const INITIAL_CART_LAYOUT: CartLayout = {
  poster: null,
  shelf1_left: null,
  shelf1_right: null,
  shelf2_left: null,
  shelf2_right: null,
  shelf3_left: null,
  shelf3_right: null,
};

export const SLOT_IDS: SlotId[] = [
  "poster",
  "shelf1_left",
  "shelf1_right",
  "shelf2_left",
  "shelf2_right",
  "shelf3_left",
  "shelf3_right",
];

export const SLOT_LABELS: Record<SlotId, string> = {
  poster: "ポスター枠",
  shelf1_left: "1段目・左",
  shelf1_right: "1段目・右",
  shelf2_left: "2段目・左",
  shelf2_right: "2段目・右",
  shelf3_left: "3段目・左",
  shelf3_right: "3段目・右",
};

export interface LayoutRecord {
  id?: string;
  period: string;
  cart_a: CartLayout;
  cart_b: CartLayout;
  created_at?: string;
  updated_at?: string;
}

export function detectCategoryAndLanguage(filename: string): {
  category: string;
  language: string;
} {
  const lower = filename.toLowerCase();
  let category = "general";
  if (lower.includes("_poster")) category = "poster";
  let language = "other";
  if (lower.includes("_jp")) language = "ja";
  else if (lower.includes("_en")) language = "en";
  return { category, language };
}
