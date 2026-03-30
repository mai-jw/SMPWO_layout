import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Image as ImageIcon,
  X,
  Download,
  FileSpreadsheet,
  FileImage,
  Save,
  Copy,
  CalendarDays,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useItems } from "@/hooks/use-items";
import { useLayouts, useSaveLayout } from "@/hooks/use-layouts";
import {
  type Item,
  type SlotId,
  type CartLayout,
  INITIAL_CART_LAYOUT,
  SLOT_LABELS,
  SLOT_IDS,
} from "@/lib/supabase";

type CartId = "A" | "B";
type ActiveTarget = { cart: CartId; slotId: SlotId } | null;
type SidebarFilter = "all" | "poster" | "ja" | "foreign";
const FILTER_LABELS: Record<SidebarFilter, string> = {
  all: "すべて",
  poster: "ポスター",
  ja: "日本語",
  foreign: "外国語",
};

function filledCount(layout: CartLayout) {
  return SLOT_IDS.filter((id) => layout[id] !== null).length;
}

/* ─────────────────────── CartSlot ─────────────────────── */
interface CartSlotProps {
  slotId: SlotId;
  cart: CartId;
  item: Item | null;
  isActive: boolean;
  isSelecting: boolean;
  tall?: boolean;
  onSlotClick: (cart: CartId, slotId: SlotId) => void;
  onClear: (cart: CartId, slotId: SlotId) => void;
}

