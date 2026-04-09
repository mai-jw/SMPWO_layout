import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "") as string;
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "") as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] 環境変数が設定されていません。VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。");
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
export type ShelfLayoutType = "booklet" | "booklet_doc" | "document" | "pamphlet" | "none";
export type TagType = "lang" | "free" | "free_dist" | "none";
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
  shelves: ShelfData[]; // Fixed to 3 shelves
}

export const DEFAULT_TAG: TagData = { type: "none", value: "" };

export function makeDefaultShelf(type: ShelfLayoutType = "none"): ShelfData {
  const count = type === "booklet" || type === "booklet_doc" ? 2 : type === "document" ? 3 : type === "pamphlet" ? 4 : 0;
  return {
    layout_type: type,
    tag_1: { type: "none", value: "" },
    tag_2: { type: "none", value: "" },
    items: Array(count).fill(null),
  };
}

export function makeInitialCartLayoutV2(): CartLayoutV2 {
  return {
    poster: null,
    shelves: [
      makeDefaultShelf("none"),
      makeDefaultShelf("none"),
      makeDefaultShelf("none"),
    ], 
  };
}

export function filledCountV2(layout: CartLayoutV2): number {
  let n = layout.poster !== null ? 1 : 0;
  layout.shelves.forEach((s) => {
    n += s.items.filter((id) => id !== null).length;
  });
  return n;
}

export function maxCountV2(layout: CartLayoutV2): number {
  let n = 1;
  layout.shelves.forEach((s) => {
    const type = s.layout_type;
    n += type === "booklet" || type === "booklet_doc" ? 2 : type === "document" ? 3 : type === "pamphlet" ? 4 : 0;
  });
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
