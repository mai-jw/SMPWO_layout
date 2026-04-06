"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Image as ImageIcon, X, Download, FileSpreadsheet,
  FileImage, Save, Copy, CalendarDays, RotateCcw, CheckCircle2,
  ChevronDown, Tag, Pencil,
} from "lucide-react";
import { useItems } from "@/hooks/use-items";
import { useLayouts, useSaveLayout } from "@/hooks/use-layouts";
import {
  type Item, type ShelfKey, type ShelfData, type CartLayoutV2,
  type TagData, type ShelfLayoutType,
  makeInitialCartLayoutV2, makeDefaultShelf, filledCountV2, maxCountV2,
} from "@/lib/supabase";

type CartId = "A" | "B";
type ActiveTarget =
  | { cart: CartId; section: "poster" }
  | { cart: CartId; section: ShelfKey; index: number }
  | null;
type SidebarFilter = "all" | "poster" | "ja" | "foreign";

const FILTER_LABELS: Record<SidebarFilter, string> = {
  all: "すべて", poster: "ポスター", ja: "日本語", foreign: "外国語",
};
const SHELF_LABELS: Record<ShelfKey, string> = {
  shelf1: "上段", shelf2: "中段", shelf3: "下段",
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
  "教育語",
];

/* ════════════════ TagBar ════════════════ */
interface TagBarProps {
  shelfKey: ShelfKey;
  shelf: ShelfData;
  onLayoutChange: (t: ShelfLayoutType) => void;
  onTagChange: (which: "tag_1" | "tag_2", tag: TagData) => void;
}

