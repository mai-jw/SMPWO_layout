import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || "") as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "") as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] 環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を Replit Secrets に追加してください。");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export const STORAGE_BUCKET = "exhibition-images";
export const LAYOUTS_TABLE = "layouts";

/* ─── Item ─── */
export interface Item {
  id?: string;
  name: string;
  url: string;
  category: string;
  language: string;
  created_at?: string;
}

/* ─── Cart Layout V2 ─── */
export type ShelfLayoutType = "2_cols" | "3_cols";
export type TagType = "lang" | "free" | "none";
export type ShelfKey = "shelf1" | "shelf2" | "shelf3";

export interface TagData {
  type: TagType;
  value: string; // "日本語" | "外国語" | custom
}

export interface ShelfData {
  layout_type: ShelfLayoutType;
  tag_1: TagData;
  tag_2: TagData;
  items: (string | null)[]; // item IDs, length matches layout_type
}

export interface CartLayoutV2 {
  poster: string | null; // item ID
  shelf1: ShelfData;
  shelf2: ShelfData;
  shelf3: ShelfData;
}

export const DEFAULT_TAG: TagData = { type: "none", value: "" };

export function makeDefaultShelf(): ShelfData {
  return {
    layout_type: "2_cols",
    tag_1: { type: "none", value: "" },
    tag_2: { type: "none", value: "" },
    items: [null, null],
  };
}

export function makeInitialCartLayoutV2(): CartLayoutV2 {
  return {
    poster: null,
    shelf1: makeDefaultShelf(),
    shelf2: makeDefaultShelf(),
    shelf3: makeDefaultShelf(),
  };
}

export function filledCountV2(layout: CartLayoutV2): number {
  let n = layout.poster !== null ? 1 : 0;
  for (const key of ["shelf1", "shelf2", "shelf3"] as ShelfKey[]) {
    n += layout[key].items.filter((id) => id !== null).length;
  }
  return n;
}

export function maxCountV2(layout: CartLayoutV2): number {
  let n = 1;
  for (const key of ["shelf1", "shelf2", "shelf3"] as ShelfKey[]) {
    n += layout[key].layout_type === "3_cols" ? 3 : 2;
  }
  return n;
}

/* ─── Layout record (Supabase) ─── */
export interface LayoutRecord {
  id?: string;
  period: string;
  cart_a: CartLayoutV2;
  cart_b: CartLayoutV2;
  created_at?: string;
  updated_at?: string;
}

/* ─── Detect helpers ─── */
export function detectCategoryAndLanguage(filename: string): { category: string; language: string } {
  const lower = filename.toLowerCase();
  let category = "general";
  if (lower.includes("_poster")) category = "poster";
  let language = "other";
  if (lower.includes("_jp")) language = "ja";
  else if (lower.includes("_en")) language = "en";
  return { category, language };
}
