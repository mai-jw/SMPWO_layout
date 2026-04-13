"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Image as ImageIcon, X, Download, FileSpreadsheet,
  FileImage, Save, Copy, CalendarDays, RotateCcw, CheckCircle2,
  ChevronDown, Tag, Pencil, ChevronRight, Search, Layers, Upload,
  Check, Trash2, Library, Settings, Star, Book, BookOpen, FileText,
  Mail, Bookmark, Notebook, Scroll, Contact, Newspaper, BookCopy, Files,
  Map, BookText, Languages, Cloud, Monitor, Smartphone, Home, LayoutGrid, Menu, LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useItems, useUpdateItem, useDeleteItem } from "@/hooks/use-items";
import { useLayouts, useSaveLayout, useDeleteLayout, useLocationsConfig, useSaveLocationsConfig, DEFAULT_LOCATIONS } from "@/hooks/use-layouts";
import { useViewMode } from "@/hooks/use-view-mode";
import { useUI } from "@/context/ui-context";
import { 
  CART_IMAGE_URL, SHELF_COORDINATES, POSTER_PLACEMENT,
  GALLERY_FILTER_LABELS, GALLERY_FILTER_ICONS, 
  LAYOUT_TO_CATEGORIES, LANG_FILTER_OPTIONS, EXPLICIT_LANG_KEYS 
} from "@/lib/config";
import { MobileWizard } from "@/components/MobileWizard";
import {
  type Item, type ShelfKey, type ShelfData, type CartLayoutV2,
  type TagData, type ShelfLayoutType,
  makeInitialCartLayoutV2, makeDefaultShelf, filledCountV2, maxCountV2,
} from "@/lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";

export type CartId = "A" | "B";
export type ActiveTarget =
  | { cart: CartId; section: "poster" }
  | { cart: CartId; section: "shelf"; shelfIndex: number; slotIndex: number }
  | { cart: CartId; section: "tag"; shelfIndex: number }
  | null;
type SidebarFilter = "all" | "poster" | "ja" | "foreign";
const LANGUAGES = [
  "日本語", "外国語", "英語",
  "中国語（簡体字）", "中国語（繁体字）",
  "韓国語", "ベトナム語", "タガログ語",
  "タイ語", "インドネシア語", "スペイン語",
  "その他",
];

