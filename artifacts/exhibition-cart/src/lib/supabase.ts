import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("SUPABASE_ANON_KEY");
  console.error(`[Supabase Error] Missing required environment variables: ${missing.join(", ")}. Ensure they are prefixed with NEXT_PUBLIC_ for client access. Current process.env check:`, {
    URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder-url-ensure-env-is-set.supabase.co",
  supabaseAnonKey || "placeholder-key-ensure-env-is-set"
);

/**
 * Basic connectivity check helper for debugging
 */
export async function checkConnection() {
  try {
    const { data, error } = await supabase.from("items").select("count").limit(1);
    if (error) throw error;
    return { ok: true, msg: "Connected successfully" };
  } catch (err: any) {
    console.error("[Supabase Connection Check Failed]", err);
    return { ok: false, msg: err.message };
  }
}

export const STORAGE_BUCKET = "exhibition-images";
export const LAYOUTS_TABLE = "layouts";

/* ─── Item ─── */
export interface Item {
  id?: string;
  name: string;
  url: string;
  category: string;
  language: string;
  poster_type?: string;
  created_at?: string;
}

/* ─── Cart Layout V2 ─── */
export type ShelfLayoutType = "booklet" | "booklet_doc" | "document" | "pamphlet" | "bible" | "none";
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
  posterType: string; // "マグポス" | "コルトン" | "その他" | ""
  shelves: ShelfData[]; // Fixed to 3 shelves
}

export const DEFAULT_TAG: TagData = { type: "none", value: "" };

export function makeDefaultShelf(type: ShelfLayoutType = "none"): ShelfData {
  const count = (type === "booklet" || type === "booklet_doc") ? 2 : (type === "document" || type === "bible") ? 3 : type === "pamphlet" ? 4 : 0;
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
    posterType: "",
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
  
  // Default values
  let category = "booklet";
  let language = "ja";

  // Category detection
  if (lower.includes("_poster")) category = "poster";
  else if (lower.includes("_mag")) category = "magazine";
  else if (lower.includes("_bible")) category = "bible";
  else if (lower.includes("_book_doc")) category = "booklet_doc";
  else if (lower.includes("_book")) category = "document";
  else if (lower.includes("_pamphlet") || lower.includes("_invit")) category = "pamphlet";

  // Language detection
  if (lower.includes("_en")) language = "en";
  else if (lower.includes("_zh_s")) language = "zh_hans";
  else if (lower.includes("_zh_t")) language = "zh_hant";
  else if (lower.includes("_ko")) language = "ko";
  else if (lower.includes("_vi")) language = "vi";
  else if (lower.includes("_tl")) language = "tl";
  else if (lower.includes("_th")) language = "th";
  else if (lower.includes("_id")) language = "id";
  else if (lower.includes("_es")) language = "es";
  else if (lower.includes("_foreign")) language = "foreign";

  return { category, language };
}
