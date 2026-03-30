import { useState, useMemo, useRef, useCallback } from "react";
import { useItems } from "@/hooks/use-items";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Badge";
import {
  Search,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  MousePointerClick,
  X,
  ShoppingCart,
  RotateCcw,
  Download,
  FileText,
  Table2,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Item } from "@/lib/supabase";

type SlotId =
  | "poster"
  | "shelf1_left"
  | "shelf1_right"
  | "shelf2_left"
  | "shelf2_right"
  | "shelf3_left"
  | "shelf3_right";

type CartLayout = Record<SlotId, Item | null>;

const INITIAL_LAYOUT: CartLayout = {
  poster: null,
  shelf1_left: null,
  shelf1_right: null,
  shelf2_left: null,
  shelf2_right: null,
  shelf3_left: null,
  shelf3_right: null,
};

type SidebarFilter = "all" | "poster" | "ja" | "foreign";

const FILTER_LABELS: Record<SidebarFilter, string> = {
  all: "すべて",
  poster: "ポスター",
  ja: "日本語",
  foreign: "外国語",
};

export default function CartEditor() {
  const { data: items = [], isLoading, error } = useItems();
  const [layout, setLayout] = useState<CartLayout>(INITIAL_LAYOUT);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null);
  const [filter, setFilter] = useState<SidebarFilter>("all");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      let matchesFilter = true;
      if (filter === "poster") matchesFilter = item.category === "poster";
      else if (filter === "ja") matchesFilter = item.language === "ja";
      else if (filter === "foreign") matchesFilter = item.language === "en";
      return matchesSearch && matchesFilter;
    });
  }, [items, filter, search]);

  const handleSidebarClick = (item: Item) => {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
      setActiveSlot(null);
    }
  };

  const handleSlotClick = (slotId: SlotId) => {
    if (selectedItem) {
      setLayout((prev) => ({ ...prev, [slotId]: selectedItem }));
      setSelectedItem(null);
      setActiveSlot(null);
    } else {
      setActiveSlot(activeSlot === slotId ? null : slotId);
    }
  };

  const clearSlot = (slotId: SlotId, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayout((prev) => ({ ...prev, [slotId]: null }));
    if (activeSlot === slotId) setActiveSlot(null);
  };

  const resetLayout = () => {
    setLayout(INITIAL_LAYOUT);
    setSelectedItem(null);
    setActiveSlot(null);
  };

  const cartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | "xlsx" | null>(null);

  const exportPng = useCallback(async () => {
    if (!cartRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cartRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `展示カート_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("PNG export error:", e);
      alert("PNGの書き出しに失敗しました。");
    } finally {
      setExporting(null);
    }
  }, []);

  const exportPdf = useCallback(async () => {
    if (!cartRef.current) return;
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(cartRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      const yOffset = imgH < pageH - margin * 2 ? (pageH - imgH) / 2 : margin;

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("展示カートレイアウト", pageW / 2, margin - 2, { align: "center" });
      pdf.addImage(imgData, "PNG", margin, yOffset, imgW, imgH);

      const dateStr = new Date().toLocaleDateString("ja-JP");
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(dateStr, pageW - margin, pageH - 5, { align: "right" });

      pdf.save(`展示カート_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
      alert("PDFの書き出しに失敗しました。");
    } finally {
      setExporting(null);
    }
  }, []);

  const exportXlsx = useCallback(async () => {
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");

      const CATEGORY_LABELS: Record<string, string> = {
        poster: "ポスター",
        general: "一般",
      };
      const LANGUAGE_LABELS: Record<string, string> = {
        ja: "日本語",
        en: "英語（外国語）",
        other: "その他",
      };

      // Sheet 1: Layout summary table
      const summaryRows = [
        ["展示カートレイアウト表"],
        ["出力日時", new Date().toLocaleString("ja-JP")],
        [],
        ["配置枠", "画像名", "カテゴリ", "言語", "画像URL", "画像ID"],
        ...(Object.entries(layout) as [SlotId, Item | null][]).map(([slotId, item]) => [
          SLOT_LABELS[slotId],
          item?.name ?? "（未配置）",
          item ? (CATEGORY_LABELS[item.category] ?? item.category) : "",
          item ? (LANGUAGE_LABELS[item.language] ?? item.language) : "",
          item?.url ?? "",
          item?.id ?? "",
        ]),
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

      // Column widths
      ws1["!cols"] = [
        { wch: 16 },
        { wch: 30 },
        { wch: 14 },
        { wch: 16 },
        { wch: 60 },
        { wch: 38 },
      ];

      // Sheet 2: カート図面（位置マップ）
      const mapRows = [
        ["", "【展示カート 配置マップ】", ""],
        [],
        ["", "ポスター枠（全幅）", ""],
        ["", layout.poster?.name ?? "（未配置）", ""],
        [],
        ["1段目・左", "", "1段目・右"],
        [layout.shelf1_left?.name ?? "（未配置）", "", layout.shelf1_right?.name ?? "（未配置）"],
        [],
        ["2段目・左", "", "2段目・右"],
        [layout.shelf2_left?.name ?? "（未配置）", "", layout.shelf2_right?.name ?? "（未配置）"],
        [],
        ["3段目・左", "", "3段目・右"],
        [layout.shelf3_left?.name ?? "（未配置）", "", layout.shelf3_right?.name ?? "（未配置）"],
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(mapRows);
      ws2["!cols"] = [{ wch: 30 }, { wch: 6 }, { wch: 30 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "配置リスト");
      XLSX.utils.book_append_sheet(wb, ws2, "配置マップ");

      XLSX.writeFile(wb, `展示カート_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error("XLSX export error:", e);
      alert("Excelの書き出しに失敗しました。");
    } finally {
      setExporting(null);
    }
  }, [layout]);

  const filledCount = Object.values(layout).filter(Boolean).length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm mb-3">画像を選択</h2>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
              />
            </div>

            {/* Filter tabs */}
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(FILTER_LABELS) as SidebarFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Hint */}
          {selectedItem && (
            <div className="mx-3 mt-3 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5 flex-shrink-0" />
                カートの枠をクリックして配置
              </p>
            </div>
          )}

          {/* Image list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 text-destructive" />
                読み込みエラー
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-40" />
                画像がありません
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleSidebarClick(item)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/30"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate leading-tight">
                        {item.name}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge
                          variant={item.category === "poster" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.category === "poster" ? "ポスター" : "一般"}
                        </Badge>
                        <Badge
                          variant={
                            item.language === "ja"
                              ? "success"
                              : item.language === "en"
                              ? "warning"
                              : "outline"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {item.language === "ja"
                            ? "日本語"
                            : item.language === "en"
                            ? "EN"
                            : "他"}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                    )}
                  </motion.button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main Canvas ── */}
        <main className="flex-1 overflow-auto bg-slate-100 p-6 flex flex-col items-center">
          {/* Toolbar */}
          <div className="w-full max-w-2xl flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <span className="font-bold text-slate-800 text-lg">カートレイアウト</span>
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                {filledCount} / 7 枠
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* PNG export */}
              <button
                onClick={exportPng}
                disabled={!!exporting}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-200 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "png" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                PNG保存
              </button>
              {/* PDF export */}
              <button
                onClick={exportPdf}
                disabled={!!exporting}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-500 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "pdf" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
                PDF保存
              </button>
              {/* XLSX export */}
              <button
                onClick={exportXlsx}
                disabled={!!exporting}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-500 px-3 py-1.5 rounded-lg border border-amber-200 hover:border-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting === "xlsx" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Table2 className="w-3.5 h-3.5" />
                )}
                Excel保存
              </button>
              {/* Reset */}
              <button
                onClick={resetLayout}
                disabled={!!exporting}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-white px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                リセット
              </button>
            </div>
          </div>

          {/* Hint when no selection */}
          {!selectedItem && (
            <div className="w-full max-w-2xl mb-4">
              <p className="text-xs text-slate-400 text-center">
                ← 左のサイドバーから画像を選び、カートの枠をクリックして配置してください
              </p>
            </div>
          )}

          {/* Cart Frame */}
          <div ref={cartRef} className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Cart Header */}
            <div className="bg-slate-700 text-white px-5 py-2.5 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">展示カート</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Poster Slot */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  ポスター枠
                </p>
                <CartSlot
                  slotId="poster"
                  item={layout.poster}
                  isActive={activeSlot === "poster"}
                  isSelecting={!!selectedItem}
                  onClick={handleSlotClick}
                  onClear={clearSlot}
                  tall
                />
              </div>

              {/* Shelves */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  棚（3段 × 2枠）
                </p>
                <div className="space-y-3">
                  {(
                    [
                      ["shelf1_left", "shelf1_right", "1段目"],
                      ["shelf2_left", "shelf2_right", "2段目"],
                      ["shelf3_left", "shelf3_right", "3段目"],
                    ] as [SlotId, SlotId, string][]
                  ).map(([left, right, label]) => (
                    <div key={label}>
                      {/* Shelf label */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <CartSlot
                          slotId={left}
                          item={layout[left]}
                          isActive={activeSlot === left}
                          isSelecting={!!selectedItem}
                          onClick={handleSlotClick}
                          onClear={clearSlot}
                        />
                        <CartSlot
                          slotId={right}
                          item={layout[right]}
                          isActive={activeSlot === right}
                          isSelecting={!!selectedItem}
                          onClick={handleSlotClick}
                          onClear={clearSlot}
                        />
                      </div>
                      {/* Shelf board */}
                      <div className="mt-2 h-3 bg-gradient-to-b from-slate-300 to-slate-400 rounded-sm shadow-sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart legs */}
              <div className="flex justify-around px-8 pt-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-3 h-6 bg-slate-400 rounded-b-sm" />
                ))}
              </div>
            </div>
          </div>

          {/* Layout summary */}
          {filledCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl mt-5 bg-white rounded-xl border border-slate-200 p-4"
            >
              <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">
                配置済みアイテム一覧
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(layout) as [SlotId, Item | null][])
                  .filter(([, item]) => item !== null)
                  .map(([slotId, item]) => (
                    <div
                      key={slotId}
                      className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-2"
                    >
                      <img
                        src={item!.url}
                        alt={item!.name}
                        className="w-8 h-8 object-cover rounded flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{item!.name}</p>
                        <p className="text-slate-400">{SLOT_LABELS[slotId]}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── CartSlot Component ── */
interface CartSlotProps {
  slotId: SlotId;
  item: Item | null;
  isActive: boolean;
  isSelecting: boolean;
  onClick: (slotId: SlotId) => void;
  onClear: (slotId: SlotId, e: React.MouseEvent) => void;
  tall?: boolean;
}

function CartSlot({ slotId, item, isActive, isSelecting, onClick, onClear, tall }: CartSlotProps) {
  const isEmpty = !item;
  const heightClass = tall ? "h-40" : "h-28";

  return (
    <motion.div
      onClick={() => onClick(slotId)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`relative ${heightClass} rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelecting && isEmpty
          ? "border-primary border-dashed bg-primary/5 shadow-md shadow-primary/10"
          : isSelecting && !isEmpty
          ? "border-primary border-dashed hover:brightness-95"
          : isActive
          ? "border-primary bg-primary/5"
          : isEmpty
          ? "border-dashed border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {isEmpty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {isSelecting ? (
            <>
              <MousePointerClick className="w-5 h-5 text-primary animate-bounce" />
              <span className="text-xs text-primary font-medium">ここに配置</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5 text-slate-300" />
              <span className="text-[11px] text-slate-300">{SLOT_LABELS[slotId]}</span>
            </>
          )}
        </div>
      ) : (
        <>
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-contain bg-slate-50"
          />
          {/* Overlay on selecting */}
          {isSelecting && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <span className="text-xs bg-white/90 text-primary font-bold px-2 py-1 rounded-lg shadow">
                入れ替え
              </span>
            </div>
          )}
          {/* Clear button */}
          <button
            onClick={(e) => onClear(slotId, e)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ opacity: undefined }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Item name tooltip */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-[10px] text-white font-medium truncate">{item.name}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}

const SLOT_LABELS: Record<SlotId, string> = {
  poster: "ポスター枠",
  shelf1_left: "1段目・左",
  shelf1_right: "1段目・右",
  shelf2_left: "2段目・左",
  shelf2_right: "2段目・右",
  shelf3_left: "3段目・左",
  shelf3_right: "3段目・右",
};
