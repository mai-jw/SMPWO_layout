"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Pencil, 
  Upload, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Save, 
  Download, 
  FileImage, 
  FileSpreadsheet,
  X,
  Smartphone,
  Monitor,
  LayoutDashboard,
  Tag,
  Search
} from "lucide-react";
import { 
  CartId, 
  ActiveTarget,
  GalleryFilterType
} from "@/app/page";
import { 
  CartLayoutV2, 
  Item, 
  ShelfLayoutType, 
  TagData 
} from "@/lib/supabase";
import { 
  SHELF_COORDINATES, 
  GALLERY_FILTER_LABELS
} from "@/lib/config";

interface MobileWizardProps {
  // Data
  period: string;
  setPeriod: (p: string) => void;
  cartA: CartLayoutV2;
  setCartA: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  cartB: CartLayoutV2;
  setCartB: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  items: Item[];
  itemMap: Record<string, Item>;
  
  // Handlers
  handleSave: () => Promise<void>;
  handleExportPng: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportXlsx: () => Promise<void>;
  handleDelete: () => void;
  onOpenUpload: () => void;
  
  // Status
  saveStatus: "idle" | "saving" | "saved" | "error";
  exporting: "png" | "pdf" | "xlsx" | null;
  
  // Wizard State
  step: "menu" | "new" | "edit" | "preview";
  setStep: (s: "menu" | "new" | "edit" | "preview") => void;
  
  // View Toggle
  onToggleStandard: () => void;

  // New Creation helpers
  newMonth: number;
  setNewMonth: (m: number) => void;
  newHalf: "前半" | "後半";
  setNewHalf: (h: "前半" | "後半") => void;
  newLocations: string[];
  setNewLocations: React.Dispatch<React.SetStateAction<string[]>>;
  locationsConfig: string[];
  handleCreateNew: () => void;
  formatPeriodDisplay: (p: string) => string;
}

const LANGUAGES = [
  "日本語", "外国語", "英語",
  "中国語（簡体字）", "中国語（繁体字）",
  "韓国語", "ベトナム語", "タガログ語",
  "タイ語", "インドネシア語", "スペイン語",
  "その他",
];