function CartSlot({ slotId, cart, item, isActive, isSelecting, tall, onSlotClick, onClear }: CartSlotProps) {
  const height = tall ? "h-28" : "h-20";
  const borderColor = isActive
    ? "border-primary bg-primary/5 shadow-md shadow-primary/20"
    : isSelecting && !item
    ? "border-primary/40 bg-primary/5 hover:border-primary/70"
    : item
    ? "border-slate-300 bg-white hover:border-slate-400"
    : "border-slate-200 bg-slate-50/50 hover:border-slate-300";

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed ${borderColor} ${height} flex items-center justify-center cursor-pointer transition-all duration-150 overflow-hidden group`}
      onClick={() => onSlotClick(cart, slotId)}
    >
      {item ? (
        <>
          <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); onClear(cart, slotId); }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-[9px] font-medium truncate">{item.name}</p>
          </div>
          {isActive && (
            <div className="absolute inset-0 ring-2 ring-primary ring-offset-1 rounded-lg pointer-events-none" />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-1">
          {isActive ? (
            <div className="flex flex-col items-center gap-0.5">
              <ImageIcon className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[9px] text-primary font-semibold">画像を選択</span>
            </div>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-slate-300" />
              <span className="text-[9px] text-slate-400">{SLOT_LABELS[slotId]}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── CartPanel ─────────────────────── */
interface CartPanelProps {
  cartId: CartId;
  layout: CartLayout;
  activeTarget: ActiveTarget;
  isSelecting: boolean;
  onSlotClick: (cart: CartId, slotId: SlotId) => void;
  onClear: (cart: CartId, slotId: SlotId) => void;
}

function CartPanel({ cartId, layout, activeTarget, isSelecting, onSlotClick, onClear }: CartPanelProps) {
  const count = filledCount(layout);
  const isActiveCart = activeTarget?.cart === cartId;
  const cartColor = cartId === "A" ? "from-indigo-700 to-indigo-900" : "from-teal-700 to-teal-900";
  const badgeColor = cartId === "A" ? "bg-indigo-100 text-indigo-700" : "bg-teal-100 text-teal-700";
  const ringColor = isActiveCart ? (cartId === "A" ? "ring-2 ring-indigo-400" : "ring-2 ring-teal-400") : "";

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-md flex-shrink-0 w-[300px] overflow-hidden ${ringColor} transition-all`}>
      <div className={`bg-gradient-to-r ${cartColor} text-white px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="text-sm font-bold">カート{cartId}</span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {count} / 7
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">ポスター枠</p>
          <CartSlot
            slotId="poster" cart={cartId}
            item={layout.poster}
            isActive={activeTarget?.cart === cartId && activeTarget.slotId === "poster"}
            isSelecting={isSelecting}
            onSlotClick={onSlotClick} onClear={onClear}
            tall
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">棚（3段 × 2枠）</p>
          <div className="space-y-2.5">
            {([
              ["shelf1_left", "shelf1_right", "1段目"],
              ["shelf2_left", "shelf2_right", "2段目"],
              ["shelf3_left", "shelf3_right", "3段目"],
            ] as [SlotId, SlotId, string][]).map(([left, right, label]) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[9px] text-slate-400 font-medium">{label}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CartSlot slotId={left} cart={cartId} item={layout[left]}
                    isActive={activeTarget?.cart === cartId && activeTarget.slotId === left}
                    isSelecting={isSelecting} onSlotClick={onSlotClick} onClear={onClear} />
                  <CartSlot slotId={right} cart={cartId} item={layout[right]}
                    isActive={activeTarget?.cart === cartId && activeTarget.slotId === right}
                    isSelecting={isSelecting} onSlotClick={onSlotClick} onClear={onClear} />
                </div>
                <div className="mt-2 h-2.5 bg-gradient-to-b from-slate-300 to-slate-400 rounded-sm shadow-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-around px-6 pt-0.5">
          {[...Array(4)].map((_, i) => <div key={i} className="w-2.5 h-5 bg-slate-400 rounded-b-sm" />)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */
export function CartEditor() {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const h = now.getDate() <= 15 ? "前半" : "後半";
    return `${y}-${m}-${h}`;
  });
  const [cartA, setCartA] = useState<CartLayout>({ ...INITIAL_CART_LAYOUT });
  const [cartB, setCartB] = useState<CartLayout>({ ...INITIAL_CART_LAYOUT });
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

  const filteredItems = items.filter((item) => {
    const matchFilter =
      filter === "all" ||
      (filter === "poster" && item.category === "poster") ||
      (filter === "ja" && item.language === "ja") ||
      (filter === "foreign" && item.language !== "ja" && item.language !== "other");
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* ─── Interaction handlers ─── */
  const handleSlotClick = useCallback((cart: CartId, slotId: SlotId) => {
    if (sidebarSelected) {
      const setter = cart === "A" ? setCartA : setCartB;
      setter((prev) => ({ ...prev, [slotId]: sidebarSelected }));
      setSidebarSelected(null);
    } else {
      setActiveTarget((prev) =>
        prev?.cart === cart && prev.slotId === slotId ? null : { cart, slotId }
      );
    }
  }, [sidebarSelected]);

  const handleSidebarImageClick = useCallback((item: Item) => {
    if (activeTarget) {
      const setter = activeTarget.cart === "A" ? setCartA : setCartB;
      setter((prev) => ({ ...prev, [activeTarget.slotId]: item }));
      setActiveTarget(null);
    } else {
      setSidebarSelected((prev) => (prev?.id === item.id ? null : item));
    }
  }, [activeTarget]);

  const clearSlot = useCallback((cart: CartId, slotId: SlotId) => {
    const setter = cart === "A" ? setCartA : setCartB;
    setter((prev) => ({ ...prev, [slotId]: null }));
  }, []);

  const handleReset = () => {
    setCartA({ ...INITIAL_CART_LAYOUT });
    setCartB({ ...INITIAL_CART_LAYOUT });
    setActiveTarget(null);
    setSidebarSelected(null);
  };

  /* ─── Save to Supabase ─── */
  const handleSave = async () => {
    if (!period.trim()) return;
    setSaveStatus("saving");
    try {
      await saveLayout.mutateAsync({ period, cart_a: cartA, cart_b: cartB });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  /* ─── Copy previous layout ─── */
  const handleCopyLayout = () => {
    const src = layouts.find((l) => l.period === copySource);
    if (!src) return;
    setCartA({ ...src.cart_a });
    setCartB({ ...src.cart_b });
    setShowCopyPanel(false);
    setCopySource("");
  };

  /* ─── Exports ─── */
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(canvasRef.current, { scale: 2.5, useCORS: true, backgroundColor: "#f8fafc" });
      const link = document.createElement("a");
      link.download = `展示カート_${period}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally { setExporting(null); }
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: "#f8fafc" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`展示カートレイアウト — ${period}`, 12, 10);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(new Date().toLocaleDateString("ja-JP"), pageW - 12, 10, { align: "right" });
      const ratio = canvas.width / canvas.height;
      const imgW = pageW - 24;
      const imgH = imgW / ratio;
      const yOffset = Math.max(15, (pageH - imgH) / 2);
      pdf.addImage(imgData, "PNG", 12, yOffset, imgW, Math.min(imgH, pageH - yOffset - 8));
      pdf.save(`展示カート_${period}.pdf`);
    } finally { setExporting(null); }
  };

  const handleExportXlsx = async () => {
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const listRows: string[][] = [
        ["配置枠", "カートA — 画像名", "カテゴリ", "言語", "URL", "", "カートB — 画像名", "カテゴリ", "言語", "URL"],
      ];
      for (const slotId of SLOT_IDS) {
        const a = cartA[slotId];
        const b = cartB[slotId];
        listRows.push([
          SLOT_LABELS[slotId],
          a?.name ?? "（未配置）", a?.category ?? "", a?.language ?? "", a?.url ?? "",
          "",
          b?.name ?? "（未配置）", b?.category ?? "", b?.language ?? "", b?.url ?? "",
        ]);
      }
      const ws1 = XLSX.utils.aoa_to_sheet(listRows);
      ws1["!cols"] = [14, 24, 10, 8, 40, 3, 24, 10, 8, 40].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws1, "配置リスト");

      const mapRows: string[][] = [
        [`期間: ${period}`, "", "カートA", "", "カートB"],
        ["位置", "", "画像名", "", "画像名"],
        ["ポスター枠", "", cartA.poster?.name ?? "（未配置）", "", cartB.poster?.name ?? "（未配置）"],
        [],
        ["棚 1段目 左", "", cartA.shelf1_left?.name ?? "（未配置）", "", cartB.shelf1_left?.name ?? "（未配置）"],
        ["棚 1段目 右", "", cartA.shelf1_right?.name ?? "（未配置）", "", cartB.shelf1_right?.name ?? "（未配置）"],
        [],
        ["棚 2段目 左", "", cartA.shelf2_left?.name ?? "（未配置）", "", cartB.shelf2_left?.name ?? "（未配置）"],
        ["棚 2段目 右", "", cartA.shelf2_right?.name ?? "（未配置）", "", cartB.shelf2_right?.name ?? "（未配置）"],
        [],
        ["棚 3段目 左", "", cartA.shelf3_left?.name ?? "（未配置）", "", cartB.shelf3_left?.name ?? "（未配置）"],
        ["棚 3段目 右", "", cartA.shelf3_right?.name ?? "（未配置）", "", cartB.shelf3_right?.name ?? "（未配置）"],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(mapRows);
      ws2["!cols"] = [18, 2, 28, 2, 28].map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws2, "配置マップ");

      XLSX.writeFile(wb, `展示カート_${period}.xlsx`);
    } finally { setExporting(null); }
  };

  const totalFilled = filledCount(cartA) + filledCount(cartB);
  const isSelecting = !!sidebarSelected;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-slate-100">

      {/* ─── Session toolbar ─── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center gap-3">
        {/* Period input */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="例: 2026-05-前半"
            className="text-sm font-medium text-slate-700 bg-transparent outline-none w-36 placeholder:text-slate-400"
          />
        </div>

        {/* Quick period buttons */}
        <div className="flex gap-1">
          {(() => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const nm = String(now.getMonth() + 2).padStart(2, "0");
            return [
              [`${y}-${m}-前半`, `${m}月前半`],
              [`${y}-${m}-後半`, `${m}月後半`],
              [`${y}-${nm}-前半`, `${nm}月前半`],
            ].map(([val, label]) => (
              <button key={val} onClick={() => setPeriod(val)}
                className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${period === val ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"}`}>
                {label}
              </button>
            ));
          })()}
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Copy previous layout */}
        <div className="relative">
          <button
            onClick={() => setShowCopyPanel((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            前回コピー
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showCopyPanel && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 min-w-[220px]"
              >
                <p className="text-xs font-semibold text-slate-500 mb-2">コピー元の期間を選択</p>
                {layouts.length === 0 ? (
                  <p className="text-xs text-slate-400">保存済みレイアウトがありません</p>
                ) : (
                  <>
                    <select
                      value={copySource}
                      onChange={(e) => setCopySource(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 outline-none mb-2"
                    >
                      <option value="">選択してください</option>
                      {layouts.map((l) => (
                        <option key={l.period} value={l.period}>{l.period}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleCopyLayout}
                      disabled={!copySource}
                      className="w-full text-sm bg-primary text-white rounded-lg py-1.5 font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
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
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving" || !period.trim()}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-all ${
            saveStatus === "saved" ? "bg-green-500 text-white" :
            saveStatus === "error" ? "bg-red-500 text-white" :
            "bg-slate-800 text-white hover:bg-slate-700"
          } disabled:opacity-60`}
        >
          {saveStatus === "saved" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
           saveStatus === "saving" ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> :
           <Save className="w-3.5 h-3.5" />}
          {saveStatus === "saved" ? "保存済み" : saveStatus === "error" ? "エラー" : saveStatus === "saving" ? "保存中..." : "保存"}
        </button>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <button onClick={handleExportPng} disabled={!!exporting}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 font-medium disabled:opacity-50 transition-colors">
            {exporting === "png" ? <div className="w-3.5 h-3.5 border-2 border-green-400/40 border-t-green-600 rounded-full animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
            PNG
          </button>
          <button onClick={handleExportPdf} disabled={!!exporting}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium disabled:opacity-50 transition-colors">
            {exporting === "pdf" ? <div className="w-3.5 h-3.5 border-2 border-blue-400/40 border-t-blue-600 rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button onClick={handleExportXlsx} disabled={!!exporting}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium disabled:opacity-50 transition-colors">
            {exporting === "xlsx" ? <div className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Excel
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            リセット
          </button>
        </div>
      </div>

      {/* ─── Main layout ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-600 mb-2">画像を選択</p>
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 outline-none focus:border-primary/50 mb-2 placeholder:text-slate-400"
            />
            <div className="grid grid-cols-2 gap-1">
              {(Object.entries(FILTER_LABELS) as [SidebarFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`text-[11px] py-1 rounded-md font-semibold transition-colors ${filter === key ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction hint */}
          {(sidebarSelected || activeTarget) && (
            <div className={`mx-2 mt-2 text-[10px] rounded-lg px-2 py-1.5 font-medium ${sidebarSelected ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {sidebarSelected
                ? "▶ カートの枠をクリックして配置"
                : `▶ カート${activeTarget!.cart}「${SLOT_LABELS[activeTarget!.slotId]}」に配置する画像を選択`}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-6">該当する画像がありません</p>
            ) : (
              filteredItems.map((item) => {
                const isSelected = sidebarSelected?.id === item.id;
                return (
                  <button key={item.id} onClick={() => handleSidebarImageClick(item)}
                    className={`w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition-all border ${
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                    }`}>
                    <img src={item.url} alt={item.name} className="w-9 h-9 object-cover rounded-md flex-shrink-0 bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-700 truncate leading-tight">{item.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        {item.category === "poster" && (
                          <span className="text-[9px] bg-violet-100 text-violet-600 rounded px-1 font-medium">ポスター</span>
                        )}
                        {item.language === "ja" && (
                          <span className="text-[9px] bg-blue-100 text-blue-600 rounded px-1 font-medium">日本語</span>
                        )}
                        {item.language === "en" && (
                          <span className="text-[9px] bg-orange-100 text-orange-600 rounded px-1 font-medium">英語</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Canvas area */}
        <main className="flex-1 overflow-auto p-4">
          {/* Status bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-700">カートレイアウト</h2>
              <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-semibold">
                {totalFilled} / 14 枠
              </span>
              {period && (
                <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                  {period}
                </span>
              )}
            </div>
            {(sidebarSelected || activeTarget) && (
              <button onClick={() => { setSidebarSelected(null); setActiveTarget(null); }}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-white">
                <X className="w-3 h-3" /> 選択解除
              </button>
            )}
          </div>

          {/* Instruction */}
          {!sidebarSelected && !activeTarget && (
            <p className="text-xs text-slate-400 mb-3">
              ← 左サイドバーから画像を選ぶか、カートの枠をクリックして配置してください
            </p>
          )}

          {/* Cart canvases (both captured by ref) */}
          <div ref={canvasRef} className="flex gap-5 items-start">
            <CartPanel
              cartId="A" layout={cartA} activeTarget={activeTarget}
              isSelecting={isSelecting} onSlotClick={handleSlotClick} onClear={clearSlot}
            />
            <CartPanel
              cartId="B" layout={cartB} activeTarget={activeTarget}
              isSelecting={isSelecting} onSlotClick={handleSlotClick} onClear={clearSlot}
            />
          </div>

          {/* Summary table */}
          {totalFilled > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-5 bg-white rounded-xl border border-slate-200 p-4 max-w-2xl">
              <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">配置済みアイテム一覧</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["A", "B"] as CartId[]).map((cid) => {
                  const layout = cid === "A" ? cartA : cartB;
                  const entries = (Object.entries(layout) as [SlotId, Item | null][]).filter(([, v]) => v !== null);
                  if (entries.length === 0) return null;
                  return (
                    <div key={cid}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">カート{cid}</p>
                      <div className="space-y-1">
                        {entries.map(([slotId, item]) => (
                          <div key={slotId} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-1.5">
                            <img src={item!.url} alt={item!.name} className="w-7 h-7 object-cover rounded flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-700 truncate">{item!.name}</p>
                              <p className="text-slate-400 text-[10px]">{SLOT_LABELS[slotId]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
