import { useState, useRef, useCallback, useMemo } from "react";
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
  if (tag.type === "free") return tag.value || "フリー";
  return tag.value || "—";
}

/* ════════════════ TagBar ════════════════ */
interface TagBarProps {
  shelfKey: ShelfKey;
  shelf: ShelfData;
  onLayoutChange: (t: ShelfLayoutType) => void;
  onTagChange: (which: "tag_1" | "tag_2", tag: TagData) => void;
}

const LANG_OPTIONS = [
  { value: "none", label: "なし" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "外国語" },
];

function TagBar({ shelfKey, shelf, onLayoutChange, onTagChange }: TagBarProps) {
  const [open, setOpen] = useState(false);
  const [freeVal1, setFreeVal1] = useState(shelf.tag_1.value);
  const [freeVal2, setFreeVal2] = useState(shelf.tag_2.value);

  const label1 = getTagLabel(shelf.tag_1);
  const label2 = getTagLabel(shelf.tag_2);
  const displayTag = [label1, label2].filter(Boolean).join(" / ") || "タグ設定";

  const setLangTag = (which: "tag_1" | "tag_2", val: string) => {
    if (val === "none") onTagChange(which, { type: "none", value: "" });
    else if (val === "free") onTagChange(which, { type: "free", value: which === "tag_1" ? freeVal1 : freeVal2 });
    else onTagChange(which, { type: "lang", value: val === "ja" ? "日本語" : "外国語" });
  };

  return (
    <div className="relative">
      {/* Red tag bar */}
      <div className="bg-red-600 rounded-t-md flex items-center px-2 py-1 gap-1.5 select-none">
        <button
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <Tag className="w-3 h-3 text-red-200 flex-shrink-0" />
          <span className="text-white text-[11px] font-semibold truncate">{displayTag}</span>
          <ChevronDown className={`w-3 h-3 text-red-200 flex-shrink-0 transition-transform ml-0.5 ${open ? "rotate-180" : ""}`} />
        </button>
        {/* Layout switcher */}
        <div className="flex gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {(["2_cols", "3_cols"] as ShelfLayoutType[]).map((t) => (
            <button key={t}
              onClick={() => onLayoutChange(t)}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                shelf.layout_type === t ? "bg-red-900 text-white" : "bg-red-500/60 text-red-100 hover:bg-red-800"
              }`}>
              {t === "2_cols" ? "2冊" : "3冊"}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 z-30 bg-red-700 rounded-b-md px-2.5 pt-1.5 pb-2 shadow-xl"
          >
            {/* Tag 1 */}
            <p className="text-[9px] text-red-200 font-bold uppercase tracking-wider mb-1">タグ1（左側）</p>
            <div className="flex gap-1 flex-wrap mb-1">
              {[...LANG_OPTIONS, { value: "free", label: "フリー" }].map(({ value, label }) => {
                const current = shelf.tag_1.type === "none" && value === "none"
                  ? true : shelf.tag_1.type === "lang" && shelf.tag_1.value === (value === "ja" ? "日本語" : "外国語")
                  ? true : shelf.tag_1.type === "free" && value === "free"
                  ? true : false;
                return (
                  <button key={value} onClick={() => setLangTag("tag_1", value)}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                      current ? "bg-white text-red-700" : "bg-red-800/60 text-white hover:bg-red-900"
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
            {shelf.tag_1.type === "free" && (
              <input
                value={freeVal1}
                onChange={(e) => { setFreeVal1(e.target.value); onTagChange("tag_1", { type: "free", value: e.target.value }); }}
                placeholder="テキストを入力..."
                className="w-full text-[11px] bg-red-900/60 text-white placeholder:text-red-300 border border-red-500 rounded px-2 py-0.5 outline-none mb-1.5"
              />
            )}
            {/* Tag 2 */}
            <p className="text-[9px] text-red-200 font-bold uppercase tracking-wider mb-1">タグ2（右側）</p>
            <div className="flex gap-1 flex-wrap">
              {LANG_OPTIONS.map(({ value, label }) => {
                const current = shelf.tag_2.type === "none" && value === "none"
                  ? true : shelf.tag_2.type === "lang" && shelf.tag_2.value === (value === "ja" ? "日本語" : "外国語")
                  ? true : false;
                return (
                  <button key={value} onClick={() => setLangTag("tag_2", value)}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                      current ? "bg-white text-red-700" : "bg-red-800/60 text-white hover:bg-red-900"
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
            {shelf.tag_2.type === "free" && (
              <input
                value={freeVal2}
                onChange={(e) => { setFreeVal2(e.target.value); onTagChange("tag_2", { type: "free", value: e.target.value }); }}
                placeholder="テキストを入力..."
                className="w-full text-[11px] bg-red-900/60 text-white border border-red-500 rounded px-2 py-0.5 outline-none mt-1"
              />
            )}
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
  const base = poster ? "w-full rounded-lg overflow-hidden" : "rounded-md overflow-hidden";
  const aspect = poster ? "aspect-[3/2]" : "aspect-square";
  const bg = item ? "" : isActive ? "bg-zinc-500" : isSelecting ? "bg-zinc-600/80" : "bg-zinc-600";
  const ring = isActive ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-zinc-800" : "";

  return (
    <div
      className={`relative cursor-pointer transition-all group ${base} ${aspect} ${bg} ${ring}`}
      onClick={onClick}
    >
      {item ? (
        <>
          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <X className="w-2.5 h-2.5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-[9px] font-medium truncate leading-tight">{item.name}</p>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          {isActive ? (
            <span className="text-yellow-400 text-[9px] font-bold animate-pulse">▼ 画像を選択</span>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-zinc-400" />
              {poster && <span className="text-zinc-400 text-[10px] mt-0.5">ポスター画像</span>}
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
      <div className={`bg-zinc-700 rounded-b-md p-2 grid gap-2 ${shelf.layout_type === "3_cols" ? "grid-cols-3" : "grid-cols-2"}`}>
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
  const headerGrad = cartId === "A" ? "from-indigo-700 to-indigo-900" : "from-teal-700 to-teal-900";
  const isPosterActive = activeTarget?.cart === cartId && activeTarget.section === "poster";

  return (
    <div className="bg-zinc-800 rounded-2xl shadow-2xl flex-shrink-0 w-[270px] overflow-visible pb-3">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerGrad} text-white px-4 py-2 rounded-t-2xl flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="text-sm font-bold tracking-wide">カート{cartId}</span>
        </div>
        <span className="text-[11px] bg-white/20 rounded-full px-2 py-0.5 font-semibold">
          {filled} / {max}
        </span>
      </div>

      <div className="px-3 pt-3 space-y-2.5">
        {/* Poster area */}
        <div>
          <div className={`rounded-lg overflow-hidden border-2 transition-all ${
            isPosterActive ? "border-yellow-400 shadow-lg shadow-yellow-400/30" : "border-white/20"
          }`}>
            <div className="bg-white">
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
        </div>

        {/* Shelves */}
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

        {/* Wheels */}
        <div className="flex justify-around px-6 pt-1">
          {[0, 1].map((i) => (
            <div key={i} className="w-9 h-9 rounded-full bg-zinc-600 border-2 border-zinc-500 shadow-inner flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-zinc-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════ CartEditor (Main) ════════════════ */
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

  /* ─── Helpers ─── */
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
      const newItems = t === "3_cols"
        ? [shelf.items[0] ?? null, shelf.items[1] ?? null, shelf.items[2] ?? null]
        : [shelf.items[0] ?? null, shelf.items[1] ?? null];
      return { ...prev, [shelfKey]: { ...shelf, layout_type: t, items: newItems } };
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

  /* ─── Save ─── */
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

  /* ─── Exports ─── */
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2.5, useCORS: true, backgroundColor: "#1c1c1e" });
      const a = document.createElement("a");
      a.download = `展示カート_${period}.png`;
      a.href = canvas.toDataURL("image/png");
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
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
      pdf.text(`展示カートレイアウト — ${period}`, 12, 10);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
      pdf.text(new Date().toLocaleDateString("ja-JP"), pW - 12, 10, { align: "right" });
      const ratio = canvas.width / canvas.height;
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

  /* ─── Quick period helpers ─── */
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
    <div className="flex flex-col h-[calc(100vh-56px)] bg-zinc-900">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 bg-zinc-800 border-b border-zinc-700 px-4 py-2 flex flex-wrap items-center gap-2.5">
        {/* Period */}
        <div className="flex items-center gap-1.5 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
          <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)}
            placeholder="例: 2026-05-前半"
            className="text-sm font-medium text-zinc-100 bg-transparent outline-none w-36 placeholder:text-zinc-500" />
        </div>
        {quickPeriods.map(({ val, label }) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${
              period === val ? "bg-primary text-white border-primary" : "bg-zinc-700 text-zinc-300 border-zinc-600 hover:border-primary/50"
            }`}>
            {label}
          </button>
        ))}

        <div className="h-5 w-px bg-zinc-600" />

        {/* Copy previous */}
        <div className="relative">
          <button onClick={() => setShowCopyPanel((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors">
            <Copy className="w-3.5 h-3.5" />前回コピー<ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showCopyPanel && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-600 rounded-xl shadow-2xl p-3 z-30 min-w-[220px]">
                <p className="text-xs font-semibold text-zinc-400 mb-2">コピー元の期間</p>
                {layouts.length === 0 ? (
                  <p className="text-xs text-zinc-500">保存済みデータなし</p>
                ) : (
                  <>
                    <select value={copySource} onChange={(e) => setCopySource(e.target.value)}
                      className="w-full text-sm border border-zinc-600 rounded-lg px-2 py-1.5 bg-zinc-700 text-zinc-200 outline-none mb-2">
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

        {/* Save */}
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

        {/* Export */}
        {[
          { key: "png" as const, label: "PNG", icon: <FileImage className="w-3.5 h-3.5" />, cls: "border-green-700 bg-green-900/50 text-green-300 hover:bg-green-800/60" },
          { key: "pdf" as const, label: "PDF", icon: <Download className="w-3.5 h-3.5" />, cls: "border-blue-700 bg-blue-900/50 text-blue-300 hover:bg-blue-800/60" },
          { key: "xlsx" as const, label: "Excel", icon: <FileSpreadsheet className="w-3.5 h-3.5" />, cls: "border-amber-700 bg-amber-900/50 text-amber-300 hover:bg-amber-800/60" },
        ].map(({ key, label, icon, cls }) => (
          <button key={key} disabled={!!exporting}
            onClick={key === "png" ? handleExportPng : key === "pdf" ? handleExportPdf : handleExportXlsx}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border font-medium disabled:opacity-50 transition-colors ${cls}`}>
            {exporting === key ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : icon}
            {label}
          </button>
        ))}

        <button onClick={handleReset}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-600 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 font-medium transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />リセット
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 bg-zinc-800 border-r border-zinc-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-700">
            <p className="text-xs font-bold text-zinc-300 mb-2">画像を選択</p>
            <input type="text" placeholder="検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-zinc-600 rounded-lg px-2.5 py-1.5 bg-zinc-700 text-zinc-200 outline-none focus:border-primary/60 mb-2 placeholder:text-zinc-500" />
            <div className="grid grid-cols-2 gap-1">
              {(Object.entries(FILTER_LABELS) as [SidebarFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`text-[11px] py-1 rounded-md font-semibold transition-colors ${
                    filter === key ? "bg-primary text-white" : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(sidebarSelected || activeTarget) && (
            <div className={`mx-2 mt-2 text-[10px] rounded-lg px-2 py-1.5 font-medium ${
              sidebarSelected ? "bg-primary/20 text-primary border border-primary/30" : "bg-yellow-900/40 text-yellow-300 border border-yellow-700/40"
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
                    className={`w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition-all border ${
                      isSel ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-transparent hover:bg-zinc-700 hover:border-zinc-600"
                    }`}>
                    <img src={item.url} alt={item.name} className="w-9 h-9 object-cover rounded-md flex-shrink-0 bg-zinc-700" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-zinc-200 truncate leading-tight">{item.name}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {item.category === "poster" && <span className="text-[9px] bg-violet-900/60 text-violet-300 rounded px-1">ポスター</span>}
                        {item.language === "ja" && <span className="text-[9px] bg-blue-900/60 text-blue-300 rounded px-1">日本語</span>}
                        {item.language === "en" && <span className="text-[9px] bg-orange-900/60 text-orange-300 rounded px-1">英語</span>}
                      </div>
                    </div>
                    {isSel && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-300">カートレイアウト</h2>
              <span className="text-xs bg-zinc-700 text-zinc-400 rounded-full px-2 py-0.5 font-semibold">
                A: {totalA}枠 / B: {totalB}枠
              </span>
              {period && (
                <span className="text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 rounded-full px-2 py-0.5 font-semibold">
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

          {/* Both carts — ref captures here for export */}
          <div ref={canvasRef} className="flex gap-5 items-start p-4 rounded-2xl bg-zinc-900/50">
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
