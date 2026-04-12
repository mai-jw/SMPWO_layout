/* ═══════════════════════════════════════════════════════
     Exhibition Cart Configuration & Constants
   ═══════════════════════════════════════════════════════ */

import { 
  Library, Image as ImageIcon, BookText, Newspaper, 
  Book, BookCopy, Map, BookOpen 
} from "lucide-react";

// ─── Layout Constants ───

export const CART_IMAGE_URL = "https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/cart_empty_guid.png";

/**
 * Coordinate mapping for shelf placement (Percentages)
 */
export const SHELF_COORDINATES = [
  { tag: "36.5%", items: "39.0%", tagH: "2%", itemsH: "14.5%" },
  { tag: "54.9%", items: "57.4%", tagH: "2%", itemsH: "14.5%" },
  { tag: "72.0%", items: "74.5%", tagH: "2%", itemsH: "14.5%" },
];

export const POSTER_PLACEMENT = {
  top: "1.8%",
  left: "35.6%",
  width: "29.0%",
  aspect: "aspect-[1/1.48]",
};

/**
 * Filter definitions for the gallery sidebars
 */
export const GALLERY_FILTER_LABELS = {
  all: "すべて",
  poster: "ポスター",
  booklet: "冊子類",
  magazine: "雑誌",
  booklet_doc: "書籍\n(冊子サイズ)",
  document: "書籍\n(文庫サイズ)",
  pamphlet: "パンフレット/\n招待状",
  bible: "聖書",
} as const;

export const GALLERY_FILTER_ICONS = {
  all: Library,
  poster: ImageIcon,
  booklet: BookText,
  magazine: Newspaper,
  booklet_doc: Book,
  document: BookCopy,
  pamphlet: Map,
  bible: BookOpen,
} as const;

export const LAYOUT_TO_CATEGORIES: Record<string, string[]> = {
  booklet: ["booklet", "magazine"],
  booklet_doc: ["booklet_doc"],
  document: ["document", "bible"],
  bible: ["document", "bible"],
  pamphlet: ["pamphlet", "invitation"],
};

export const LANG_FILTER_OPTIONS = [
  { key: "all", label: "すべての言語" },
  { key: "ja", label: "日本語" },
  { key: "en", label: "英語" },
  { key: "zh_hans", label: "中国語（簡体字）" },
  { key: "zh_hant", label: "中国語（繁体字）" },
  { key: "ko", label: "韓国語" },
  { key: "vi", label: "ベトナム語" },
  { key: "tl", label: "タガログ語" },
  { key: "th", label: "タイ語" },
  { key: "id", label: "インドネシア語" },
  { key: "es", label: "スペイン語" },
  { key: "foreign", label: "外国語" },
];

export const EXPLICIT_LANG_KEYS = ["ja", "en", "zh_hans", "zh_hant", "ko", "vi", "tl", "th", "id", "es"];