function TagBar({ shelfKey, shelf, onLayoutChange, onTagChange }: TagBarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isShelf1 = shelfKey === "shelf1";
  const is2Cols = shelf.layout_type === "2_cols";
  const canTag = !is2Cols || isShelf1;
  const canFreeDist = !is2Cols;

  const mode = shelf.tag_1.type;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const setMode = (newMode: "none" | "lang" | "free_dist") => {
    if (newMode === "none") {
      onTagChange("tag_1", { type: "none", value: "" });
      onTagChange("tag_2", { type: "none", value: "" });
    } else if (newMode === "lang") {
      onTagChange("tag_1", { type: "lang", value: mode === "lang" ? shelf.tag_1.value : "" });
      onTagChange("tag_2", { type: "none", value: "" });
    } else {
      onTagChange("tag_1", { type: "free_dist", value: "無料で差し上げています" });
      onTagChange("tag_2", { type: "none", value: "" });
    }
    setShowMenu(false);
  };

  const isFreeDist = mode === "free_dist";
  const label = mode === "lang" 
    ? (shelf.tag_1.value || shelf.tag_2.value ? `${shelf.tag_1.value}${shelf.tag_2.value ? ` / ${shelf.tag_2.value}` : ""}` : "言語を選択")
    : mode === "free_dist" ? "無料で差し上げています"
    : "タグを選択";

  const barBg = !canTag
    ? "bg-red-800"  /* still red, just slightly darker to hint it's non-taggable */
    : mode === "free_dist" ? "bg-zinc-900"
    : mode === "lang"      ? "bg-red-600"
    :                        "bg-red-700";

  return (
    <div className="relative group/tag" ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-white transition-all duration-200 shadow-md ${barBg} ${showMenu ? "brightness-110" : ""}`}
      >
        <div className="flex-1 flex justify-center items-center gap-2">
          <span className="text-[11px] font-black tracking-widest truncate">{label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showMenu ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-1 mb-3">
              {(["2_cols", "3_cols", "4_cols"] as ShelfLayoutType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onLayoutChange(t)}
                  className={`text-[10px] font-black py-2 rounded-lg transition-all ${
                    shelf.layout_type === t ? "bg-primary text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t === "2_cols" ? "2列" : t === "3_cols" ? "3列" : "4列"}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <button onClick={() => setMode("none")}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors ${mode === "none" ? "bg-slate-100 text-slate-900 font-bold" : "text-slate-500 hover:bg-slate-50"}`}>
                <span>タグなし</span>
                {mode === "none" && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              
              <button onClick={() => setMode("lang")}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors ${mode === "lang" ? "bg-red-50 text-red-700 font-bold" : "text-slate-600 hover:bg-red-50/50"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
                  <span>言語表示</span>
                </div>
                {mode === "lang" && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>

              {mode === "lang" && (
                <div className="px-2 pb-2 pt-1 flex gap-2 animate-in fade-in slide-in-from-top-1">
                  <select
                    value={shelf.tag_1.value}
                    onChange={(e) => onTagChange("tag_1", { type: "lang", value: (e.target as HTMLSelectElement).value })}
                    className="flex-1 text-[10px] bg-slate-100 border border-slate-200 rounded-md px-1 py-1 outline-none text-slate-700 font-bold"
                  >
                    <option value="">（左）</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select
                    value={shelf.tag_2.type === "lang" ? shelf.tag_2.value : ""}
                    onChange={(e) => {
                      const val = (e.target as HTMLSelectElement).value;
                      onTagChange("tag_2", val ? { type: "lang", value: val } : { type: "none", value: "" });
                    }}
                    className="flex-1 text-[10px] bg-slate-100 border border-slate-200 rounded-md px-1 py-1 outline-none text-slate-700 font-bold"
                  >
                    <option value="">（右）</option>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              {canFreeDist && (
                <button onClick={() => setMode("free_dist")}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors ${mode === "free_dist" ? "bg-zinc-100 text-zinc-900 font-bold" : "text-slate-600 hover:bg-zinc-50"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                    <span>無料配布</span>
                  </div>
                  {mode === "free_dist" && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════ ItemSlot ════════════════ */
interface ItemSlotProps {
  item: Item | undefined;
  isActive: boolean;
  isSelecting: boolean;
  onClick: () => void;
  onClear: () => void;
  poster?: boolean;
}

function ItemSlot({ item, isActive, isSelecting, onClick, onClear, poster }: ItemSlotProps) {
  const base = poster ? "w-full overflow-hidden" : "overflow-hidden";
  const aspect = poster ? "aspect-[3.5/5]" : "aspect-[3.5/5]";
  const bg = item ? "bg-white" : "bg-zinc-200/80";
  const ring = isActive ? "ring-4 ring-yellow-400 z-10 scale-[1.02]" : "";
  const border = poster ? "border-[3px] border-blue-600 shadow-lg" : "border border-zinc-400/30 shadow-inner";

  return (
    <div
      className={`relative cursor-pointer transition-all duration-300 group ${base} ${aspect} ${bg} ${ring} ${border}`}
      onClick={onClick}
    >
      {item ? (
        <div className="w-full h-full p-0.5">
          <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          {isActive ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center animate-bounce shadow-md">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-yellow-600 text-[10px] font-black uppercase">Selecting...</span>
            </div>
          ) : (
            <>
              <p className="text-zinc-500 text-[10px] font-black leading-tight mb-2">
                {poster ? "ポスター画像" : "掲載する出版物\n冊子型など"}
              </p>
              <ImageIcon className="w-5 h-5 text-zinc-400/50" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════ ShelfSection ════════════════ */
interface ShelfSectionProps {
  cartId: CartId;
  shelfKey: ShelfKey;
  shelf: ShelfData;
  activeTarget: ActiveTarget;
  isSelecting: boolean;
  itemMap: Record<string, Item>;
  onSlotClick: (cart: CartId, section: ShelfKey, index: number) => void;
  onClear: (cart: CartId, section: ShelfKey, index: number) => void;
  onLayoutChange: (t: ShelfLayoutType) => void;
  onTagChange: (which: "tag_1" | "tag_2", tag: TagData) => void;
}

function ShelfSection({
  cartId, shelfKey, shelf, activeTarget, isSelecting, itemMap,
  onSlotClick, onClear, onLayoutChange, onTagChange,
}: ShelfSectionProps) {
  return (
    <div>
      <TagBar
        shelfKey={shelfKey} shelf={shelf}
        onLayoutChange={onLayoutChange} onTagChange={onTagChange}
      />
      <div className={`p-2 grid gap-2 ${shelf.layout_type === "4_cols" ? "grid-cols-4" : shelf.layout_type === "3_cols" ? "grid-cols-3" : "grid-cols-2"}`}>
        {shelf.items.map((itemId, idx) => (
          <ItemSlot
            key={idx}
            item={itemId ? itemMap[itemId] : undefined}
            isActive={activeTarget?.cart === cartId && activeTarget.section === shelfKey && (activeTarget as { index: number }).index === idx}
            isSelecting={isSelecting}
            onClick={() => onSlotClick(cartId, shelfKey, idx)}
            onClear={() => onClear(cartId, shelfKey, idx)}
          />
        ))}
      </div>
    </div>
  );
}

/* ════════════════ CartPanel ════════════════ */
interface CartPanelProps {
  cartId: CartId;
  layout: CartLayoutV2;
  activeTarget: ActiveTarget;
  isSelecting: boolean;
  itemMap: Record<string, Item>;
  onSlotClick: (cart: CartId, section: "poster" | ShelfKey, index?: number) => void;
  onClear: (cart: CartId, section: "poster" | ShelfKey, index?: number) => void;
  onLayoutChange: (cart: CartId, shelfKey: ShelfKey, t: ShelfLayoutType) => void;
  onTagChange: (cart: CartId, shelfKey: ShelfKey, which: "tag_1" | "tag_2", tag: TagData) => void;
}

function CartPanel({
  cartId, layout, activeTarget, isSelecting, itemMap,
  onSlotClick, onClear, onLayoutChange, onTagChange,
}: CartPanelProps) {
  const filled = filledCountV2(layout);
  const max = maxCountV2(layout);
  const isPosterActive = activeTarget?.cart === cartId && activeTarget.section === "poster";

  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#444444] rounded-[48px] shadow-2xl shrink-0 w-[360px] overflow-hidden pt-4 pb-6 border-4 border-white/5 relative">
        <div className="px-5 space-y-3">
          <div className="flex justify-center">
            <div className={`w-[85%] transition-all ${
              isPosterActive ? "ring-4 ring-yellow-400 rounded-sm z-20" : ""
            }`}>
              <ItemSlot
                item={layout.poster ? itemMap[layout.poster] : undefined}
                isActive={isPosterActive}
                isSelecting={isSelecting}
                onClick={() => onSlotClick(cartId, "poster")}
                onClear={() => onClear(cartId, "poster")}
                poster
              />
            </div>
          </div>

          <div className="space-y-2">
            {(["shelf1", "shelf2", "shelf3"] as ShelfKey[]).map((key) => (
              <ShelfSection
                key={key}
                cartId={cartId}
                shelfKey={key}
                shelf={layout[key]}
                activeTarget={activeTarget}
                isSelecting={isSelecting}
                itemMap={itemMap}
                onSlotClick={(c, s, i) => onSlotClick(c, s, i)}
                onClear={(c, s, i) => onClear(c, s, i)}
                onLayoutChange={(t) => onLayoutChange(cartId, key, t)}
                onTagChange={(w, t) => onTagChange(cartId, key, w, t)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Cart Handle at bottom */}
      <div className="w-32 h-14 border-x-[10px] border-b-[10px] border-[#444444] rounded-b-[40px] -mt-1 flex items-end justify-center pb-2">
        <div className="w-20 h-1 bg-[#444444]/20 rounded-full" />
      </div>
      
      <div className="mt-4 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${cartId === "A" ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]"}`} />
        <span className="text-sm font-black text-foreground/80 uppercase tracking-widest italic flex items-center gap-2">
          Cart {cartId}
          <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full not-italic">
            {filled}/{max}
          </span>
        </span>
      </div>
    </div>
  );
}

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
  const [sidebarSelected, setSidebarSelected] = useState<Item | null>(null);
  const [filter, setFilter] = useState<SidebarFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState<"png" | "pdf" | "xlsx" | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copySource, setCopySource] = useState("");
  const [showCopyPanel, setShowCopyPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { data: items = [], isLoading } = useItems();
  const { data: layouts = [] } = useLayouts();
  const saveLayout = useSaveLayout();

  const itemMap = useMemo(() => {
    return Object.fromEntries(items.filter((i) => i.id).map((i) => [i.id!, i]));
  }, [items]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const mf = filter === "all" || (filter === "poster" && item.category === "poster") ||
      (filter === "ja" && item.language === "ja") ||
      (filter === "foreign" && item.language !== "ja" && item.language !== "other");
    const ms = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return mf && ms;
  }), [items, filter, searchQuery]);

  const getSetCart = useCallback((cart: CartId) => cart === "A" ? setCartA : setCartB, []);

  const handleSlotClick = useCallback((cart: CartId, section: "poster" | ShelfKey, index?: number) => {
    if (sidebarSelected) {
      const setter = getSetCart(cart);
      if (section === "poster") {
        setter((prev) => ({ ...prev, poster: sidebarSelected.id! }));
      } else {
        setter((prev) => ({
          ...prev,
          [section]: { ...prev[section], items: prev[section].items.map((id, i) => i === index ? sidebarSelected.id! : id) },
        }));
      }
      setSidebarSelected(null);
    } else {
      setActiveTarget((prev) => {
        const same = prev?.cart === cart && prev.section === section &&
          (section === "poster" || (prev as { index: number }).index === index);
        return same ? null : section === "poster" ? { cart, section } : { cart, section: section as ShelfKey, index: index! };
      });
    }
  }, [sidebarSelected, getSetCart]);

  const handleSidebarClick = useCallback((item: Item) => {
    if (activeTarget) {
      const setter = getSetCart(activeTarget.cart);
      const { section } = activeTarget;
      if (section === "poster") {
        setter((prev) => ({ ...prev, poster: item.id! }));
      } else {
        const idx = (activeTarget as { index: number }).index;
        setter((prev) => ({
          ...prev,
          [section]: { ...prev[section], items: prev[section].items.map((id, i) => i === idx ? item.id! : id) },
        }));
      }
      setActiveTarget(null);
    } else {
      setSidebarSelected((prev) => (prev?.id === item.id ? null : item));
    }
  }, [activeTarget, getSetCart]);

  const handleClear = useCallback((cart: CartId, section: "poster" | ShelfKey, index?: number) => {
    const setter = getSetCart(cart);
    if (section === "poster") {
      setter((prev) => ({ ...prev, poster: null }));
    } else {
      setter((prev) => ({
        ...prev,
        [section]: { ...prev[section], items: prev[section].items.map((id, i) => i === index ? null : id) },
      }));
    }
  }, [getSetCart]);

  const handleLayoutChange = useCallback((cart: CartId, shelfKey: ShelfKey, t: ShelfLayoutType) => {
    const setter = getSetCart(cart);
    setter((prev) => {
      const shelf = prev[shelfKey];
      const newItems = t === "4_cols"
        ? [shelf.items[0] ?? null, shelf.items[1] ?? null, shelf.items[2] ?? null, shelf.items[3] ?? null]
        : t === "3_cols"
        ? [shelf.items[0] ?? null, shelf.items[1] ?? null, shelf.items[2] ?? null]
        : [shelf.items[0] ?? null, shelf.items[1] ?? null];
      let tag_1 = shelf.tag_1;
      let tag_2 = shelf.tag_2;
      if (t === "2_cols") {
        if (shelfKey !== "shelf1") {
          tag_1 = { type: "none", value: "" };
          tag_2 = { type: "none", value: "" };
        } else if (tag_1.type === "free_dist") {
          tag_1 = { type: "none", value: "" };
          tag_2 = { type: "none", value: "" };
        }
      }
      return { ...prev, [shelfKey]: { ...shelf, layout_type: t, items: newItems, tag_1, tag_2 } };
    });
  }, [getSetCart]);

  const handleTagChange = useCallback((cart: CartId, shelfKey: ShelfKey, which: "tag_1" | "tag_2", tag: TagData) => {
    const setter = getSetCart(cart);
    setter((prev) => ({ ...prev, [shelfKey]: { ...prev[shelfKey], [which]: tag } }));
  }, [getSetCart]);

  const handleReset = () => {
    setCartA(makeInitialCartLayoutV2());
    setCartB(makeInitialCartLayoutV2());
    setActiveTarget(null);
    setSidebarSelected(null);
  };

  const handleSave = async () => {
    if (!period.trim()) return;
    setSaveStatus("saving");
    try {
      await saveLayout.mutateAsync({ period, cart_a: cartA, cart_b: cartB });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const handleCopyLayout = () => {
    const src = layouts.find((l) => l.period === copySource);
    if (!src) return;
    setCartA(src.cart_a);
    setCartB(src.cart_b);
    setShowCopyPanel(false);
    setCopySource("");
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2.5, useCORS: true, backgroundColor: "#1c1c1e" });
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
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: "#1c1c1e" });
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
      for (const key of ["shelf1", "shelf2", "shelf3"] as ShelfKey[]) {
        const la = cartA[key]; const lb = cartB[key];
        const t1a = getTagLabel(la.tag_1) || "なし"; const t1b = getTagLabel(lb.tag_1) || "なし";
        const t2a = getTagLabel(la.tag_2) || "なし"; const t2b = getTagLabel(lb.tag_2) || "なし";
        const cnt = Math.max(la.items.length, lb.items.length);
        for (let i = 0; i < cnt; i++) {
          addRow(
            "棚", SHELF_LABELS[key], `スロット${i + 1}`,
            `${la.layout_type === "3_cols" ? "3冊" : "2冊"} / ${lb.layout_type === "3_cols" ? "3冊" : "2冊"}`,
            i === 0 ? t1a : "〃", i === 0 ? t2a : "〃",
            getItemName(la.items[i] ?? null), getItemName(lb.items[i] ?? null),
          );
        }
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [8, 6, 8, 12, 10, 10, 28, 2, 28].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, `配置リスト_${period}`);
      XLSX.writeFile(wb, `展示カート_${period}.xlsx`);
    } finally { setExporting(null); }
  };

  const isSelecting = !!sidebarSelected;
  const totalA = filledCountV2(cartA);
  const totalB = filledCountV2(cartB);

  const quickPeriods = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return [
      [y, m, "前半"], [y, m, "後半"],
      [y, m === 12 ? 1 : m + 1, "前半"],
    ].map(([yr, mo, h]) => ({
      val: `${yr}-${String(mo).padStart(2, "0")}-${h}`,
      label: `${String(mo).padStart(2, "0")}月${h}`,
    }));
  })();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      <div className="shrink-0 bg-card border-b border-border px-4 py-2 flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-xs">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          <input type="text" value={period} onChange={(e) => setPeriod((e.target as HTMLInputElement).value)}
            placeholder="例: 2026-05-前半"
            className="text-sm font-semibold text-foreground bg-transparent outline-none w-36 placeholder:text-muted-foreground/60" />
        </div>
        {quickPeriods.map(({ val, label }) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`text-[11px] px-2 py-1 rounded-md border font-bold transition-all shadow-xs active:scale-95 ${
              period === val ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
            }`}>
            {label}
          </button>
        ))}
        <div className="h-5 w-px bg-border" />
        <div className="relative">
          <button onClick={() => setShowCopyPanel((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-bold text-foreground transition-all shadow-xs active:scale-95">
            <Copy className="w-3.5 h-3.5" />前回コピー<ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showCopyPanel && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-xl p-3 z-30 min-w-[220px]">
                <p className="text-xs font-bold text-muted-foreground mb-2">コピー元の期間</p>
                {layouts.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">保存済みデータなし</p>
                ) : (
                  <>
                    <select value={copySource} onChange={(e) => setCopySource((e.target as HTMLSelectElement).value)}
                      className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground outline-none mb-2 font-medium">
                      <option value="">選択...</option>
                      {layouts.map((l) => <option key={l.period} value={l.period}>{l.period}</option>)}
                    </select>
                    <button onClick={handleCopyLayout} disabled={!copySource}
                      className="w-full text-sm bg-primary text-white rounded-lg py-1.5 font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                      このレイアウトをコピー
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saveStatus === "saving" || !period.trim()}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all disabled:opacity-60 ${
            saveStatus === "saved" ? "bg-green-600 text-white" :
            saveStatus === "error" ? "bg-red-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}>
          {saveStatus === "saved" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           saveStatus === "saving" ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
           <Save className="w-3.5 h-3.5" />}
          {saveStatus === "saved" ? "保存済み" : saveStatus === "error" ? "エラー" : saveStatus === "saving" ? "保存中…" : "保存"}
        </button>
        {[
          { key: "png" as const, label: "PNG", icon: <FileImage className="w-3.5 h-3.5" />, cls: "border-green-400 bg-green-50 text-green-700 hover:bg-green-100 font-bold shadow-xs" },
          { key: "pdf" as const, label: "PDF", icon: <Download className="w-3.5 h-3.5" />, cls: "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold shadow-xs" },
          { key: "xlsx" as const, label: "Excel", icon: <FileSpreadsheet className="w-3.5 h-3.5" />, cls: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold shadow-xs" },
        ].map(({ key, label, icon, cls }) => (
          <button key={key} disabled={!!exporting}
            onClick={key === "png" ? handleExportPng : key === "pdf" ? handleExportPdf : handleExportXlsx}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-all active:scale-95 ${cls}`}>
            {exporting === key ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
            {label}
          </button>
        ))}
        <button onClick={handleReset}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground font-bold transition-all shadow-xs active:scale-95">
          <RotateCcw className="w-3.5 h-3.5" />リセット
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-3 px-1">画像を選択</p>
            <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              className="w-full text-xs font-medium border border-border rounded-lg px-3 py-2 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20 mb-3 placeholder:text-muted-foreground/50 transition-all" />
            <div className="grid grid-cols-2 gap-1">
              {(Object.entries(FILTER_LABELS) as [SidebarFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`text-[10px] py-1.5 rounded-lg font-bold transition-all shadow-xs ${
                    filter === key ? "bg-primary text-white scale-[1.02]" : "bg-background text-muted-foreground hover:text-foreground"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(sidebarSelected || activeTarget) && (
            <div className={`mx-3 mt-3 text-[10px] rounded-lg px-3 py-2 font-bold leading-relaxed shadow-sm border ${
              sidebarSelected ? "bg-primary/5 text-primary border-primary/20" : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {sidebarSelected
                ? "▶ カートの枠をクリックして配置"
                : `▶ カート${activeTarget!.cart}の枠が選択中\n画像を選んでください`}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-[11px] text-zinc-500 text-center py-6">該当する画像なし</p>
            ) : (
              filteredItems.map((item) => {
                const isSel = sidebarSelected?.id === item.id;
                return (
                  <button key={item.id} onClick={() => handleSidebarClick(item)}
                    className={`w-full flex items-center gap-3 rounded-xl p-2 text-left transition-all border ${
                      isSel ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-background hover:border-border"
                    }`}>
                    <img src={item.url} alt={item.name} className="w-10 h-10 object-cover rounded-lg shrink-0 bg-muted shadow-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-foreground truncate leading-tight">{item.name}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.category === "poster" && <span className="text-[9px] font-black bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">POSTER</span>}
                        {item.language === "ja" && <span className="text-[9px] font-black bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">日本語</span>}
                        {item.language === "en" && <span className="text-[9px] font-black bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">EN</span>}
                      </div>
                    </div>
                    {isSel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </aside>
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
            {(sidebarSelected || activeTarget) && (
              <button onClick={() => { setSidebarSelected(null); setActiveTarget(null); }}
                className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 border border-zinc-600 rounded-lg px-2 py-1 bg-zinc-700 transition-colors">
                <X className="w-3 h-3" /> 選択解除
              </button>
            )}
          </div>
          {!sidebarSelected && !activeTarget && (
            <p className="text-xs text-zinc-500 mb-4">
              ← 左サイドバーから画像を選ぶか、カートの枠をクリックして配置
            </p>
          )}
          <div ref={canvasRef} className="flex gap-12 items-start p-10 rounded-[40px] bg-background shadow-inner border border-border/50">
            <CartPanel
              cartId="A" layout={cartA} activeTarget={activeTarget}
              isSelecting={isSelecting} itemMap={itemMap}
              onSlotClick={handleSlotClick} onClear={handleClear}
              onLayoutChange={handleLayoutChange} onTagChange={handleTagChange}
            />
            <CartPanel
              cartId="B" layout={cartB} activeTarget={activeTarget}
              isSelecting={isSelecting} itemMap={itemMap}
              onSlotClick={handleSlotClick} onClear={handleClear}
              onLayoutChange={handleLayoutChange} onTagChange={handleTagChange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