const getTagLabel = (tag: TagData | undefined) => {
  if (!tag || tag.type === "none") return "";
  if (tag.type === "free_dist") return "無料配布";
  return tag.value || "";
};

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

  const getPositions = () => {
    if (layout === "document" || layout === "bible") return ["16.6%", "83.3%"];
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
              className="absolute -translate-x-1/2 flex justify-center"
              style={{ left: positions[0] }}
            >
              <span className="text-[10px] font-black tracking-tight text-white leading-none whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{shelf.tag_1.value}</span>
            </div>
          )}
          {shelf.tag_2.value && (
            <div 
              className="absolute -translate-x-1/2 flex justify-center"
              style={{ left: positions[1] }}
            >
              <span className="text-[10px] font-black tracking-tight text-white leading-none whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{shelf.tag_2.value}</span>
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
            crossOrigin="anonymous"
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
  const coord = SHELF_COORDINATES[shelfIndex];
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
      <h3 className="text-xs font-black text-muted-foreground tracking-widest">カート{cartId}</h3>
      <div className="w-[500px]">
        <div className="relative w-full aspect-1080/1350">
          <img 
            src="https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/cart_empty_guid.png"
            alt="Cart Base"
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-contain"
          />
          <div 
            className={`absolute transition-all overflow-hidden ${POSTER_PLACEMENT.aspect} ${
              isPosterActive ? "ring-2 ring-yellow-400 z-40 shadow-xl scale-[1.01]" : "z-10"
            }`}
            style={{ 
              top: POSTER_PLACEMENT.top, 
              left: POSTER_PLACEMENT.left, 
              width: POSTER_PLACEMENT.width 
            }}
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

export type GalleryFilterType = keyof typeof GALLERY_FILTER_LABELS;

interface LeftGalleryProps {
  items: Item[];
  onOpenUpload: () => void;
  width: number;
  cartA?: CartLayoutV2;
  setCartA?: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  cartB?: CartLayoutV2;
  setCartB?: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
}

function LeftGallery({ items, onOpenUpload, width, cartA, setCartA, cartB, setCartB }: LeftGalleryProps) {
  const [filter, setFilter] = useState<GalleryFilterType>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [editPosterType, setEditPosterType] = useState("");
  
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = filter === "all" || item.category === filter;
      
      // "Foreign" means not in the explicit list in EXPLICIT_LANG_KEYS
      const isForeign = !EXPLICIT_LANG_KEYS.includes(item.language) && item.language !== "all";
      const matchLang = langFilter === "all" || (langFilter === "foreign" ? isForeign : item.language === langFilter);
      
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchLang && matchSearch;
    });
  }, [items, filter, langFilter, searchQuery]);

  const handleStartEdit = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setEditingId(item.id!);
    setEditValue(item.name);
    setEditCategory(item.category);
    setEditLanguage(item.language);
    setEditPosterType(item.poster_type || "");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const typeToSave = editCategory === "poster" ? editPosterType : "";
      await updateMutation.mutateAsync({ 
        id, 
        name: editValue,
        category: editCategory,
        language: editLanguage,
        poster_type: typeToSave,
      });

      // 現在表示・編集中のカートに使用されている場合は同期する
      if (editCategory === "poster") {
        if (setCartA && cartA?.poster === id) {
          setCartA(prev => ({ ...prev, posterType: typeToSave }));
        }
        if (setCartB && cartB?.poster === id) {
          setCartB(prev => ({ ...prev, posterType: typeToSave }));
        }
      }
    } catch (err) {
      console.error("Failed to update item:", err);
    }
    setEditingId(null);
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setDeleteConfirmId(item.id!);
  };

  const executeDelete = async (item: Item) => {
    try {
      await deleteMutation.mutateAsync(item);
      setEditingId(null);
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Failed to delete item:", err);
      alert(`削除に失敗しました: ${err.message || "詳細なエラー内容はコンソールを確認してください。"}`);
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
      <div className="py-1 px-4 bg-[#64748b] flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-3">
          <Library className="w-5 h-5 text-white" />
          <div>
            <p className="font-rounded font-black text-sm tracking-widest text-white mt-0.5">LIBRARY</p>
          </div>
        </div>
        <button 
          onClick={onOpenUpload}
          className="p-1.5 bg-[#ffd76d] text-zinc-800 hover:opacity-90 rounded-lg transition-all flex items-center justify-center group shadow-md active:scale-95"
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
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(GALLERY_FILTER_LABELS) as [GalleryFilterType, string][]).map(([key, label]) => {
            const Icon = GALLERY_FILTER_ICONS[key];
            return (
              <button key={key} onClick={() => setFilter(key as GalleryFilterType)}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all border ${
                  filter === key 
                    ? "bg-[#aecbe2] text-slate-800 border-[#9bbad2] shadow-sm" 
                    : "bg-white text-slate-500 border-slate-100 hover:border-sky-200 hover:bg-sky-50/30"
                }`}>
                <Icon className={`w-5 h-5 ${filter === key ? "text-slate-700" : "text-slate-400"}`} />
                <span className="text-[9px] font-bold leading-[1.1] text-center min-h-[2.2em] flex items-center justify-center whitespace-pre-line tracking-tighter">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Language Filter Dropdown */}
        <div className="relative w-2/3">
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="w-full text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
          >
            {LANG_FILTER_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.key === "all" ? "すべての言語" : opt.label}</option>
            ))}
          </select>
          <Languages className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredItems.length === 0 ? (
          <p className="text-base text-muted-foreground text-center py-8 font-medium">該当するアイテムなし</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left border border-transparent hover:bg-sky-50 hover:border-sky-100 group transition-all">
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
                      {editCategory === "poster" && (
                        <select 
                          value={editPosterType} 
                          onChange={(e) => setEditPosterType(e.target.value)}
                          className="col-span-2 text-[10px] font-black border border-amber-200 rounded px-1 py-1 bg-amber-50 text-amber-800 outline-none focus:border-amber-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">ポスタータイプ未設定</option>
                          <option value="マグポス">マグポス</option>
                          <option value="コルトン">コルトン</option>
                          <option value="その他">その他</option>
                        </select>
                      )}
                    </div>
                    <div className="flex items-center justify-end pt-1 gap-2">
                      {deleteConfirmId === item.id ? (
                        <div className="absolute -top-2 left-0 right-0 bg-white/95 backdrop-blur rounded-lg p-2 shadow-lg border border-red-200 flex flex-col items-center justify-center z-50">
                          <p className="text-xs font-bold text-red-600 mb-2">完全に削除しますか？</p>
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={(e) => { e.stopPropagation(); executeDelete(item); }}
                              className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition"
                            >
                              はい
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                              className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200 transition"
                            >
                              戻る
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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

  const panelTitle = activeTarget ? (
    activeTarget.section === "poster" ? "ポスター選択" :
    activeTarget.section === "shelf" ? `${["上段","中段","下段"][(activeTarget as any).shelfIndex]} — スロット${(activeTarget as any).slotIndex + 1} 選択` : ""
  ) : "";
  const panelSub = activeTarget ? `カート ${activeTarget.cart}` : "";

  const LAYOUT_TO_CATEGORIES: Record<string, string[]> = {
    booklet: ["booklet", "magazine"],
    booklet_doc: ["booklet_doc"],
    document: ["document", "bible"],
    bible: ["document", "bible"],
    pamphlet: ["pamphlet", "invitation"],
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTarget?.section === "shelf" && shelf) {
        const allowedCategories = LAYOUT_TO_CATEGORIES[shelf.layout_type] || [];
        return matchesSearch && allowedCategories.includes(item.category);
      }
      if (activeTarget?.section === "poster") {
        return matchesSearch && item.category === "poster";
      }
      const matchesFilter = filter === "all" || item.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchQuery, activeTarget, shelf, filter]);

  const renderShelfSettings = () => {
    if (!shelf) return null;
    const isRow1 = shelfIdx === 0;
    const isDocOrPamphlet = shelf.layout_type === "document" || shelf.layout_type === "pamphlet";
    const canLangTag = isRow1 || isDocOrPamphlet;
    const canFreeDist = isDocOrPamphlet;
    const mode = shelf.tag_1.type;

    const setMode = (newMode: "none" | "lang" | "free_dist") => {
      if (!activeTarget) return;
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
            {(["booklet", "booklet_doc", "document", "bible", "pamphlet"] as ShelfLayoutType[]).map((t) => (
              <button
                key={t}
                onClick={() => activeTarget && onLayoutChange(activeTarget.cart, shelfIdx, t)}
                className={`text-[10px] font-bold py-3 rounded-xl transition-all border flex flex-col items-center justify-center gap-1 ${
                  shelf.layout_type === t ? "bg-rose-100 text-rose-900 border-rose-300 shadow-sm" : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span className="truncate w-full px-1 text-center font-black text-xs leading-[1.1] whitespace-pre-line tracking-tighter">
                  {t === "booklet" ? "冊子類/雑誌" : 
                   t === "booklet_doc" ? "書籍\n(冊子サイズ)" : 
                   t === "document" ? "書籍\n(文庫サイズ)" : 
                   t === "bible" ? "聖書" :
                   "パンフレット/\n招待状"}
                </span>
                <span className="opacity-70 text-[9px] font-black uppercase tracking-tighter mt-0.5">
                  {(t === "document" || t === "bible") ? "3 スロット" : t === "pamphlet" ? "4 スロット" : "2 スロット"}
                </span>
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
                      onChange={(e) => onTagChange(activeTarget!.cart, shelfIdx, "tag_1", { type: "lang", value: (e.target as HTMLSelectElement).value })}
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
                        onTagChange(activeTarget!.cart, shelfIdx, "tag_2", val ? { type: "lang", value: val } : { type: "none", value: "" });
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
                <span className="text-sm font-black tracking-wider text-slate-400">カート{cartId}</span>
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
                      <span>{["上段","中段","下段"][idx]}</span>
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
        <div className="py-1 px-4 border-b border-border flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm min-h-[40px]">
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#64748b] leading-tight flex items-center gap-1.5">
              <span>{panelSub}</span>
              <span className="opacity-40">|</span>
              <span className="text-slate-800">
                {activeTarget.section === "tag" ? `${["上段","中段","下段"][shelfIdx]} 設定` : (panelTitle || "")}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all group">
            <X className="w-5 h-5 text-slate-400 group-hover:rotate-90 transition-transform" />
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
            <div className="p-4 pb-0">
              <div className="space-y-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                    className="w-full text-sm font-bold border border-border rounded-xl pl-10 pr-4 py-3 bg-background text-foreground outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50 transition-all shadow-sm" />
                </div>
                {activeTarget.section === "shelf" && shelf && (
                  <p className="text-[10px] font-bold text-muted-foreground bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 italic">
                    {shelf.layout_type === "booklet" ? "冊子類・雑誌" : 
                     shelf.layout_type === "booklet_doc" ? "書籍 (冊子サイズ)" : 
                     (shelf.layout_type === "document" || shelf.layout_type === "bible") ? "書籍 (文庫サイズ)/聖書" : 
                     "パンフレット/招待状"} の画像を表示中
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredItems.length === 0 ? (
                <p className="text-base font-medium text-muted-foreground text-center py-10">該当する画像なし</p>
              ) : (
                filteredItems.map((item) => (
                  <button key={item.id} onClick={() => onSelectItem(item)}
                    className="w-full flex items-center gap-4 rounded-2xl p-3 text-left transition-all border border-transparent hover:bg-sky-50 hover:border-sky-100 group">
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
        <Library className="w-7 h-7 text-primary" />
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
  const [newLocations, setNewLocations] = useState<string[]>(["すべて"]);
  const [notes, setNotes] = useState("外国語の出版物は、奉仕者が好きな位置に変更できます。\n自分の得意な言語や地点の特色を考えて、自由に動かしてください。");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingLocations, setIsEditingLocations] = useState(false);
  const [locationEditInput, setLocationEditInput] = useState("");
  const [layoutDeleteConfirm, setLayoutDeleteConfirm] = useState(false);
  
  // View Mode state (Device-based + Manual Override)
  const { isMobileView, toggleViewMode, hasMounted } = useViewMode();
  const [isMobileGalleryOpen, setIsMobileGalleryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);
  
  // Mobile Wizard States
  const [mobileViewType, setMobileViewType] = useState<"standard" | "wizard">("wizard");
  const [wizardStep, setWizardStep] = useState<"menu" | "new" | "edit" | "preview" | "select-edit" | "select-delete">("menu");
  const [activeWizardCart, setActiveWizardCart] = useState<CartId>("A");
  const [activeWizardShelf, setActiveWizardShelf] = useState<number>(0); // 0, 1, 2


  const { data: locationsConfig = DEFAULT_LOCATIONS } = useLocationsConfig();
  const saveLocationsConfig = useSaveLocationsConfig();
  const [editingLocList, setEditingLocList] = useState<string[]>([]);
  
  useEffect(() => {
    setEditingLocList(locationsConfig);
  }, [locationsConfig]);

  const formatPeriodDisplay = useCallback((p: string) => {
    if (!p) return "";
    const [datePart, locPart] = p.split("::");
    if (locPart) return `${datePart} (${locPart})`;
    return `${datePart} (すべて)`;
  }, []);

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
  const deleteLayout = useDeleteLayout();

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
      if (!same && isMobileView) setIsMobileSidebarOpen(true);
      return same ? null : { cart, section: "tag", shelfIndex: shelfIdx };
    });
  }, [isMobileView]);

  // Set initial scroll for cart
  const cartScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cartScrollRef.current) {
      const scrollWidth = cartScrollRef.current.scrollWidth;
      const clientWidth = cartScrollRef.current.clientWidth;
      cartScrollRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  }, []);

  // Auto-open sidebar on mobile when a target is selected
  useEffect(() => {
    if (activeTarget && isMobileView) {
      setIsMobileSidebarOpen(true);
    }
  }, [activeTarget, isMobileView]);

  // Select item from sidebar → assign to active slot & close
  const handleSelectItem = useCallback((item: Item) => {
    if (!activeTarget) return;
    const setter = getSetCart(activeTarget.cart);
    if (activeTarget.section === "poster") {
      setter((prev) => ({ 
        ...prev, 
        poster: item.id!,
        posterType: item.poster_type || "" // ポスタータイプを同期
      }));
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
      setter((prev) => ({ ...prev, poster: null, posterType: "" }));
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
      const count = t === "pamphlet" ? 4 : (t === "document" || t === "bible") ? 3 : 2;
      const newItems = Array(count).fill(null).map((_, i) => shelf.items[i] ?? null);
      
      let tag_1 = shelf.tag_1;
      let tag_2 = shelf.tag_2;
      
      const isDocOrPamphlet = t === "document" || t === "bible" || t === "pamphlet";
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
    if (!period.trim() || saveStatus === "saving") return;

    // 上書き保存の確認ダイアログを削除（直接実行）
    setSaveStatus("saving");
    try {
      await saveLayout.mutateAsync({ period, cart_a: cartA, cart_b: cartB });
      setSaveStatus("saved");
      alert(`「${formatPeriodDisplay(period)}」の設定を保存しました。\n※お手元のパソコンに画像や表（PNG/PDF/Excel）として書き出したい場合は、右端のボタンをクリックしてください。`);
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) { 
      console.error("[Save Error] Failed to persist layout to Supabase:", err);
      setSaveStatus("error"); 
      alert(`保存に失敗しました: ${err.message || "不明なエラー"}`);
      setTimeout(() => setSaveStatus("idle"), 3000); 
    }
  };
  
  const executeDeleteLayout = async () => {
    if (!period.trim() || !isExistingPeriod) return;
    
    try {
      await deleteLayout.mutateAsync(period);
      alert("レイアウトを削除しました。");
      handleReset();
      setPeriod(""); // Clear selection
      setActiveTarget(null); // Ensure target is cleared
      setLayoutDeleteConfirm(false);
    } catch (err: any) {
      console.error("[Delete Error] Failed to delete layout:", err);
      alert(`削除に失敗しました: ${err.message || "不明なエラー"}`);
    }
  };

  // Mobile-specific: delete a specific period by key
  const executeDeleteLayoutForPeriod = async (targetPeriod: string) => {
    try {
      await deleteLayout.mutateAsync(targetPeriod);
      if (period === targetPeriod) {
        handleReset();
        setPeriod("");
        setActiveTarget(null);
      }
      setWizardStep("menu");
    } catch (err: any) {
      console.error("[Mobile Delete Error]", err);
      alert(`削除に失敗しました: ${err.message || "不明なエラー"}`);
    }
  };

  // Mobile-specific: load layout for editing
  const loadLayoutForEdit = (targetPeriod: string) => {
    const existing = layouts.find(l => l.period === targetPeriod);
    if (!existing) return;
    setPeriod(existing.period);
    setCartA(existing.cart_a);
    setCartB(existing.cart_b);
    setWizardStep("edit");
  };

  const handleCreateNew = () => {
    const y = new Date().getFullYear();
    const locStr = newLocations.length === 0 || newLocations.includes("すべて") ? "" : `::${newLocations.join(",")}`;
    const targetPeriod = `${y}-${String(newMonth).padStart(2, "0")}-${newHalf}${locStr}`;
    
    // Safety check
    if (layouts.some(l => l.period === targetPeriod)) {
      alert(`「${formatPeriodDisplay(targetPeriod)}」は既に存在します。既存データを開いて編集してください。`);
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

  const saveFileWrapper = async (blob: Blob, suggestedName: string, mimeType?: string, extension?: string) => {
    if ('showSaveFilePicker' in window) {
      try {
        const pickerOptions: any = { suggestedName };
        if (mimeType && extension) {
          pickerOptions.types = [{
            description: 'Files',
            accept: { [mimeType]: [extension] }
          }];
        }
        const handle = await (window as any).showSaveFilePicker(pickerOptions);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // Cancelled by user
        console.warn("[SaveFilePicker] Failed, falling back to classic download:", err);
      }
    }
    
    // Fallback: Use <a> tag download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = suggestedName;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      // Wait for all images to load before capturing
      const images = canvasRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      const canvas = await html2canvas(canvasRef.current, { 
        scale: 2.5, 
        useCORS: true, 
        logging: true, // CORSや描画の問題を追跡しやすくする
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("export-container");
          if (el) {
            el.style.backgroundColor = "white";
            el.style.paddingLeft = "100px";
            el.style.paddingRight = "100px";
            el.style.paddingTop = "40px";
            el.style.paddingBottom = "40px";
          }
        }
      });
      const dataUrl = canvas.toDataURL("image/png");
      
      // Blob変換を経由することでWebViewでの拡張子なしUUIDファイル化を回避
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      await saveFileWrapper(blob, "cart-layout.png", "image/png", ".png");
      alert("PNG画像を保存しました。");
    } finally { setExporting(null); }
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    setExporting("pdf");
    try {
      // Wait for all images to load before capturing
      const images = canvasRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      const canvas = await html2canvas(canvasRef.current, { 
        scale: 2, 
        useCORS: true, 
        logging: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("export-container");
          if (el) {
            el.style.backgroundColor = "white";
            el.style.paddingLeft = "100px";
            el.style.paddingRight = "100px";
            el.style.paddingTop = "40px";
            el.style.paddingBottom = "40px";
          }
        }
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      
      const ratio = canvas.width / canvas.height;
      let imgW = pW - 20;
      let imgH = imgW / ratio;
      
      // If height exceeds page (keeping bottom margin), scale down width too
      if (imgH > pH - 20) {
        imgH = pH - 20;
        imgW = imgH * ratio;
      }
      
      // Center both horizontally and vertically
      const xOffset = (pW - imgW) / 2;
      const yOffset = (pH - imgH) / 2;
      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgW, imgH);
      
      const blob = pdf.output("blob");
      
      await saveFileWrapper(blob, "cart-layout.pdf", "application/pdf", ".pdf");
      alert("PDFドキュメントを保存しました。");
    } finally { setExporting(null); }
  };

  const handleExportXlsx = async () => {
    if (!canvasRef.current) return;
    setExporting("xlsx");
    try {
      // Wait for all images to load before capturing
      const images = canvasRef.current.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));

      // 1. Capture Main Cart Layout Image
      const cartCanvas = await html2canvas(canvasRef.current, { 
        scale: 2, 
        useCORS: true, 
        logging: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("export-container");
          if (el) {
            el.style.backgroundColor = "white";
            el.style.paddingLeft = "100px";
            el.style.paddingRight = "100px";
            el.style.paddingTop = "40px";
            el.style.paddingBottom = "40px";
          }
        }
      });
      const cartImgBase64 = cartCanvas.toDataURL("image/png");

      // 2. Construct Excel Workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("配置レイアウト");

      // Add Cart layout image
      const cartImageId = workbook.addImage({
        base64: cartImgBase64,
        extension: "png",
      });

      const cartRatio = cartCanvas.width / cartCanvas.height;
      const targetWidth = 800; // Reference width in Excel pixels

      worksheet.addImage(cartImageId, {
        tl: { col: 1, row: 1 },
        ext: { width: targetWidth, height: targetWidth / cartRatio }
      });

      // 3. Generate and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      await saveFileWrapper(blob, "cart-layout.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx");
      alert("Excelファイルを保存しました。");
    } catch (err: any) {
      console.error("[Excel Export Error]", err);
      alert("Excel書き出し中にエラーが発生しました。");
    } finally { setExporting(null); }
  };

  const totalA = filledCountV2(cartA);
  const totalB = filledCountV2(cartB);

  return (
    <>
      <AnimatePresence>
        {isEditingLocations && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingLocations(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> 地点の編集</h3>
                <button onClick={() => setIsEditingLocations(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 min-h-[50px]">
                <div className="space-y-1">
                  {editingLocList.map((loc, i) => (
                    <div key={loc} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg group border border-transparent">
                      <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          if (i === 0) return;
                          setEditingLocList(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
                        }} className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30" disabled={i === 0}><ChevronDown className="w-3 h-3 rotate-180" /></button>
                        <button onClick={() => {
                          if (i === editingLocList.length - 1) return;
                          setEditingLocList(prev => { const n = [...prev]; [n[i+1], n[i]] = [n[i], n[i+1]]; return n; });
                        }} className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30" disabled={i === editingLocList.length - 1}><ChevronDown className="w-3 h-3" /></button>
                      </div>
                      <span className="flex-1 text-sm font-bold truncate">{loc}</span>
                      <button onClick={() => setEditingLocList(prev => prev.filter(l => l !== loc))} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {editingLocList.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">地点がありません</p>
                  )}
                </div>
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                <input value={locationEditInput} onChange={e => setLocationEditInput(e.target.value)} onKeyDown={e => {
                  if (e.key === "Enter" && locationEditInput.trim()) {
                    if (!editingLocList.includes(locationEditInput.trim())) setEditingLocList(prev => [...prev, locationEditInput.trim()]);
                    setLocationEditInput("");
                  }
                }} placeholder="新しい地点名" className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary" />
                <button onClick={() => {
                  if (locationEditInput.trim() && !editingLocList.includes(locationEditInput.trim())) {
                    setEditingLocList(prev => [...prev, locationEditInput.trim()]);
                    setLocationEditInput("");
                  }
                }} className="bg-slate-800 text-white px-3 text-sm font-bold rounded-lg hover:bg-slate-700">追加</button>
              </div>
              <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsEditingLocations(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">キャンセル</button>
                <button onClick={() => { saveLocationsConfig.mutate(editingLocList); setIsEditingLocations(false); }} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 flex items-center gap-1.5"><Save className="w-4 h-4"/>保存</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW: Mobile Wizard Main Entry */}
      {isMobileView && mobileViewType === "wizard" && (
        <MobileWizard 
          period={period}
          setPeriod={setPeriod}
          cartA={cartA}
          setCartA={setCartA}
          cartB={cartB}
          setCartB={setCartB}
          items={items}
          itemMap={itemMap}
          handleSave={handleSave}
          handleExportPng={handleExportPng}
          handleExportPdf={handleExportPdf}
          handleExportXlsx={handleExportXlsx}
          handleDelete={executeDeleteLayout}
          onOpenUpload={openUploadPanel}
          saveStatus={saveStatus}
          exporting={exporting}
          step={wizardStep}
          setStep={setWizardStep}
          onToggleStandard={() => setMobileViewType("standard")}
          newMonth={newMonth}
          setNewMonth={setNewMonth}
          newHalf={newHalf}
          setNewHalf={setNewHalf}
          newLocations={newLocations}
          setNewLocations={setNewLocations}
          locationsConfig={locationsConfig}
          handleCreateNew={handleCreateNew}
          formatPeriodDisplay={formatPeriodDisplay}
          layouts={layouts}
          executeDeleteLayoutForPeriod={executeDeleteLayoutForPeriod}
          loadLayoutForEdit={loadLayoutForEdit}
        />
      )}

      {/* Wrap existing content in conditional to hide when showing wizard */}
      <div className={`flex flex-col h-[calc(100vh-56px)] bg-background ${isMobileView && mobileViewType === "wizard" ? "hidden" : "flex"}`}>
      {/* Top Toolbar */}
      <div className="shrink-0 bg-white px-4 py-1.5 flex items-center gap-3 relative z-30">
        {/* Absolute border to stay on top of scaled logo */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-border z-50 pointer-events-none" />

        {/* Mobile: Hamburger menu button at top-left */}
        {isMobileView && (
          <button
            onClick={() => setIsMobileActionMenuOpen(true)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all active:scale-95 shrink-0 select-none ${
              isMobileActionMenuOpen
                ? "bg-primary text-white border-primary shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title="メニューを開く"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Wizard/Standard Toggle for Mobile */}
        {isMobileView && (
          <button 
            onClick={() => setMobileViewType(prev => prev === "wizard" ? "standard" : "wizard")}
            className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary font-black active:scale-95 transition-all shadow-sm"
          >
            {mobileViewType === "wizard" ? <LayoutGrid className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            <span>{mobileViewType === "wizard" ? "通常表示" : "ウィザード"}</span>
          </button>
        )}
        
        <div className={`flex items-center gap-3 tracking-tight h-10 relative ${isMobileView ? "mr-2" : "mr-6"}`}>
          <div className="w-12 h-10 flex items-center justify-center relative mx-4 shrink-0">
            <img 
              src="https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/samesame.gif" 
              alt="SMPWO Logo" 
              className="w-full h-full object-contain transform-gpu scale-[1.6]" 
            />
          </div>
          {!isMobileView && (
            <span className="font-rounded font-black text-xl tracking-widest text-[#64748b] mt-0.5 relative z-10 hidden sm:inline">SMPWO LAYOUT</span>
          )}
        </div>

        {/* Period selector: PC only */}
        {!isMobileView && (
          <div className="flex items-center gap-1.5 bg-white border border-border rounded-none px-2 py-0.5 shadow-xs hover:border-primary/40 transition-colors">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
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
              className="text-xs sm:text-sm font-semibold text-foreground bg-transparent outline-none w-32 sm:w-56 cursor-pointer"
            >
              {!layouts.some(l => l.period === period) && (
                <option value={period}>{formatPeriodDisplay(period)}</option>
              )}
              {layouts.map(l => (
                <option key={l.period} value={l.period}>{formatPeriodDisplay(l.period)}</option>
              ))}
            </select>
          </div>
        )}
        {!isMobileView && (
          <div className="relative" ref={newPanelRef}>
            <button onClick={() => setShowNewPanel((v) => !v)}
              className="flex items-center gap-1.5 text-sm px-2 sm:px-3 py-0.5 rounded-none border border-border bg-white hover:bg-muted font-bold text-foreground transition-all shadow-xs active:scale-95 select-none">
              {isMobileView ? "新規" : "新規作成"}<ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showNewPanel && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-4 z-30 min-w-[240px] flex flex-col gap-3">
                  <p className="text-xs font-bold text-muted-foreground">期間</p>
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
                  {/* Location Selection */}
                  <div className="flex flex-col gap-1.5 border-t border-border mt-1 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-muted-foreground">地点を選択</p>
                        {newLocations.length > 0 && !newLocations.includes("すべて") && (
                          <button
                            onClick={() => setNewLocations([])}
                            className="text-[10px] text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 bg-white px-1.5 py-0.5 rounded transition-all"
                          >すべて解除</button>
                        )}
                      </div>
                      <button 
                        onClick={() => setIsEditingLocations(true)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted"
                        title="地点リストを編集"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto px-1 py-1">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newLocations.includes("すべて")}
                          onChange={() => {
                            setNewLocations(["すべて"]);
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        すべて
                      </label>
                      {locationsConfig.map(loc => (
                        <label key={loc} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!newLocations.includes("すべて") && newLocations.includes(loc)}
                            onChange={() => {
                              setNewLocations(prev => {
                                const filtered = prev.filter(l => l !== "すべて");
                                if (filtered.includes(loc)) {
                                  const res = filtered.filter(l => l !== loc);
                                  return res.length === 0 ? ["すべて"] : res;
                                }
                                return [...filtered, loc];
                              });
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                          />
                          <span className="truncate">{loc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const locStr = newLocations.includes("すべて") ? "" : `::${newLocations.join(",")}`;
                    const targetPeriodFromState = `${new Date().getFullYear()}-${String(newMonth).padStart(2, "0")}-${newHalf}${locStr}`;
                    const isTargetExists = layouts.some(l => l.period === targetPeriodFromState);

                    return (
                      <div className="flex flex-col gap-2 mt-2">
                        <button 
                          onClick={handleCreateNew}
                          disabled={isTargetExists}
                          className="w-full text-sm bg-primary text-white rounded-lg py-2 font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          作成
                        </button>
                        {isTargetExists && (
                          <p className="text-[10px] text-red-500 font-bold text-center">※この組み合わせは既に存在します</p>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div className="flex-1" />
        {!isMobileView && (
          <>
            <button onClick={handleSave} disabled={saveStatus === "saving" || !period.trim()}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 min-h-[28px] rounded-md font-medium transition-all select-none disabled:opacity-60 ${
                saveStatus === "saved" ? "bg-emerald-500 text-white" :
                saveStatus === "error" ? "bg-red-500 text-white" : "bg-[#1b618d] text-white hover:opacity-90 shadow-sm"
              }`}>
              {saveStatus === "saved" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> :
              saveStatus === "saving" ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> :
              <Save className="w-3.5 h-3.5 shrink-0" />}
              <span className="hidden sm:inline">
                {saveStatus === "saved" ? "保存済み" : saveStatus === "error" ? "エラー" : saveStatus === "saving" ? "保存中…" : (isExistingPeriod ? "上書き保存" : "保存")}
              </span>
              <span className="sm:hidden">
                {saveStatus === "saved" ? "OK" : saveStatus === "saving" ? "…" : "保存"}
              </span>
            </button>

            {isExistingPeriod && (
              <div className="relative">
                {layoutDeleteConfirm ? (
                  <div className="absolute right-0 top-full mt-2 bg-white/95 backdrop-blur rounded-lg p-2 shadow-xl border border-red-200 z-[100] flex flex-col items-center min-w-[200px]">
                    <p className="text-xs font-bold text-red-600 mb-2">完全に削除しますか？</p>
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={(e) => { e.stopPropagation(); executeDeleteLayout(); }}
                        className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition"
                      >
                        はい
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setLayoutDeleteConfirm(false); }}
                        className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200 transition"
                      >
                        戻る
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLayoutDeleteConfirm(true); }}
                    className="flex items-center justify-center text-red-500 hover:bg-red-50 w-8 h-8 rounded-md transition-all border border-slate-200 hover:border-red-200 relative z-50 ml-1 shadow-sm active:scale-90 select-none"
                    title="この期間のデータを完全に削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {/* Compact Export Buttons for Mobile */}
            <div className="flex items-center gap-1 px-1 border-l border-border ml-1">
              {[
                { key: "png" as const, label: "PNG", icon: <FileImage className="w-3.5 h-3.5" />, cls: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold shadow-xs" },
                { key: "pdf" as const, label: "PDF", icon: <Download className="w-3.5 h-3.5" />, cls: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 font-bold shadow-xs" },
                { key: "xlsx" as const, label: "Excel", icon: <FileSpreadsheet className="w-3.5 h-3.5" />, cls: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100 font-bold shadow-xs" },
              ].map(({ key, label, icon, cls }) => (
                <button key={key} disabled={!!exporting}
                  onClick={key === "png" ? handleExportPng : key === "pdf" ? handleExportPdf : handleExportXlsx}
                  className={`flex items-center gap-1 text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md border disabled:opacity-50 transition-all active:scale-95 select-none ${cls}`}>
                  {exporting === key ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-white rounded-full animate-spin" /> : icon}
                  <span className="hidden sm:inline">{label}</span>
                  {key === "xlsx" && <span className="sm:hidden">Excel</span>}
                  {key !== "xlsx" && <span className="sm:hidden uppercase">{key}</span>}
                </button>
              ))}
            </div>
          </>
        )}
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border-l border-border ml-1 pl-1">
          <button
            onClick={toggleViewMode}
            className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md border font-bold transition-all active:scale-95 shadow-xs select-none ${
              isMobileView 
                ? "bg-slate-800 text-white border-slate-900" 
                : "bg-white text-slate-700 border-slate-300"
            }`}
            title={isMobileView ? "PC版に切り替え" : "Mobile版に切り替え"}
          >
            {isMobileView ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isMobileView ? "PC版" : "Mobile版"}</span>
          </button>
        </div>
      </div>

      {/* Main Content: Left Gallery + Carts + Side Panel */}
      <div className={`flex flex-1 overflow-hidden relative ${isMobileView ? "pb-16" : ""}`}>
        
        {/* Mobile Gallery Overlay */}
        <AnimatePresence>
          {isMobileGalleryOpen && isMobileView && (
            <div className="fixed inset-0 z-[100]">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileGalleryOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ x: "-100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-slate-800"><Library className="w-5 h-5 text-primary" /> ライブラリ</h3>
                  <button onClick={() => setIsMobileGalleryOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <LeftGallery 
                    items={items} 
                    onOpenUpload={openUploadPanel} 
                    width={280} 
                    cartA={cartA}
                    setCartA={setCartA}
                    cartB={cartB}
                    setCartB={setCartB}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!isMobileView && (
          <div className="shrink-0 h-full relative">
            <LeftGallery 
              items={items} 
              onOpenUpload={openUploadPanel} 
              width={galleryWidth} 
              cartA={cartA}
              setCartA={setCartA}
              cartB={cartB}
              setCartB={setCartB}
            />
            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className={`
                absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-primary/20 transition-colors
                ${isResizing ? "bg-primary/40" : "bg-transparent"}
              `}
            />
          </div>
        )}
        
        <main className="flex-1 overflow-auto p-3 sm:p-5 h-full bg-[#fdfaf3]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-foreground tracking-tight">カートレイアウト</h2>
            </div>
            {activeTarget && (
              <button onClick={() => setActiveTarget(null)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-lg px-2 py-1 bg-white transition-colors shadow-sm">
                <X className="w-3 h-3" /> 選択解除
              </button>
            )}
          </div>

          <div 
            ref={cartScrollRef}
            className={`w-full overflow-x-auto pb-8 pt-2 flex scrollbar-hide active:cursor-grabbing select-none ${isMobileView ? "" : "justify-center"}`}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <motion.div layout className="shrink-0">
              <div ref={canvasRef as any} id="export-container" className="flex flex-col items-center p-4 bg-background shrink-0">
                <div className="flex -space-x-[180px] items-start shrink-0 -mx-[175px]">
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

                {/* Summary Table */}
                <div className="w-full mt-6 flex gap-8 justify-center text-xs">
                  {([{ id: "A" as CartId, layout: cartA, setCart: setCartA }, { id: "B" as CartId, layout: cartB, setCart: setCartB }]).map(({ id, layout, setCart }) => {
                    const SHELF_LABELS = ["上段", "中段", "下段"];
                    const posterItem = layout.poster ? itemMap[layout.poster] : null;
                    return (
                      <div key={id} className="flex-1 max-w-[400px]">
                        <p className="text-center font-black text-sm mb-2 text-foreground">カート{id}</p>
                        <table className="w-full border-collapse text-[11px]">
                          <tbody>
                            {/* Poster */}
                            <tr className="border-t border-slate-300">
                              <td className="py-1.5 pr-2 font-bold text-slate-500 align-top whitespace-nowrap">ポスター</td>
                              <td className="py-1.5">
                                <div className="font-bold text-foreground">{posterItem?.name || "—"}</div>
                                <div className="flex gap-3 mt-0.5">
                                  <span className="text-red-600 font-bold">{posterItem?.language === "ja" ? "日本語" : posterItem?.language === "en" ? "英語" : posterItem?.language || ""}</span>
                                  <span className="text-slate-500">({layout.posterType || posterItem?.poster_type || "未設定"})</span>
                                </div>
                              </td>
                            </tr>
                            {/* Shelves */}
                            {layout.shelves.map((shelf, sIdx) => {
                              const shelfItems = shelf.items.map(itemId => itemId ? itemMap[itemId] : null);
                              const hasItems = shelfItems.some(i => i !== null);
                              const layoutLabel = shelf.layout_type === "booklet" ? "冊冊" : shelf.layout_type === "booklet_doc" ? "冊冊" : shelf.layout_type === "document" ? "冊冊" : shelf.layout_type === "pamphlet" ? "冊冊" : "";
                              return (
                                <tr key={sIdx} className="border-t border-slate-300">
                                  <td className="py-1.5 pr-2 font-bold text-slate-500 align-top whitespace-nowrap">{SHELF_LABELS[sIdx]}</td>
                                  <td className="py-1.5">
                                    {shelf.layout_type === "none" ? (
                                      <span className="text-slate-300">—</span>
                                    ) : (
                                      <>
                                        <div className="font-bold text-foreground">
                                          {Array.from(new Set(shelfItems.map((item) => item?.name).filter(Boolean))).join("、") || "—"}
                                        </div>
                                        <div className="flex gap-3 mt-0.5 flex-wrap">
                                          {shelf.tag_1.type === "lang" && shelf.tag_1.value && (
                                            <span className="text-red-600 font-bold">{shelf.tag_1.value}</span>
                                          )}
                                          {shelf.tag_2.type === "lang" && shelf.tag_2.value && (
                                            <span className="text-red-600 font-bold">{shelf.tag_2.value}</span>
                                          )}
                                          {shelf.tag_1.type === "free_dist" && (
                                            <span className="text-zinc-600 font-bold">無料で差し上げています</span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>

                {/* Supplementary Notes */}
                <div className="w-full mt-4 max-w-[820px] mx-auto">
                  {isEditingNotes ? (
                    <div className="relative">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full text-xs text-foreground bg-white border border-slate-200 rounded-lg outline-none resize-none leading-relaxed font-medium p-3 focus:ring-2 focus:ring-primary/20"
                        placeholder="補足事項を入力..."
                      />
                      <button
                        onClick={() => setIsEditingNotes(false)}
                        className="absolute top-2 right-2 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded hover:bg-primary/90 transition-colors"
                      >
                        完了
                      </button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-wrap">{notes}</p>
                      <button
                        onClick={() => setIsEditingNotes(true)}
                        className="absolute -top-1 -right-1 p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/40 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="補足事項を編集"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileSidebarOpen && isMobileView && (
            <div className="fixed inset-0 z-[100]">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ x: "100%" }} 
                animate={{ x: 0 }} 
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-[300px] bg-white shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-slate-800"><Settings className="w-5 h-5 text-primary" /> 設定・選択</h3>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-hidden">
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
                    onClose={() => setIsMobileSidebarOpen(false)}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Desktop Right Side Panel */}
        {!isMobileView && (
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
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      {isMobileView && (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center px-4 z-[90] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setIsMobileGalleryOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <div className="relative">
              <Library className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase">Library</span>
          </button>
          
          <button 
            onClick={() => {
              if (cartScrollRef.current) {
                 const scrollWidth = cartScrollRef.current.scrollWidth;
                 const clientWidth = cartScrollRef.current.clientWidth;
                 cartScrollRef.current.scrollTo({
                   left: (scrollWidth - clientWidth) / 2,
                   behavior: "smooth"
                 });
              }
            }}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <div className="p-2 bg-slate-100 rounded-full">
              <Home className="w-7 h-7" />
            </div>
          </button>


          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary transition-colors"
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-black tracking-widest uppercase">Layout</span>
          </button>
        </div>
      )}

        {/* Mobile Action Menu Overlay */}
        <AnimatePresence>
          {isMobileActionMenuOpen && isMobileView && (
            <div className="fixed inset-0 z-[110]">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsMobileActionMenuOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col"
              >
                {/* Drawer Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <Menu className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-black tracking-tight text-slate-800">メニュー</h2>
                  </div>
                  <button onClick={() => setIsMobileActionMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Period Selector Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">カートレイアウトの日時</p>
                    <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3">
                      <CalendarDays className="w-5 h-5 text-slate-400 shrink-0" />
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
                          setIsMobileActionMenuOpen(false);
                        }}
                        className="flex-1 text-sm font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                      >
                        {!layouts.some(l => l.period === period) && (
                          <option value={period}>{formatPeriodDisplay(period)}</option>
                        )}
                        {layouts.map(l => (
                          <option key={l.period} value={l.period}>{formatPeriodDisplay(l.period)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Save Section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">レイアウトを保存</p>
                    <button 
                      onClick={() => { handleSave(); setTimeout(() => setIsMobileActionMenuOpen(false), 800); }}
                      disabled={saveStatus === "saving" || !period.trim()}
                      className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-md active:scale-[0.98] ${
                        saveStatus === "saved" ? "bg-emerald-500 text-white" :
                        saveStatus === "error" ? "bg-red-500 text-white" : "bg-[#1b618d] text-white shadow-[#1b618d]/20"
                      }`}
                    >
                      {saveStatus === "saved" ? <CheckCircle2 className="w-6 h-6" /> :
                       saveStatus === "saving" ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> :
                       <Save className="w-6 h-6" />}
                      <span className="text-base">
                        {saveStatus === "saved" ? "保存済み" : saveStatus === "error" ? "エラー" : saveStatus === "saving" ? "保存中…" : (isExistingPeriod ? "上書き保存" : "保存する")}
                      </span>
                    </button>
                  </div>

                  {/* Export Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">書き出し</p>
                      {exporting && <div className="text-[10px] text-primary animate-pulse font-bold">処理中...</div>}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "png" as const, label: "PNG画像", icon: <FileImage className="w-5 h-5" />, color: "bg-amber-50 text-amber-700 border-amber-200" },
                        { key: "pdf" as const, label: "PDF文書", icon: <Download className="w-5 h-5" />, color: "bg-red-50 text-red-700 border-red-200" },
                        { key: "xlsx" as const, label: "Excel", icon: <FileSpreadsheet className="w-5 h-5" />, color: "bg-green-50 text-green-700 border-green-200" },
                      ].map(({ key, label, icon, color }) => (
                        <button key={key} disabled={!!exporting}
                          onClick={() => {
                            if (key === "png") handleExportPng();
                            else if (key === "pdf") handleExportPdf();
                            else handleExportXlsx();
                          }}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 shadow-sm bg-white ${color} ${exporting === key ? "ring-2 ring-primary ring-offset-1" : ""}`}
                        >
                          {icon}
                          <span className="text-[10px] font-bold text-center leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* New Creation Section */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">新規レイアウト作成</p>
                    <div className="flex items-center gap-3">
                      <select value={newMonth} onChange={(e) => setNewMonth(Number(e.target.value))}
                        className="flex-1 text-sm border-2 border-slate-100 rounded-xl px-3 py-3 bg-slate-50 text-slate-800 font-bold outline-none focus:border-primary/30 transition-all">
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m}月</option>
                        ))}
                      </select>
                      <select value={newHalf} onChange={(e) => setNewHalf(e.target.value as "前半" | "後半")}
                        className="flex-1 text-sm border-2 border-slate-100 rounded-xl px-3 py-3 bg-slate-50 text-slate-800 font-bold outline-none focus:border-primary/30 transition-all">
                        <option value="前半">前半</option>
                        <option value="後半">後半</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <p className="text-[10px] font-bold text-slate-400">地点を選択</p>
                         <button onClick={() => setIsEditingLocations(true)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-primary">
                           <Pencil className="w-3.5 h-3.5" />
                         </button>
                       </div>
                       <div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto scrollbar-hide p-1">
                          <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold cursor-pointer transition-all active:scale-95">
                            <input type="checkbox" checked={newLocations.includes("すべて")} onChange={() => setNewLocations(["すべて"])} className="rounded border-slate-300 text-primary" /> 
                            すべて
                          </label>
                          {locationsConfig.map(loc => (
                            <label key={loc} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold cursor-pointer transition-all active:scale-95">
                              <input type="checkbox" checked={!newLocations.includes("すべて") && newLocations.includes(loc)}
                                onChange={() => {
                                  setNewLocations(prev => {
                                    const filtered = prev.filter(l => l !== "すべて");
                                    if (filtered.includes(loc)) {
                                      const res = filtered.filter(l => l !== loc);
                                      return res.length === 0 ? ["すべて"] : res;
                                    }
                                    return [...filtered, loc];
                                  });
                                }}
                                className="rounded border-slate-300 text-primary"
                              />
                              <span className="truncate">{loc}</span>
                            </label>
                          ))}
                       </div>
                    </div>

                    <div className="pt-2">
                      {(() => {
                        const locStr = newLocations.includes("すべて") ? "" : `::${newLocations.join(",")}`;
                        const targetPeriodFromState = `${new Date().getFullYear()}-${String(newMonth).padStart(2, "0")}-${newHalf}${locStr}`;
                        const isTargetExists = layouts.some(l => l.period === targetPeriodFromState);

                        return (
                          <div className="space-y-2">
                            <button 
                              onClick={() => { handleCreateNew(); setTimeout(() => setIsMobileActionMenuOpen(false), 500); }}
                              disabled={isTargetExists}
                              className="w-full text-sm bg-slate-800 text-white rounded-xl py-3 font-black tracking-widest hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-40 disabled:grayscale"
                            >
                              新規作成
                            </button>
                            {isTargetExists && (
                              <p className="text-[10px] text-red-500 font-bold text-center">※この組み合わせは既に存在します</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Delete Section */}
                  {isExistingPeriod && (
                    <div className="pt-4 border-t border-slate-200">
                      <button 
                        onClick={() => { setLayoutDeleteConfirm(true); setIsMobileActionMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                        この期間を完全に削除
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Safe Area Padding for Mobile Nav */}
                <div className="h-20 bg-white" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
    </>
  );
}