export function MobileWizard({
  period, cartA, setCartA, cartB, setCartB, items, itemMap,
  handleSave, handleExportPng, handleExportPdf, handleExportXlsx, handleDelete,
  onOpenUpload, saveStatus, exporting, step, setStep, onToggleStandard,
  newMonth, setNewMonth, newHalf, setNewHalf, newLocations, setNewLocations, locationsConfig, handleCreateNew, formatPeriodDisplay
}: MobileWizardProps) {
  
  const [activeCart, setActiveCart] = useState<CartId>("A");
  const [activeShelfIdx, setActiveShelfIdx] = useState<number>(0); 
  const [selectionMode, setSelectionMode] = useState<"shelf-type" | "items">("shelf-type");
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const currentCart = activeCart === "A" ? cartA : cartB;
  const currentShelf = activeShelfIdx < 3 ? currentCart.shelves[activeShelfIdx] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "menu" && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-full bg-[#fdfaf3] overflow-y-auto pb-20"
          >
            <div className="p-6 pt-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">何を作成しますか？</h1>
              <p className="text-slate-500 text-sm font-bold">やりたいことを選んでください</p>
            </div>

            <div className="px-6 space-y-4">
              <MenuCard 
                icon={<Plus className="w-6 h-6" />} 
                title="新規レイアウト作成" 
                desc="新しい日付のレイアウトを作成します"
                color="bg-emerald-50 text-emerald-600 border-emerald-100"
                onClick={() => setStep("new")}
              />
              <MenuCard 
                icon={<Pencil className="w-6 h-6" />} 
                title="カートレイアウト編集" 
                desc="現在のカートの中身を設定します"
                color="bg-blue-50 text-blue-600 border-blue-100"
                onClick={() => setStep("edit")}
              />
              <MenuCard 
                icon={<Upload className="w-6 h-6" />} 
                title="画像のアップロード" 
                desc="新しいアイテムをライブラリに追加します"
                color="bg-amber-50 text-amber-600 border-amber-100"
                onClick={onOpenUpload}
              />
              <MenuCard 
                icon={<Trash2 className="w-6 h-6" />} 
                title="レイアウト削除" 
                desc="現在の期間のデータを完全に削除します"
                color="bg-red-50 text-red-600 border-red-100"
                onClick={handleDelete}
              />
            </div>

            <div className="mt-12 px-6">
              <button 
                onClick={onToggleStandard}
                className="w-full py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 font-bold flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Monitor className="w-5 h-5" />
                <span>標準表示（PC版と同じ）に切り替え</span>
              </button>
            </div>
          </motion.div>
        )}

        {step === "new" && (
          <motion.div 
            key="new"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="flex flex-col h-full bg-white"
          >
            <WizardHeader title="新規作成" onBack={() => setStep("menu")} />
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">1. 期間を選択</h3>
                <div className="flex gap-4">
                  <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}
                    className="flex-1 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-lg outline-none focus:border-primary/30">
                    {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
                  </select>
                  <select value={newHalf} onChange={e => setNewHalf(e.target.value as any)}
                    className="flex-1 h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 font-bold text-lg outline-none focus:border-primary/30">
                    <option value="前半">前半</option>
                    <option value="後半">後半</option>
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">2. 地点を選択</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setNewLocations(["すべて"])}
                    className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all ${newLocations.includes("すべて") ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-100 text-slate-600"}`}
                  >
                    すべて
                  </button>
                  {locationsConfig.map(loc => (
                    <button 
                      key={loc}
                      onClick={() => {
                        setNewLocations(prev => {
                          const filtered = prev.filter(l => l !== "すべて");
                          if (filtered.includes(loc)) {
                            const res = filtered.filter(l => l !== loc);
                            return res.length === 0 ? ["すべて"] : res;
                          }
                          return [...filtered, loc];
                        });
                      }}
                      className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all truncate ${!newLocations.includes("すべて") && newLocations.includes(loc) ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-100 text-slate-600"}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <div className="p-6 border-t border-slate-100">
               <button 
                 onClick={handleCreateNew}
                 className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all"
               >
                 レイアウトを作成する
               </button>
            </div>
          </motion.div>
        )}

        {step === "edit" && (
          <motion.div 
            key={`${activeCart}-${activeShelfIdx}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-white"
          >
            <WizardHeader 
              title={`${activeCart === "A" ? "カートA" : "カートB"} — ${activeShelfIdx === 3 ? "ポスター" : ["上段","中段","下段"][activeShelfIdx]}`} 
              onBack={() => {
                if (activeShelfIdx === 0 && activeCart === "A") setStep("menu");
                else if (activeShelfIdx === 0 && activeCart === "B") {
                   setActiveCart("A");
                   setActiveShelfIdx(3);
                } else {
                   setActiveShelfIdx(prev => prev - 1);
                }
              }} 
            />
            
            <div className="h-1.5 w-full bg-slate-100 flex">
               {Array.from({length: 8}, (_, i) => {
                 const currentFlat = (activeCart === "A" ? 0 : 4) + activeShelfIdx;
                 return (
                   <div key={i} className={`h-full flex-1 transition-all duration-500 ${i <= currentFlat ? "bg-primary" : "bg-transparent"}`} />
                 );
               })}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeShelfIdx < 3 ? (
                <section className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">段のレイアウトタイプ</p>
                    <div className="grid grid-cols-2 gap-3">
                       {(["booklet", "booklet_doc", "document", "bible", "pamphlet"] as ShelfLayoutType[]).map(t => (
                         <button key={t} 
                           onClick={() => {
                             const update = (prev: CartLayoutV2) => ({
                               ...prev,
                               shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, layout_type: t, items: t === "document" || t === "bible" ? [null, null, null] : t === "pamphlet" ? [null, null, null, null] : [null, null] } : s)
                             });
                             activeCart === "A" ? setCartA(update) : setCartB(update);
                           }}
                           className={`p-3 rounded-2xl border-2 font-bold text-xs transition-al flex flex-col items-center gap-1 ${currentShelf?.layout_type === t ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                         >
                           <span className="whitespace-pre-line text-center">{GALLERY_FILTER_LABELS[t] || t}</span>
                         </button>
                       ))}
                    </div>
                  </div>

                  {currentShelf?.layout_type !== "none" && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {(() => {
                        const isRow1 = activeShelfIdx === 0;
                        const isDocOrPamphlet = currentShelf?.layout_type === "document" || currentShelf?.layout_type === "pamphlet";
                        const canLangTag = isRow1 || isDocOrPamphlet;
                        const canFreeDist = isDocOrPamphlet;

                        return (
                          <>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Tag className="w-4 h-4" /> タグ設定
                            </p>
                            <div className="space-y-3">
                              {!canLangTag && !canFreeDist ? (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-400 text-center">
                                  この段ではタグの設定はできません
                                </div>
                              ) : (
                                <>
                                  <div className="flex gap-2">
                                     <button 
                                       onClick={() => {
                                         const update = (prev: CartLayoutV2) => ({
                                           ...prev,
                                           shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "none", value: "" }, tag_2: { type: "none", value: "" } } : s)
                                         });
                                         activeCart === "A" ? setCartA(update) : setCartB(update);
                                       }}
                                       className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${currentShelf?.tag_1.type === "none" ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                                     >
                                       なし
                                     </button>
                                     {canLangTag && (
                                       <button 
                                         onClick={() => {
                                           const update = (prev: CartLayoutV2) => ({
                                             ...prev,
                                             shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "lang", value: s.tag_1.type === "lang" ? s.tag_1.value : "" }, tag_2: { type: "none", value: "" } } : s)
                                           });
                                           activeCart === "A" ? setCartA(update) : setCartB(update);
                                         }}
                                         className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${currentShelf?.tag_1.type === "lang" ? "bg-red-600 text-white border-red-600 shadow-md" : "bg-red-50 border-red-100 text-red-600"}`}
                                       >
                                         言語表示
                                       </button>
                                     )}
                                     {canFreeDist && (
                                       <button 
                                         onClick={() => {
                                           const update = (prev: CartLayoutV2) => ({
                                             ...prev,
                                             shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "free_dist", value: "無料で差し上げています" }, tag_2: { type: "none", value: "" } } : s)
                                           });
                                           activeCart === "A" ? setCartA(update) : setCartB(update);
                                         }}
                                         className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs transition-all ${currentShelf?.tag_1.type === "free_dist" ? "bg-zinc-900 text-white border-zinc-900 shadow-md" : "bg-zinc-50 border-zinc-100 text-zinc-600"}`}
                                       >
                                         無料配布
                                       </button>
                                     )}
                                  </div>
                                  {currentShelf?.tag_1.type === "lang" && (
                                     <div className="grid grid-cols-2 gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-red-700/60 uppercase">左タグ</label>
                                          <select 
                                            value={currentShelf.tag_1.value}
                                            onChange={(e) => {
                                              const update = (prev: CartLayoutV2) => ({
                                                ...prev,
                                                shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "lang", value: e.target.value } } : s)
                                              });
                                              activeCart === "A" ? setCartA(update) : setCartB(update);
                                            }}
                                            className="w-full h-10 bg-white border border-red-200 rounded-lg px-2 text-xs font-bold outline-none"
                                          >
                                            <option value="">選択...</option>
                                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black text-red-700/60 uppercase">右タグ</label>
                                          <select 
                                            value={currentShelf.tag_2.value}
                                            onChange={(e) => {
                                              const update = (prev: CartLayoutV2) => ({
                                                ...prev,
                                                shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_2: { type: e.target.value ? "lang" : "none", value: e.target.value } } : s)
                                              });
                                              activeCart === "A" ? setCartA(update) : setCartB(update);
                                            }}
                                            className="w-full h-10 bg-white border border-red-200 rounded-lg px-2 text-xs font-bold outline-none"
                                          >
                                            <option value="">なし</option>
                                            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                          </select>
                                        </div>
                                     </div>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {currentShelf?.layout_type !== "none" && (
                    <div className="space-y-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">画像を配置 ({currentShelf?.items.length}スロット)</p>
                      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {currentShelf?.items.map((it, sIdx) => {
                          const item = it ? itemMap[it] : null;
                          return (
                            <div key={sIdx} className="shrink-0 space-y-2">
                               <button 
                                 onClick={() => { setActiveSlotIdx(sIdx); setSelectionMode("items"); }}
                                 className={`w-32 h-44 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all ${activeSlotIdx === sIdx && selectionMode === "items" ? "border-primary ring-4 ring-primary/10" : "border-dashed border-slate-200 bg-slate-50"}`}
                               >
                                  {item ? (
                                    <>
                                      <img src={item.url} className="w-full h-full object-cover" />
                                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                                         <p className="text-[10px] text-white font-bold truncate">{item.name}</p>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center p-4">
                                      <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">スロット {sIdx+1}</p>
                                    </div>
                                  )}
                               </button>
                               {item && (
                                  <button 
                                    onClick={() => {
                                       const update = (prev: CartLayoutV2) => ({
                                          ...prev,
                                          shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, items: s.items.map((id, j) => j === sIdx ? null : id) } : s)
                                       });
                                       activeCart === "A" ? setCartA(update) : setCartB(update);
                                    }}
                                    className="w-full py-2 text-[10px] font-bold text-red-500 bg-red-50 rounded-lg"
                                  >
                                    クリア
                                  </button>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <section className="space-y-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ポスター画像を選択</p>
                  <button 
                    onClick={() => { setSelectionMode("items"); }}
                    className="w-full aspect-[1/1.4] rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all relative"
                  >
                    {currentCart.poster ? (
                      <>
                        <img src={itemMap[currentCart.poster]?.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity">
                           <Plus className="w-12 h-12 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Plus className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase">ポスターを選択してください</p>
                      </>
                    )}
                  </button>
                  {currentCart.poster && (
                     <button 
                       onClick={() => (activeCart === "A" ? setCartA : setCartB)(prev => ({ ...prev, poster: null }))}
                       className="w-full py-4 text-sm font-bold text-red-500 bg-red-50 rounded-2xl"
                     >
                       削除する
                     </button>
                  )}
                </section>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-4">
               <button 
                 onClick={() => {
                   if (activeShelfIdx === 3) {
                     if (activeCart === "A") {
                       setActiveCart("B");
                       setActiveShelfIdx(0);
                     } else {
                       setStep("preview");
                     }
                   } else {
                     setActiveShelfIdx(prev => prev + 1);
                   }
                 }}
                 className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 <span>{activeShelfIdx === 3 && activeCart === "B" ? "完了してプレビューへ" : "次のステップへ"}</span>
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div 
            key="preview"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="flex flex-col h-full bg-[#fdfaf3] overflow-y-auto"
          >
            <WizardHeader title="最終確認" onBack={() => setStep("edit")} />
            
            <div className="flex-1 p-6 space-y-6">
               <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest">設定内容</h3>
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg">{formatPeriodDisplay(period)}</span>
                  </div>
                  
                  {([cartA, cartB] as CartLayoutV2[]).map((c, i) => (
                    <div key={i} className="space-y-3">
                       <div className="flex items-center justify-between">
                         <p className="font-black text-sm text-slate-800">カート{i === 0 ? "A" : "B"}</p>
                         <button onClick={() => { setActiveCart(i === 0 ? "A" : "B"); setActiveShelfIdx(0); setStep("edit"); }} className="text-[10px] font-bold text-primary underline">全再編集</button>
                       </div>
                       <div className="grid grid-cols-4 gap-2">
                          <PreviewSquare item={c.poster ? itemMap[c.poster] : null} label="POS" onClick={() => { setActiveCart(i === 0 ? "A" : "B"); setActiveShelfIdx(3); setStep("edit"); }} />
                          {c.shelves.map((s, si) => (
                            <PreviewSquare key={si} item={s.items[0] ? itemMap[s.items[0]] : null} label={["上","中","下"][si]} onClick={() => { setActiveCart(i === 0 ? "A" : "B"); setActiveShelfIdx(si); setStep("edit"); }} />
                          ))}
                       </div>
                    </div>
                  ))}
               </div>

               <div className="space-y-3 pt-4 pb-20">
                 <button 
                   onClick={handleSave} 
                   disabled={saveStatus === "saving" || !period.trim()}
                   className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${saveStatus === "saved" ? "bg-emerald-500 text-white" : "bg-[#1b618d] text-white shadow-[#1b618d]/20"}`}
                 >
                   {saveStatus === "saving" ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
                   <span>{saveStatus === "saved" ? "保存完了" : saveStatus === "saving" ? "保存中..." : "レイアウトを確定・保存"}</span>
                 </button>

                 <div className="grid grid-cols-3 gap-3">
                    <ExportBtn icon={<FileImage className="w-5 h-5"/> } active={exporting === "png"} onClick={handleExportPng} label="PNG" />
                    <ExportBtn icon={<Download className="w-5 h-5"/> } active={exporting === "pdf"} onClick={handleExportPdf} label="PDF" />
                    <ExportBtn icon={<FileSpreadsheet className="w-5 h-5"/> } active={exporting === "xlsx"} onClick={handleExportXlsx} label="Excel" />
                 </div>

                 <button 
                   onClick={onToggleStandard}
                   className="w-full py-4 text-xs font-bold text-slate-400 bg-transparent flex items-center justify-center gap-2 mt-8"
                 >
                   <Smartphone className="w-4 h-4" />
                   標準表示に切り替える
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectionMode === "items" && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <WizardHeader title="画像を選択" onBack={() => setSelectionMode("shelf-type")} />
            <div className="p-4 border-b border-slate-100">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                 <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                   className="w-full h-12 bg-slate-50 rounded-xl pl-12 pr-4 font-bold outline-none focus:ring-2 focus:ring-primary/20" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {items
                 .filter(it => {
                    if (activeShelfIdx === 3) return it.category === "poster";
                    const allowed = currentShelf?.layout_type === "booklet" ? ["booklet", "magazine"]
                      : currentShelf?.layout_type === "booklet_doc" ? ["booklet_doc"]
                      : (currentShelf?.layout_type === "document" || currentShelf?.layout_type === "bible") ? ["document", "bible"]
                      : ["pamphlet", "invitation"];
                    return allowed.includes(it.category) && it.name.toLowerCase().includes(searchQuery.toLowerCase());
                 })
                 .map(it => (
                    <button 
                      key={it.id}
                      onClick={() => {
                        const update = (prev: CartLayoutV2) => {
                          if (activeShelfIdx === 3) return { ...prev, poster: it.id!, posterType: it.poster_type || prev.posterType };
                          return {
                             ...prev,
                             shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, items: s.items.map((id, j) => j === activeSlotIdx ? it.id! : id) } : s)
                          };
                        };
                        (activeCart === "A" ? setCartA : setCartB)(update);
                        setSelectionMode("shelf-type");
                      }}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
                    >
                      <img src={it.url} className="w-12 h-12 object-cover rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{it.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">
                          {GALLERY_FILTER_LABELS[it.category as GalleryFilterType] || it.category}
                        </p>
                      </div>
                    </button>
                 ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
function MenuCard({ icon, title, desc, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-5 p-5 rounded-3xl border-2 transition-all active:scale-[0.97] active:shadow-inner ${color}`}>
       <div className="shrink-0 w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
         {icon}
       </div>
       <div className="text-left">
          <p className="text-lg font-black tracking-tight leading-tight mb-1">{title}</p>
          <p className="text-xs font-bold opacity-70 leading-relaxed">{desc}</p>
       </div>
       <ChevronRight className="ml-auto w-6 h-6 opacity-30" />
    </button>
  );
}

function WizardHeader({ title, onBack }: any) {
  return (
    <div className="shrink-0 h-16 border-b border-slate-100 px-4 flex items-center gap-4 bg-white z-[150]">
       <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
         <ChevronLeft className="w-6 h-6 text-slate-800" />
       </button>
       <h2 className="text-lg font-black text-slate-800 tracking-tight">{title}</h2>
    </div>
  );
}

function PreviewSquare({ item, label, onClick }: any) {
  return (
    <button onClick={onClick} className="aspect-square bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative flex items-center justify-center">
       {item ? <img src={item.url} className="w-full h-full object-cover" /> : <Plus className="w-4 h-4 text-slate-200" />}
       <div className="absolute top-1 left-1 bg-white/80 rounded px-1 min-w-[12px] text-center">
         <span className="text-[8px] font-black text-slate-600 uppercase">{label}</span>
       </div>
    </button>
  )
}

function ExportBtn({ icon, active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={active}
      className={`flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all active:scale-95 ${active ? "bg-slate-50 border-slate-100 text-slate-400" : "bg-white border-slate-100 text-slate-700 shadow-sm"}`}
    >
       {active ? <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" /> : icon}
       <span className="text-[10px] font-black">{label}</span>
    </button>
  )
}
