"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Image as ImageIcon, X, Download, FileSpreadsheet,
  FileImage, Save, Copy, CalendarDays, RotateCcw, CheckCircle2,
  ChevronDown, Tag, Pencil, ChevronRight, Search, Layers, Upload,
  Check, Trash2, Library, Settings,
} from "lucide-react";
import Link from "next/link";
import { useItems, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useLayouts, useSaveLayout } from "@/hooks/use-layouts";
import { useUI } from "@/context/ui-context";
import {
  type Item, type ShelfKey, type ShelfData, type CartLayoutV2,
  type TagData, type ShelfLayoutType,
  makeInitialCartLayoutV2, makeDefaultShelf, filledCountV2, maxCountV2,
} from "@/lib/supabase";

type CartId = "A" | "B";
type ActiveTarget =
  | { cart: CartId; section: "poster" }
  | { cart: CartId; section: "shelf"; shelfIndex: number; slotIndex: number }
  | { cart: CartId; section: "tag"; shelfIndex: number }
  | null;
type SidebarFilter = "all" | "poster" | "ja" | "foreign";

const FILTER_LABELS: Record<SidebarFilter, string> = {
  all: "すべて", poster: "ポスター", ja: "日本語", foreign: "外国語",
};

function getTagLabel(tag: TagData): string {
  if (tag.type === "none") return "";
  if (tag.type === "free_dist") return "無料配布";
  return tag.value || "";
}

const LANGUAGES = [
  "日本語", "外国語", "英語",
  "中国語（簡体字）", "中国語（繁体字）",
  "韓国語", "ベトナム語", "タガログ語",
  "タイ語", "インドネシア語", "スペイン語",
  "その他",
];

/* ═══════════════════════════════════════════════════════
     TagDisplay — Display-only tag bar on cart (no menus)
   ═══════════════════════════════════════════════════════ */

interface TagDisplayProps {
  shelf: ShelfData;
  shelfIndex: number;
  isActive: boolean;
  onClick: () => void;
}

function TagDisplay({ shelf, shelfIndex, isActive, onClick }: TagDisplayProps) {
  const layout = shelf.layout_type;
  const mode = shelf.tag_1.type;
  
  // Visibility: Hide if "none"
  const isHidden = mode === "none";
  const barBg = isHidden ? "bg-transparent border-transparent" : (
    mode === "free_dist" ? "bg-zinc-900 border-zinc-800"
    : mode === "lang"      ? "bg-red-600 border-red-700"
    :                        "bg-red-500 border-red-600"
  );

  // Position mapping based on layout type
  // Centers (relative to 100% width):
  // 2 slots: 25%, 75%
  // 3 slots: 16.6%, 50%, 83.3% -> Use 16.6% and 83.3% for the 2 tags
  // 4 slots: 12.5%, 37.5%, 62.5%, 87.5% -> Use 25% (between 1&2) and 75% (between 3&4)
  const getPositions = () => {
    if (layout === "document") return ["16.6%", "83.3%"];
    if (layout === "pamphlet") return ["25%", "75%"];
    return ["25%", "75%"]; // booklet or other
  };
  const positions = getPositions();

  const renderContent = () => {
    if (isHidden) return null;
    if (mode === "free_dist") {
      return (
        <div className="flex-1 flex justify-center items-center">
          <span className="text-[10px] font-black tracking-widest truncate uppercase">無料で差し上げています</span>
        </div>
      );
    }
    if (mode === "lang") {
      return (
        <div className="absolute inset-0 flex items-center">
          {shelf.tag_1.value && (
            <div 
              className="absolute -translate-x-1/2 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200"
              style={{ left: positions[0] }}
            >
              <span className="text-[9px] font-black tracking-tight text-red-600 leading-none whitespace-nowrap">{shelf.tag_1.value}</span>
            </div>
          )}
          {shelf.tag_2.value && (
            <div 
              className="absolute -translate-x-1/2 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200"
              style={{ left: positions[1] }}
            >
              <span className="text-[9px] font-black tracking-tight text-red-600 leading-none whitespace-nowrap">{shelf.tag_2.value}</span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex-1 flex justify-center items-center">
         <span className="text-[10px] font-black tracking-widest truncate uppercase">{shelfIndex + 1}段目を選択</span>
      </div>
    );
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full h-full flex items-center px-2 text-white transition-all duration-200 shadow-sm border ${barBg} ${
        isActive ? "ring-2 ring-yellow-400 brightness-110 z-50" : "hover:brightness-105"
      }`}
    >
      <div className="relative flex-1 h-full flex items-center overflow-visible">
        {renderContent()}
      </div>
      {!isHidden && <ChevronDown className="w-3 h-3 shrink-0 opacity-60 ml-auto" />}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
     ItemSlot — Display slot on cart (click triggers side panel)
   ═══════════════════════════════════════════════════════ */

interface ItemSlotProps {
  item: Item | undefined;
  isActive: boolean;
  isSelecting: boolean;
  onClick: () => void;
  onClear: () => void;
  poster?: boolean;
  layoutType?: ShelfLayoutType;
}

function ItemSlot({ item, isActive, isSelecting, onClick, onClear, poster, layoutType }: ItemSlotProps) {
  const aspect = poster ? "aspect-[1/1.4]" 
    : (layoutType === "booklet" || layoutType === "booklet_doc") ? "aspect-[1/1.4]"
    : layoutType === "document" ? "aspect-[1/1.1]"
    : "aspect-[1/3]";

  const bg = item ? "bg-transparent" : (poster ? "bg-white" : "bg-transparent");
  const ring = isActive ? "ring-2 ring-yellow-400 z-10 scale-[1.02]" : "";

  return (
    <div
      className={`relative cursor-pointer transition-all duration-200 group flex flex-col justify-end h-full w-full overflow-hidden ${aspect} ${bg} ${ring}`}
      onClick={onClick}
    >
      {item ? (
        <div className="w-full h-full flex flex-col justify-end overflow-hidden">
          <img 
            src={item.url} 
            alt={item.name} 
            className="w-full h-full object-contain object-bottom drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-[1.02]" 
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {isActive ? (
            <div className="flex flex-col items-center gap-1 animate-pulse">
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                <ImageIcon className="w-3 h-3 text-white" />
              </div>
              <span className="text-yellow-600 text-[8px] font-black">選択中</span>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-30 group-hover:opacity-60 transition-opacity">
              <ImageIcon className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
     ShelfSection — Absolute positioned shelf row on cart
   ═══════════════════════════════════════════════════════ */

interface ShelfSectionProps {
  cartId: CartId;
  shelfIndex: number;
  shelf: ShelfData;
  activeTarget: ActiveTarget;
  isSelecting: boolean;
  itemMap: Record<string, Item>;
  onSlotClick: (cart: CartId, section: "shelf", shelfIndex: number, slotIndex: number) => void;
  onClear: (cart: CartId, section: "shelf", shelfIndex: number, slotIndex: number) => void;
  onTagClick: (cart: CartId, shelfIndex: number) => void;
}

function ShelfSection({
  cartId, shelfIndex, shelf, activeTarget, isSelecting, itemMap,
  onSlotClick, onClear, onTagClick,
}: ShelfSectionProps) {
  /*
   * Stacking Coordinates — shifted down to avoid poster overlap.
   *   Poster:    5% → ~37% (visual bottom including aspect-ratio padding)
   *   Tag 1:    37.5%  (height 2%)
   *   Row 1:    39.5%  (height 13.5%)
   *   Tag 2:    53.0%
   *   Row 2:    55.0%
   *   Tag 3:    68.5%
   *   Row 3:    70.5%
   */
  const tops = [
    { tag: "36.5%", items: "39.0%", tagH: "2%", itemsH: "14.5%" },
    { tag: "54.9%", items: "57.4%", tagH: "2%", itemsH: "14.5%" },
    { tag: "72.0%", items: "74.5%", tagH: "2%", itemsH: "14.5%" },
  ];

  const coord = tops[shelfIndex];
  const isTagActive = activeTarget?.cart === cartId && activeTarget.section === "tag" && (activeTarget as any).shelfIndex === shelfIndex;

  return (
    <>
      {/* Tag Bar */}
      <div 
        className="absolute left-[35.0%] w-[30%] z-30"
        style={{ top: coord.tag, height: coord.tagH }}
      >
        <TagDisplay
          shelf={shelf}
          shelfIndex={shelfIndex}
          isActive={isTagActive}
          onClick={() => onTagClick(cartId, shelfIndex)}
        />
      </div>

      {/* Items Area - Only show if layout is set */}
      {shelf.layout_type !== "none" && (
        <div 
          className={`absolute left-[35.0%] w-[30%] z-20 grid items-end ${
            shelf.layout_type === "pamphlet" ? "grid-cols-4 gap-0.5 px-0.5" : 
            shelf.layout_type === "document" ? "grid-cols-3 gap-0.5 px-0.5" : 
            "grid-cols-2 gap-1 px-1"
          }`}
          style={{ top: coord.items, height: coord.itemsH }}
        >
          {shelf.items.map((itemId, idx) => (
            <ItemSlot
              key={idx}
              item={itemId ? itemMap[itemId] : undefined}
              layoutType={shelf.layout_type}
              isActive={activeTarget?.cart === cartId && activeTarget.section === "shelf" && (activeTarget as any).shelfIndex === shelfIndex && (activeTarget as any).slotIndex === idx}
              isSelecting={isSelecting}
              onClick={() => onSlotClick(cartId, "shelf", shelfIndex, idx)}
              onClear={() => onClear(cartId, "shelf", shelfIndex, idx)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
     CartPanel — Cart display with background template
   ═══════════════════════════════════════════════════════ */

interface CartPanelProps {
  cartId: CartId;
  layout: CartLayoutV2;
  activeTarget: ActiveTarget;
  isSelecting: boolean;
  itemMap: Record<string, Item>;
  onSlotClick: (cart: CartId, section: "poster" | "shelf", shelfIdx?: number, slotIdx?: number) => void;
  onClear: (cart: CartId, section: "poster" | "shelf", shelfIdx?: number, slotIdx?: number) => void;
  onTagClick: (cart: CartId, shelfIdx: number) => void;
}

function CartPanel({
  cartId, layout, activeTarget, isSelecting, itemMap,
  onSlotClick, onClear, onTagClick,
}: CartPanelProps) {
  const isPosterActive = activeTarget?.cart === cartId && activeTarget.section === "poster";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <h3 className="text-xs font-black text-muted-foreground tracking-widest">CART {cartId}</h3>
      <div className="w-[500px]">
        <div 
          className="relative w-full aspect-1080/1350 bg-contain bg-no-repeat bg-center"
          style={{ backgroundImage: `url('https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/cart_empty_guid.png')` }}
        >
          {/* Poster — aligned to the grey frame at top of cart */}
          <div 
            className={`absolute top-[1.8%] left-[35.6%] w-[29.0%] aspect-[1/1.48] transition-all overflow-hidden ${
              isPosterActive ? "ring-2 ring-yellow-400 z-40 shadow-xl scale-[1.01]" : "z-10"
            }`}
          >
            <ItemSlot
              item={layout.poster ? itemMap[layout.poster] : undefined}
              isActive={isPosterActive}
              isSelecting={isSelecting}
              onClick={() => onSlotClick(cartId, "poster")}
              onClear={() => onClear(cartId, "poster")}
              poster
            />
          </div>

          {/* 3 Shelf Rows — absolute positioned, no overlap */}
          {layout.shelves.map((shelf, idx) => (
            <ShelfSection
              key={idx}
              cartId={cartId}
              shelfIndex={idx}
              shelf={shelf}
              activeTarget={activeTarget}
              isSelecting={isSelecting}
              itemMap={itemMap}
              onSlotClick={(c, s, si, sli) => onSlotClick(c, s as any, si, sli)}
              onClear={(c, s, si, sli) => onClear(c, s as any, si, sli)}
              onTagClick={onTagClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
     SelectionSidebar — Context-aware side panel
   ═══════════════════════════════════════════════════════ */

interface SelectionSidebarProps {
  activeTarget: ActiveTarget;
  items: Item[];
  itemMap: Record<string, Item>;
  cartA: CartLayoutV2;
  cartB: CartLayoutV2;
  onSelectItem: (item: Item) => void;
  onLayoutChange: (cart: CartId, shelfIdx: number, t: ShelfLayoutType) => void;
  onTagChange: (cart: CartId, shelfIdx: number, which: "tag_1" | "tag_2", tag: TagData) => void;
  onClose: () => void;
}

/* ═══════════════════════════════════════════════════════
     LeftGallery — Left sidebar for previewing gallery items
   ═══════════════════════════════════════════════════════ */

type GalleryFilterType = "all" | "poster" | "booklet" | "magazine" | "booklet_doc" | "document" | "pamphlet" | "invitation";

const GALLERY_FILTER_LABELS: Record<GalleryFilterType, string> = {
  all: "すべて",
  poster: "ポスター",
  booklet: "冊子",
  magazine: "雑誌",
  booklet_doc: "冊子サイズ書籍",
  document: "文庫本サイズ書籍",
  pamphlet: "パンフレット",
  invitation: "招待状",
};

const LANG_FILTER_OPTIONS = [
  { key: "all", label: "すべて" },
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

const EXPLICIT_LANG_KEYS = ["ja", "en", "zh_hans", "zh_hant", "ko", "vi", "tl", "th", "id", "es"];

interface LeftGalleryProps {
  items: Item[];
  onOpenUpload: () => void;
  width: number;
}

function LeftGallery({ items, onOpenUpload, width }: LeftGalleryProps) {
  const [filter, setFilter] = useState<GalleryFilterType>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();

  const filteredItems = items.filter((item) => {
    const matchCat = filter === "all" || item.category === filter;
    
    // "Foreign" means not in the explicit list above
    const isForeign = !EXPLICIT_LANG_KEYS.includes(item.language) && item.language !== "all";
    const matchLang = langFilter === "all" || (langFilter === "foreign" ? isForeign : item.language === langFilter);
    
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchLang && matchSearch;
  });

  const handleStartEdit = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setEditingId(item.id!);
    setEditValue(item.name);
    setEditCategory(item.category);
    setEditLanguage(item.language);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ 
        id, 
        name: editValue,
        category: editCategory,
        language: editLanguage,
      });
    } catch (err) {
      console.error("Failed to update item:", err);
    }
    setEditingId(null);
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    console.log("Delete button clicked for item:", item.id);
    
    if (!window.confirm("削除してもよろしいですか？")) return;
    
    try {
      console.log("Proceeding with deletion...");
      await deleteMutation.mutateAsync(item);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("削除に失敗しました。詳細なエラー内容はコンソールを確認してください。");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") handleSaveEdit(id);
    if (e.key === "Escape") setEditingId(null);
  };

  return (
    <aside 
      className="shrink-0 bg-white border-r border-border flex flex-col overflow-hidden transition-none"
      style={{ width }}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-9 h-9 text-foreground" />
          <div>
            <p className="text-base font-black text-foreground">画像データ</p>
          </div>
        </div>
        <button 
          onClick={onOpenUpload}
          className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white rounded-lg transition-all flex items-center justify-center group border border-sky-100"
          title="画像をアップロード"
        >
          <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        </button>
      </div>

      <div className="p-3 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-medium border border-border rounded-lg pl-9 pr-3 py-2.5 bg-slate-50 text-foreground outline-none focus:border-sky-400 placeholder:text-slate-400 transition-all" />
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.entries(GALLERY_FILTER_LABELS) as [GalleryFilterType, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key as GalleryFilterType)}
              className={`text-[11px] px-2 py-1.5 rounded-lg font-bold transition-all border ${
                filter === key 
                  ? "bg-sky-500 text-white border-sky-600 shadow-sm" 
                  : "bg-sky-50/50 text-sky-700 border-sky-100 hover:bg-sky-100/80"
              }`}>
              {label}
            </button>
          ))}
        </div>
        
        {/* Language Filter Dropdown */}
        <div className="relative">
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
          >
            {LANG_FILTER_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.key === "all" ? "すべての言語" : opt.label}</option>
            ))}
          </select>
          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredItems.length === 0 ? (
          <p className="text-base text-muted-foreground text-center py-8 font-medium">該当するアイテムなし</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left border border-transparent hover:bg-muted group">
              <img src={item.url} alt={item.name} className="w-14 h-14 object-cover rounded-lg shrink-0 bg-muted shadow-sm" />
              <div className="min-w-0 flex-1 relative pr-8 text-xs font-black">
                {editingId === item.id ? (
                  <div className="relative space-y-2 bg-slate-50 p-2 rounded-lg border border-sky-100 mb-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }} 
                      className="absolute -top-1.5 -right-1.5 p-1 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-all z-10"
                      title="キャンセル"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    <input
                      autoFocus
                      className="text-xs font-black text-foreground bg-white border border-sky-400 rounded px-2 py-1.5 w-full outline-none"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select 
                        value={editCategory} 
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="text-[10px] font-black border border-slate-200 rounded px-1 py-1 bg-white outline-none focus:border-sky-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.entries(GALLERY_FILTER_LABELS).filter(([k]) => k !== "all").map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <select 
                        value={editLanguage} 
                        onChange={(e) => setEditLanguage(e.target.value)}
                        className="text-[10px] font-black border border-slate-200 rounded px-1 py-1 bg-white outline-none focus:border-sky-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {LANG_FILTER_OPTIONS.filter(o => o.key !== "all" && o.key !== "foreign").map(o => (
                          <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                        <option value="other">その他外国語</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button 
                        onClick={(e) => handleDeleteItem(e, item)}
                        className="p-1.5 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 relative z-20"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSaveEdit(item.id!); }} 
                        className="p-1.5 bg-sky-600 text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-sky-700 transition-colors px-4 relative z-20"
                        title="保存"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-black text-foreground truncate leading-tight mb-1" title={item.name}>{item.name}</p>
                    <button 
                      onClick={(e) => handleStartEdit(e, item)}
                      className="absolute right-0 top-0 p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full opacity-60 group-hover:opacity-100 transition-all"
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {editingId !== item.id && item.category && (
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5 uppercase">
                      {GALLERY_FILTER_LABELS[item.category as GalleryFilterType] || item.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

interface SelectionSidebarProps {
  activeTarget: ActiveTarget;
  items: Item[];
  itemMap: Record<string, Item>;
  cartA: CartLayoutV2;
  cartB: CartLayoutV2;
  onSelectItem: (item: Item) => void;
  onLayoutChange: (cart: CartId, shelfIdx: number, type: ShelfLayoutType) => void;
  onTagChange: (cart: CartId, shelfIdx: number, which: "tag_1" | "tag_2", tag: TagData) => void;
  onShelfClick: (cartId: CartId, shelfIdx: number) => void;
  onClose: () => void;
}

function SelectionSidebar({
  activeTarget, items, itemMap, cartA, cartB,
  onSelectItem, onLayoutChange, onTagChange, onShelfClick, onClose,
}: SelectionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<SidebarFilter>("all");

  const cart = activeTarget ? (activeTarget.cart === "A" ? cartA : cartB) : null;
  const isPoster = activeTarget?.section === "poster";
  const shelfIdx = activeTarget ? (activeTarget as any).shelfIndex : 0;
  const shelf = cart?.shelves[shelfIdx] ?? null;

  const renderShelfSettings = () => {
    if (!shelf) return null;
    const isRow1 = shelfIdx === 0;
    const isDocOrPamphlet = shelf.layout_type === "document" || shelf.layout_type === "pamphlet";
    const canLangTag = isRow1 || isDocOrPamphlet;
    const canFreeDist = isDocOrPamphlet;
    const mode = shelf.tag_1.type;

    const setMode = (newMode: "none" | "lang" | "free_dist") => {
      if (newMode === "none") {
        onTagChange(activeTarget.cart, shelfIdx, "tag_1", { type: "none", value: "" });
        onTagChange(activeTarget.cart, shelfIdx, "tag_2", { type: "none", value: "" });
      } else if (newMode === "lang") {
        onTagChange(activeTarget.cart, shelfIdx, "tag_1", { type: "lang", value: mode === "lang" ? shelf.tag_1.value : "" });
        onTagChange(activeTarget.cart, shelfIdx, "tag_2", { type: "none", value: "" });
      } else {
        onTagChange(activeTarget.cart, shelfIdx, "tag_1", { type: "free_dist", value: "無料で差し上げています" });
        onTagChange(activeTarget.cart, shelfIdx, "tag_2", { type: "none", value: "" });
      }
    };

    return (
      <div className="space-y-6 pb-6 mb-6 border-b border-border">
        {/* Layout Type */}
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> レイアウトタイプ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["booklet", "booklet_doc", "document", "pamphlet"] as ShelfLayoutType[]).map((t) => (
              <button
                key={t}
                onClick={() => onLayoutChange(activeTarget.cart, shelfIdx, t)}
                className={`text-[10px] font-bold py-3 rounded-xl transition-all border flex flex-col items-center gap-1 ${
                  shelf.layout_type === t ? "bg-rose-100 text-rose-900 border-rose-300 shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span className="truncate w-full px-1 text-center font-black text-xs leading-tight">
                  {t === "booklet" ? "冊子/雑誌" : t === "booklet_doc" ? "冊子サイズ書籍" : t === "document" ? "文庫本サイズ書籍" : "パンフレット/招待状"}
                </span>
                <span className="opacity-70 text-[10px] font-black uppercase tracking-tighter">{t === "booklet" || t === "booklet_doc" ? "2 スロット" : t === "document" ? "3 スロット" : "4 スロット"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tag Selection */}
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> タグ設定
          </p>
          <div className="space-y-2">
            <button onClick={() => setMode("none")}
              className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between rounded-xl transition-all border ${
                mode === "none" ? "bg-white text-foreground font-black border-slate-300 shadow-sm" : "bg-slate-50 text-muted-foreground border-transparent hover:bg-slate-100"
              }`}>
              <span>タグなし</span>
              {mode === "none" && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </button>

            {shelf.layout_type === "document" && canFreeDist && (
              <button onClick={() => setMode("free_dist")}
                className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between rounded-xl transition-all border ${
                  mode === "free_dist" ? "bg-zinc-900 text-white font-black border-zinc-950 shadow-md scale-[1.02]" : "bg-zinc-50 text-zinc-500 border-transparent hover:bg-zinc-100"
                }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-current" />
                  <span>無料で差し上げています</span>
                </div>
                {mode === "free_dist" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            )}
            
            <button 
              disabled={!canLangTag}
              onClick={() => setMode("lang")}
              className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between rounded-xl transition-all border ${
                !canLangTag ? "opacity-30 cursor-not-allowed border-transparent" :
                mode === "lang" ? "bg-red-600 text-white font-black border-red-700 shadow-md scale-[1.02]" : "bg-red-50 text-red-700/60 border-transparent hover:bg-red-50/80"
              }`}>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${canLangTag ? "bg-red-400" : "bg-slate-300"}`} />
                <span>言語表示</span>
              </div>
              {mode === "lang" && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>

            {mode === "lang" && (
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 mb-1.5 block px-1">左タグ</label>
                    <select
                      value={shelf.tag_1.value}
                      onChange={(e) => onTagChange(activeTarget.cart, shelfIdx, "tag_1", { type: "lang", value: (e.target as HTMLSelectElement).value })}
                      className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none text-foreground font-black focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                    >
                      <option value="">（言語選択）</option>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 mb-1.5 block px-1">右タグ</label>
                    <select
                      value={shelf.tag_2.type === "lang" ? shelf.tag_2.value : ""}
                      onChange={(e) => {
                        const val = (e.target as HTMLSelectElement).value;
                        onTagChange(activeTarget.cart, shelfIdx, "tag_2", val ? { type: "lang", value: val } : { type: "none", value: "" });
                      }}
                      className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-3 outline-none text-foreground font-black focus:ring-4 focus:ring-primary/10 shadow-sm transition-all"
                    >
                      <option value="">（なし）</option>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              )}

            {shelf.layout_type !== "document" && canFreeDist && (
              <button onClick={() => setMode("free_dist")}
                className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between rounded-xl transition-all border ${
                  mode === "free_dist" ? "bg-zinc-900 text-white font-black border-zinc-950 shadow-md scale-[1.02]" : "bg-zinc-50 text-zinc-500 border-transparent hover:bg-zinc-100"
                }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-current" />
                  <span>無料で差し上げています</span>
                </div>
                {mode === "free_dist" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full shrink-0 bg-card border-l border-border flex flex-col overflow-hidden h-full">
      {/* 1. Shelf Navigation (Fixed/Always on top) */}
      <div className="px-5 py-3 bg-[#f2f1eb] border-b border-border z-30 shadow-sm transition-colors text-left uppercase">
        <p className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Settings className="w-4 h-4" /> 設定
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["A", "B"] as CartId[]).map((cartId) => (
            <div key={cartId} className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-slate-400">
                <Library className="w-3.5 h-3.5" />
                <span className="text-sm font-black uppercase tracking-wider text-slate-400">CART {cartId}</span>
              </div>
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((idx) => {
                  const isActive = activeTarget?.cart === cartId && 
                                  activeTarget?.section === "tag" && 
                                  (activeTarget as any).shelfIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => onShelfClick(cartId, idx)}
                      className={`
                        text-[11px] font-black py-1.5 rounded-lg transition-all border flex flex-col items-center justify-center gap-0.5 w-[85%] self-center
                        ${isActive 
                          ? "bg-amber-100 text-amber-900 border-amber-300 shadow-none scale-[1.02]" 
                          : "bg-white text-slate-600 border-slate-200 hover:border-amber-300/50 hover:bg-slate-50"
                        }
                      `}
                    >
                      <span>{idx + 1}段目</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Header (Sticky) - Only visible when an item is selected */}
      {activeTarget && (
        <div className="py-1 px-3 border-b border-border flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-muted-foreground leading-none">
              {activeTarget.section === "tag" ? `CART ${activeTarget.cart} — ${shelfIdx + 1}段目` : (panelSub || "")}
            </p>
            {activeTarget.section !== "tag" && (
              <p className="text-xl font-black text-foreground mt-1.5">
                {panelTitle || ""}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-all group">
            <X className="w-6 h-6 text-muted-foreground group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      )}

      {/* 3. Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!activeTarget ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-300">
              <Pencil className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-center">
              <p className="text-base font-black text-slate-700 w-full">編集箇所を選択してください</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 leading-relaxed w-full text-left bg-slate-50 p-3 rounded-lg border border-slate-100 mt-3">
                まず段の設定をおこなってください。<br />
                各スロットの画像を選択してください。
              </p>
            </div>
          </div>
        ) : activeTarget.section === "tag" ? (
          <div className="p-5 space-y-6">
            {renderShelfSettings()}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-5 pb-0">
              {!isPoster && renderShelfSettings()}
              {/* Search & Filter */}
              <div className="space-y-3 mb-5">
                <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-1">画像ライブラリ検索</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    className="w-full text-sm font-bold border border-border rounded-xl pl-10 pr-4 py-3 bg-background text-foreground outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50 transition-all shadow-sm" />
                </div>
                {!isPoster && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.entries(FILTER_LABELS) as [SidebarFilter, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => setFilter(key)}
                        className={`text-[10px] py-2.5 rounded-lg font-black transition-all ${
                          filter === key ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Item List */}
            <div className="flex-1 p-2.5 space-y-1.5">
              {filteredItems.length === 0 ? (
                <p className="text-base font-medium text-muted-foreground text-center py-10">該当する画像なし</p>
              ) : (
                filteredItems.map((item) => (
                  <button key={item.id} onClick={() => onSelectItem(item)}
                    className="w-full flex items-center gap-4 rounded-2xl p-3 text-left transition-all border border-transparent hover:bg-muted/80 group">
                    <img src={item.url} alt={item.name} className="w-14 h-14 object-cover rounded-xl shrink-0 bg-muted shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black text-foreground truncate leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.category === "poster" && <span className="text-[10px] font-black bg-violet-100 text-violet-700 rounded px-1.5 py-0.5 tracking-tighter">POSTER</span>}
                        {item.language === "ja" && <span className="text-[10px] font-black bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 tracking-tighter">日本語</span>}
                        {item.language === "en" && <span className="text-[10px] font-black bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 tracking-tighter">EN</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════
     GuidePanel — Shown when nothing is selected
   ═══════════════════════════════════════════════════════ */

function GuidePanel() {
  return (
    <aside className="w-72 shrink-0 bg-card border-l border-border flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Layers className="w-7 h-7 text-primary" />
      </div>
      <p className="text-sm font-bold text-foreground mb-2">要素を選択してください</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        カート上の<strong>ポスター枠</strong>、<strong>タグバー</strong>、または<strong>出版物スロット</strong>をクリックすると、
        ここに設定パネルが表示されます。
      </p>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════
     CartEditor — Main Page
   ═══════════════════════════════════════════════════════ */

export default function CartEditor() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-${now.getDate() <= 15 ? "前半" : "後半"}`;
  });
  const [cartA, setCartA] = useState<CartLayoutV2>(makeInitialCartLayoutV2);
  const [cartB, setCartB] = useState<CartLayoutV2>(makeInitialCartLayoutV2);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(null);
  const { openUploadPanel } = useUI();
  const [exporting, setExporting] = useState<"png" | "pdf" | "xlsx" | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showNewPanel, setShowNewPanel] = useState(false);
  const [newMonth, setNewMonth] = useState(() => new Date().getMonth() + 1);
  const [newHalf, setNewHalf] = useState<"前半" | "後半">(() => new Date().getDate() <= 15 ? "前半" : "後半");

  const canvasRef = useRef<HTMLDivElement>(null);
  const newPanelRef = useRef<HTMLDivElement>(null);

  // Resizable Sidebar State
  const [galleryWidth, setGalleryWidth] = useState(320); // Initial 320px
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      // Minimum width is 320px as per user request
      const newWidth = Math.max(320, e.clientX);
      setGalleryWidth(prev => {
        // Only update if difference is meaningful to prevent excessive re-renders
        if (Math.abs(prev - newWidth) > 1) return newWidth;
        return prev;
      });
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      // Change cursor globally during resize
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newPanelRef.current && !newPanelRef.current.contains(event.target as Node)) {
        setShowNewPanel(false);
      }
    }
    if (showNewPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNewPanel]);

  const { data: items = [], isLoading } = useItems();
  const { data: layouts = [] } = useLayouts();
  const saveLayout = useSaveLayout();

  const itemMap = useMemo(() => {
    return Object.fromEntries(items.filter((i) => i.id).map((i) => [i.id!, i]));
  }, [items]);

  const getSetCart = useCallback((cart: CartId) => cart === "A" ? setCartA : setCartB, []);

  // Click on a slot in the cart → open side panel
  const handleSlotClick = useCallback((cart: CartId, section: "poster" | "shelf", shelfIdx?: number, slotIdx?: number) => {
    setActiveTarget((prev) => {
      if (section === "poster") {
        const same = prev?.cart === cart && prev.section === "poster";
        return same ? null : { cart, section: "poster" };
      }
      const same = prev?.cart === cart && prev.section === "shelf" && (prev as any).shelfIndex === shelfIdx && (prev as any).slotIndex === slotIdx;
      return same ? null : { cart, section: "shelf", shelfIndex: shelfIdx!, slotIndex: slotIdx! };
    });
  }, []);

  // Click on a tag bar → open tag config panel
  const handleTagClick = useCallback((cart: CartId, shelfIdx: number) => {
    setActiveTarget((prev) => {
      const same = prev?.cart === cart && prev.section === "tag" && (prev as any).shelfIndex === shelfIdx;
      return same ? null : { cart, section: "tag", shelfIndex: shelfIdx };
    });
  }, []);

  // Select item from sidebar → assign to active slot & close
  const handleSelectItem = useCallback((item: Item) => {
    if (!activeTarget) return;
    const setter = getSetCart(activeTarget.cart);
    if (activeTarget.section === "poster") {
      setter((prev) => ({ ...prev, poster: item.id! }));
    } else if (activeTarget.section === "shelf") {
      const { shelfIndex, slotIndex } = activeTarget as { shelfIndex: number; slotIndex: number };
      setter((prev) => ({
        ...prev,
        shelves: prev.shelves.map((s, i) => i === shelfIndex ? { ...s, items: s.items.map((id, j) => j === slotIndex ? item.id! : id) } : s),
      }));
    }
    setActiveTarget(null);
  }, [activeTarget, getSetCart]);

  const handleClear = useCallback((cart: CartId, section: "poster" | "shelf", shelfIdx?: number, slotIdx?: number) => {
    const setter = getSetCart(cart);
    if (section === "poster") {
      setter((prev) => ({ ...prev, poster: null }));
    } else {
      setter((prev) => ({
        ...prev,
        shelves: prev.shelves.map((s, i) => i === shelfIdx ? { ...s, items: s.items.map((id, j) => j === slotIdx ? null : id) } : s),
      }));
    }
  }, [getSetCart]);

  const handleLayoutChange = useCallback((cart: CartId, shelfIdx: number, t: ShelfLayoutType) => {
    const setter = getSetCart(cart);
    setter((prev) => {
      const shelf = prev.shelves[shelfIdx];
      const count = t === "pamphlet" ? 4 : t === "document" ? 3 : 2;
      const newItems = Array(count).fill(null).map((_, i) => shelf.items[i] ?? null);
      
      let tag_1 = shelf.tag_1;
      let tag_2 = shelf.tag_2;
      
      const isDocOrPamphlet = t === "document" || t === "pamphlet";
      const isRow1 = shelfIdx === 0;
      
      if (!isRow1 && !isDocOrPamphlet) {
        if (tag_1.type === "lang") tag_1 = { type: "none", value: "" };
        if (tag_2.type === "lang") tag_2 = { type: "none", value: "" };
      }
      if (!isDocOrPamphlet && tag_1.type === "free_dist") {
        tag_1 = { type: "none", value: "" };
      }

      const newShelves = prev.shelves.map((s, i) => i === shelfIdx ? { ...shelf, layout_type: t, items: newItems, tag_1, tag_2 } : s);
      return { ...prev, shelves: newShelves };
    });
  }, [getSetCart]);

  const handleTagChange = useCallback((cart: CartId, shelfIdx: number, which: "tag_1" | "tag_2", tag: TagData) => {
    const setter = getSetCart(cart);
    setter((prev) => ({
      ...prev,
      shelves: prev.shelves.map((s, i) => i === shelfIdx ? { ...s, [which]: tag } : s),
    }));
  }, [getSetCart]);

  const handleReset = () => {
    setCartA(makeInitialCartLayoutV2());
    setCartB(makeInitialCartLayoutV2());
    setActiveTarget(null);
  };

  const isExistingPeriod = useMemo(() => layouts.some(l => l.period === period), [layouts, period]);

  const handleSave = async () => {
    if (!period.trim()) return;

    if (isExistingPeriod) {
      const ok = window.confirm(`「${period}」の上書き保存をします。\n過去のデータに上書きされ、元に戻せなくなりますがよろしいですか？`);
      if (!ok) return;
    }

    setSaveStatus("saving");
    try {
      await saveLayout.mutateAsync({ period, cart_a: cartA, cart_b: cartB });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const handleCreateNew = () => {
    const y = new Date().getFullYear();
    const targetPeriod = `${y}-${String(newMonth).padStart(2, "0")}-${newHalf}`;
    
    // Safety check (should also be disabled in UI)
    if (layouts.some(l => l.period === targetPeriod)) {
      alert(`「${targetPeriod}」は既に存在します。既存データを開いて編集してください。`);
      return;
    }

    setPeriod(targetPeriod);
    
    // Copy from the first layout or use empty
    if (layouts.length > 0) {
      setCartA(layouts[0].cart_a);
      setCartB(layouts[0].cart_b);
    } else {
      setCartA(makeInitialCartLayoutV2());
      setCartB(makeInitialCartLayoutV2());
    }
    setShowNewPanel(false);
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2.5, useCORS: true, backgroundColor: "#f8f8f8" });
      const a = document.createElement("a");
      a.download = `展示カート_${period}.png`;
      a.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
      a.click();
    } finally { setExporting(null); }
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: "#f8f8f8" });
      const imgData = (canvas as HTMLCanvasElement).toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
      pdf.text(`展示カートレイアウト — ${period}`, 12, 10);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
      pdf.text(new Date().toLocaleDateString("ja-JP"), pW - 12, 10, { align: "right" });
      const ratio = (canvas as HTMLCanvasElement).width / (canvas as HTMLCanvasElement).height;
      const imgW = pW - 24;
      const imgH = Math.min(imgW / ratio, pH - 20);
      pdf.addImage(imgData, "PNG", 12, 15, imgW, imgH);
      pdf.save(`展示カート_${period}.pdf`);
    } finally { setExporting(null); }
  };

  const handleExportXlsx = async () => {
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const headers = ["区分", "段", "スロット", "レイアウト", "タグ1", "タグ2", "カートA — 画像名", "", "カートB — 画像名"];
      const rows: (string | number)[][] = [headers];
      const addRow = (区分: string, 段: string, スロット: string, レイアウト: string, タグ1: string, タグ2: string, a: string, b: string) => {
        rows.push([区分, 段, スロット, レイアウト, タグ1, タグ2, a, "", b]);
      };
      const getItemName = (id: string | null) => (id && itemMap[id] ? itemMap[id].name : id ? "（削除済）" : "（未配置）");
      addRow("ポスター", "—", "—", "—", "—", "—", getItemName(cartA.poster), getItemName(cartB.poster));
      
      const maxRows = Math.max(cartA.shelves.length, cartB.shelves.length);
      for (let idx = 0; idx < maxRows; idx++) {
        const la = cartA.shelves[idx]; 
        const lb = cartB.shelves[idx];
        
        const shelfLabel = `${idx + 1}段目`;
        
        if (la || lb) {
          const t1a = la ? getTagLabel(la.tag_1) || "なし" : "—";
          const t1b = lb ? getTagLabel(lb.tag_1) || "なし" : "—";
          const t2a = la ? getTagLabel(la.tag_2) || "なし" : "—";
          const t2b = lb ? getTagLabel(lb.tag_2) || "なし" : "—";
          
          const maxSlots = Math.max(la?.items.length || 0, lb?.items.length || 0);
          for (let i = 0; i < maxSlots; i++) {
            addRow(
              "棚", shelfLabel, `スロット${i + 1}`,
              `${la ? (la.layout_type === "document" ? "3冊" : la.layout_type === "pamphlet" ? "4冊" : "2冊") : "—"} / ${lb ? (lb.layout_type === "document" ? "3冊" : lb.layout_type === "pamphlet" ? "4冊" : "2冊") : "—"}`,
              i === 0 ? t1a : "〃", i === 0 ? t2a : "〃",
              getItemName(la?.items[i] ?? null), getItemName(lb?.items[i] ?? null),
            );
          }
        }
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [8, 6, 8, 12, 10, 10, 28, 2, 28].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, `配置リスト_${period}`);
      XLSX.writeFile(wb, `展示カート_${period}.xlsx`);
    } finally { setExporting(null); }
  };

  const totalA = filledCountV2(cartA);
  const totalB = filledCountV2(cartB);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      {/* Top Toolbar */}
      <div className="shrink-0 bg-white px-4 py-1.5 flex items-center gap-3 relative z-30">
        {/* Absolute border to stay on top of scaled logo */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border z-50 pointer-events-none" />
        
        <div className="flex items-center gap-3 mr-6 tracking-tight h-10 relative">
          <div className="w-12 h-10 flex items-center justify-center relative mx-4">
            <img 
              src="https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/same.gif" 
              alt="SMPWO Logo" 
              className="w-full h-full object-contain scale-[2.3] transform-gpu" 
            />
          </div>
          <span className="font-rounded font-black text-xl tracking-widest text-[#64748b] mt-0.5 relative z-10">SMPWO LAYOUT</span>
        </div>
        
        <div className="flex items-center gap-1.5 bg-white border border-border rounded-none px-2.5 py-0.5 shadow-xs hover:border-primary/40 transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          <select 
            value={period} 
            onChange={(e) => {
              const val = e.target.value;
              setPeriod(val);
              const existing = layouts.find(l => l.period === val);
              if (existing) {
                setCartA(existing.cart_a);
                setCartB(existing.cart_b);
              }
            }}
            className="text-sm font-semibold text-foreground bg-transparent outline-none w-36 cursor-pointer"
          >
            {!layouts.some(l => l.period === period) && (
              <option value={period}>{period}</option>
            )}
            {layouts.map(l => (
              <option key={l.period} value={l.period}>{l.period}</option>
            ))}
          </select>
        </div>
        <div className="relative" ref={newPanelRef}>
          <button onClick={() => setShowNewPanel((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-0.5 rounded-none border border-border bg-white hover:bg-muted font-bold text-foreground transition-all shadow-xs active:scale-95">
            新規作成<ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showNewPanel && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-4 z-30 min-w-[240px] flex flex-col gap-3">
                <p className="text-xs font-bold text-muted-foreground">新しい展示期間</p>
                <div className="flex items-center gap-2">
                  <select value={newMonth} onChange={(e) => setNewMonth(Number(e.target.value))}
                    className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground font-medium outline-none">
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                  <select value={newHalf} onChange={(e) => setNewHalf(e.target.value as "前半" | "後半")}
                    className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground font-medium outline-none">
                    <option value="前半">前半</option>
                    <option value="後半">後半</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateNew}
                  disabled={layouts.some(l => l.period === `${new Date().getFullYear()}-${String(newMonth).padStart(2, "0")}-${newHalf}`)}
                  className="w-full text-sm bg-primary text-white rounded-lg py-2 font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  作成
                </button>
                {layouts.some(l => l.period === `${new Date().getFullYear()}-${String(newMonth).padStart(2, "0")}-${newHalf}`) && (
                  <p className="text-[10px] text-red-500 font-bold text-center">※この期間は既に作成済みです</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saveStatus === "saving" || !period.trim()}
          className={`flex items-center gap-1.5 text-xs px-3 py-1 min-h-[28px] rounded-md font-medium transition-all disabled:opacity-60 ${
            saveStatus === "saved" ? "bg-blue-600 text-white" :
            saveStatus === "error" ? "bg-red-600 text-white" : "bg-blue-800 text-white hover:bg-blue-700 shadow-sm"
          }`}>
          {saveStatus === "saved" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           saveStatus === "saving" ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
           <Save className="w-3.5 h-3.5" />}
          {saveStatus === "saved" ? "保存済み" : saveStatus === "error" ? "エラー" : saveStatus === "saving" ? "保存中…" : (isExistingPeriod ? "上書き保存" : "保存")}
        </button>
        {[
          { key: "png" as const, label: "PNG", icon: <FileImage className="w-3.5 h-3.5" />, cls: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold shadow-xs" },
          { key: "pdf" as const, label: "PDF", icon: <Download className="w-3.5 h-3.5" />, cls: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 font-bold shadow-xs" },
          { key: "xlsx" as const, label: "Excel", icon: <FileSpreadsheet className="w-3.5 h-3.5" />, cls: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100 font-bold shadow-xs" },
        ].map(({ key, label, icon, cls }) => (
          <button key={key} disabled={!!exporting}
            onClick={key === "png" ? handleExportPng : key === "pdf" ? handleExportPdf : handleExportXlsx}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border disabled:opacity-50 transition-all active:scale-95 ${cls}`}>
            {exporting === key ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
            {label}
          </button>
        ))}
      </div>

      {/* Main Content: Left Gallery + Carts + Side Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        <LeftGallery 
          items={items} 
          onOpenUpload={openUploadPanel} 
          width={galleryWidth} 
        />
        
        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className={`
            absolute top-0 bottom-0 w-1.5 cursor-col-resize z-50 hover:bg-primary/20 transition-colors
            ${isResizing ? "bg-primary/40" : "bg-transparent"}
          `}
          style={{ left: galleryWidth - 3 }} 
        />
        <main className="flex-1 overflow-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-foreground tracking-tight">カートレイアウト</h2>
              <span className="text-[10px] bg-card text-muted-foreground border border-border rounded-full px-2.5 py-1 font-bold shadow-xs">
                A: {totalA} / B: {totalB}
              </span>
              {period && (
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-bold shadow-xs">
                  {period}
                </span>
              )}
            </div>
            {activeTarget && (
              <button onClick={() => setActiveTarget(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-lg px-2 py-1 bg-muted transition-colors">
                <X className="w-3 h-3" /> 選択解除
              </button>
            )}
          </div>

          <div className="w-full overflow-x-auto pb-4 pt-2 flex justify-center">
            <motion.div layout className="m-auto shrink-0">
              <div ref={canvasRef as any} className="flex -space-x-[180px] items-start p-4 bg-background shrink-0 -mx-[175px]">
                <CartPanel
                  cartId="A" layout={cartA} activeTarget={activeTarget}
                  isSelecting={false} itemMap={itemMap}
                  onSlotClick={handleSlotClick} onClear={handleClear}
                  onTagClick={handleTagClick}
                />
                <CartPanel
                  cartId="B" layout={cartB} activeTarget={activeTarget}
                  isSelecting={false} itemMap={itemMap}
                  onSlotClick={handleSlotClick} onClear={handleClear}
                  onTagClick={handleTagClick}
                />
              </div>
            </motion.div>
          </div>
        </main>

        {/* Right Side Panel — Now permanently visible with fixed navigation at the top */}
        <div className="z-50 shrink-0 border-l border-border bg-card shadow-lg flex flex-col overflow-hidden">
          <div className="w-72 h-[calc(100vh-56px)] shrink-0 flex flex-col">
            <SelectionSidebar
              activeTarget={activeTarget}
              items={items}
              itemMap={itemMap}
              cartA={cartA}
              cartB={cartB}
              onSelectItem={handleSelectItem}
              onLayoutChange={handleLayoutChange}
              onTagChange={handleTagChange}
              onShelfClick={handleTagClick}
              onClose={() => setActiveTarget(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
