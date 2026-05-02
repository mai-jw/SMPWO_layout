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
  Search,
  ChevronDown,
  Check,
  FileText,
  SortAsc,
  Lock,
  LockOpen
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
  TagData,
  TagType,
  NoteLine
} from "@/lib/supabase";
import { 
  SHELF_COORDINATES, 
  GALLERY_FILTER_LABELS,
  LANG_FILTER_OPTIONS
} from "@/lib/config";


const COLORS = {
  deepPurple: "#190933",
  coral: "#EE9E8E",
  peach: "#FFDBC3",
  cream: "#FFF5E0",
  white: "#FFFFFF",
};

interface MobileWizardProps {
  period: string;
  setPeriod: (p: string) => void;
  cartA: CartLayoutV2;
  setCartA: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  cartB: CartLayoutV2;
  setCartB: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  items: Item[];
  itemMap: Record<string, Item>;
  layouts: { period: string; cart_a: CartLayoutV2; cart_b: CartLayoutV2 }[];
  handleSave: () => Promise<void>;
  handleExportPng: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportXlsx: () => Promise<void>;
  handleDelete: () => void;
  onOpenUpload: () => void;
  executeDeleteLayoutForPeriod: (targetPeriod: string) => Promise<void>;
  loadLayoutForEdit: (targetPeriod: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  exporting: "png" | "pdf" | "xlsx" | null;
  step: "menu" | "new" | "edit" | "preview" | "select-edit" | "select-delete";
  setStep: (s: "menu" | "new" | "edit" | "preview" | "select-edit" | "select-delete") => void;
  onToggleStandard: () => void;
  newMonth: number;
  setNewMonth: (m: number) => void;
  newHalf: "前半" | "後半";
  setNewHalf: (h: "前半" | "後半") => void;
  newLocations: string[];
  setNewLocations: React.Dispatch<React.SetStateAction<string[]>>;
  locationsConfig: string[];
  handleCreateNew: () => void;
  formatPeriodDisplay: (p: string) => string;
  exportTarget: "png" | "pdf" | "xlsx" | null;
  setExportTarget: (t: "png" | "pdf" | "xlsx" | null) => void;
  notes: NoteLine[];
  setNotes: React.Dispatch<React.SetStateAction<NoteLine[]>>;
  onLangOverride: (cart: CartId, section: "poster" | "shelf", shelfIdx?: number, slotIdx?: number, lang?: string) => void;
  isLayoutLocked: boolean;
  toggleLayoutLock: () => void;
}



const LANGUAGES = [
  "日本語", "外国語", "英語",
  "中国語",
  "韓国語", "ベトナム語", "タガログ語",
  "タイ語", "インドネシア語", "スペイン語",
  "その他",
];

export function MobileWizard({
  period, cartA, setCartA, cartB, setCartB, items, itemMap, layouts,
  handleSave, handleExportPng, handleExportPdf, handleExportXlsx, handleDelete,
  onOpenUpload, saveStatus, exporting, step, setStep, onToggleStandard,
  newMonth, setNewMonth, newHalf, setNewHalf, newLocations, setNewLocations, locationsConfig, handleCreateNew, formatPeriodDisplay,
  executeDeleteLayoutForPeriod, loadLayoutForEdit,
  exportTarget, setExportTarget,
  notes, setNotes,
  onLangOverride,
  isLayoutLocked,
  toggleLayoutLock
}: MobileWizardProps) {


  
  const [activeCart, setActiveCart] = useState<CartId>("A");
  const [activeShelfIdx, setActiveShelfIdx] = useState<number>(0); 
  const [selectionMode, setSelectionMode] = useState<"shelf-type" | "items">("shelf-type");
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "name_asc" | "name_desc">("newest");

  const currentCart = activeCart === "A" ? cartA : cartB;
  const currentShelf = activeShelfIdx < 3 ? currentCart.shelves[activeShelfIdx] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden pt-safe" style={{ backgroundColor: COLORS.cream }}>
      <AnimatePresence mode="wait">
        {step === "menu" && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col h-full overflow-hidden"
          >
            <div className="relative pt-12 pb-20 px-8 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://dugmuhbuujmfwmdehgdt.supabase.co/storage/v1/object/public/design/Mobile.png" 
                  alt="Background" 
                  className="w-full h-full object-cover"
                />
                {/* Subtle overlay to ensure text readability if needed */}
                <div className="absolute inset-0 bg-black/10" />
              </div>
              <div className="relative z-10 flex flex-col gap-1 pr-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-widest leading-none uppercase">SMPWO</h1>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">LAYOUT</p>
                  </div>
                </div>
              </div>

              {/* Top-Right Toggle to PC View */}
              <button 
                onClick={onToggleStandard}
                className="absolute top-10 right-8 z-[100] w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white active:scale-90 transition-all shadow-lg"
                title="PC表示に切り替え"
              >
                <Monitor className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 px-8 -mt-6 relative z-20 space-y-4 pb-8 overflow-hidden">
              <div className="grid grid-cols-2 gap-4">
                <MenuCard 
                  icon={<Plus className="w-8 h-8" />} 
                  title="新規作成" 
                  color={COLORS.peach}
                  onClick={() => setStep("new")}
                />
                <MenuCard 
                  icon={<Pencil className="w-8 h-8" />} 
                  title="配置編集" 
                  color={COLORS.white}
                  onClick={() => setStep("select-edit")}
                />
              </div>
              <MenuCard 
                wide
                icon={<Upload className="w-8 h-8" />} 
                title="ライブラリに画像を追加" 
                desc="新しい出版物やポスターを登録"
                color={COLORS.white}
                onClick={onOpenUpload}
              />
              <MenuCard 
                wide
                icon={<Trash2 className="w-8 h-8" />} 
                title="過去データの削除" 
                desc="保存済みのレイアウトを整理"
                color={COLORS.white}
                onClick={() => setStep("select-delete")}
              />
            </div>
          </motion.div>
        )}

        {step === "select-edit" && (
          <motion.div key="select-edit" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="flex flex-col h-full bg-cream">
            <WizardHeader title="配置を編集する" onBack={() => setStep("menu")} />
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {layouts.length === 0 ? (
                <EmptyState icon={<Search />} text="保存済みのデータはありません" sub="新規作成から始めてください" />
              ) : (
                layouts.map(l => (
                  <button
                    key={l.period}
                    onClick={() => loadLayoutForEdit(l.period)}
                    className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] text-left active:scale-[0.98] transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-base" style={{ color: COLORS.deepPurple }}>{formatPeriodDisplay(l.period)}</p>
                        {l.cart_a.isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">
                        {l.cart_a.isLocked ? "提出済ロック (閲覧のみ)" : "Tap to start editing"}
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 opacity-20" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}

        {step === "select-delete" && (
          <motion.div key="select-delete" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} className="flex flex-col h-full bg-cream">
            <WizardHeader title="データを削除する" onBack={() => setStep("menu")} />
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {layouts.length === 0 ? (
                <EmptyState icon={<Trash2 />} text="削除できるデータはありません" />
              ) : (
                layouts.map(l => (
                  <DeleteLayoutRow
                    key={l.period}
                    period={l.period}
                    displayName={formatPeriodDisplay(l.period)}
                    isLocked={l.cart_a.isLocked || false}
                    onConfirm={() => executeDeleteLayoutForPeriod(l.period)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}

        {step === "new" && (
          <motion.div key="new" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="flex flex-col h-full bg-cream">
            <WizardHeader title="新規レイアウト" onBack={() => setStep("menu")} />
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <section className="space-y-6">
                <SectionLabel label="1. 期間を選ぶ" />
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}
                      className="w-full h-16 bg-white rounded-[1.5rem] px-6 font-black text-lg outline-none shadow-sm appearance-none" style={{ color: COLORS.deepPurple }}>
                      {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-6 w-4 h-4 opacity-20 pointer-events-none" />
                  </div>
                  <div className="flex-1 relative">
                    <select value={newHalf} onChange={e => setNewHalf(e.target.value as any)}
                      className="w-full h-16 bg-white rounded-[1.5rem] px-6 font-black text-lg outline-none shadow-sm appearance-none" style={{ color: COLORS.deepPurple }}>
                      <option value="前半">前半</option>
                      <option value="後半">後半</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-6 w-4 h-4 opacity-20 pointer-events-none" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <SectionLabel label="2. 地点を選ぶ" />
                <div className="grid grid-cols-2 gap-3 pb-8">
                  <LocationBtn label="すべて" active={newLocations.includes("すべて")} onClick={() => setNewLocations(["すべて"])} />
                  {locationsConfig.map(loc => (
                    <LocationBtn key={loc} label={loc} active={!newLocations.includes("すべて") && newLocations.includes(loc)}
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
                    />
                  ))}
                </div>
              </section>
            </div>
            <div className="p-8 bg-white rounded-t-[3rem] shadow-2xl">
               <button onClick={handleCreateNew} className="w-full py-6 rounded-[2rem] font-black text-lg text-white shadow-xl shadow-coral/30 active:scale-95 transition-all" style={{ backgroundColor: COLORS.coral }}>
                 新しい配置を作成
               </button>
            </div>
          </motion.div>
        )}

        {step === "edit" && (
           <motion.div key={`${activeCart}-${activeShelfIdx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-cream">
            <WizardHeader title={`${activeCart} — ${activeShelfIdx === 3 ? "ポスター" : ["上段","中段","下段"][activeShelfIdx]}`} onBack={() => {
                if (activeShelfIdx === 0 && activeCart === "A") setStep("menu");
                else if (activeShelfIdx === 0 && activeCart === "B") { setActiveCart("A"); setActiveShelfIdx(3); }
                else setActiveShelfIdx(prev => prev - 1);
            }} />
            <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-32">
              {activeShelfIdx < 3 ? (
                <>
                  <section className="space-y-6">
                    <SectionLabel label="レイアウトを選択" />
                    <div className="grid grid-cols-2 gap-3">
                       {(["booklet", "booklet_doc", "document", "bible", "pamphlet"] as ShelfLayoutType[]).map(t => (
                         <button key={t} onClick={() => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, layout_type: t, items: t === "document" || t === "bible" ? [null, null, null] : t === "pamphlet" ? [null, null, null, null] : [null, null] } : s) })); }}
                           className={`p-4 h-24 rounded-[2rem] border-2 font-black text-[11px] flex items-center justify-center transition-all ${currentShelf?.layout_type === t ? "shadow-lg scale-105" : "bg-white border-transparent opacity-60"} ${isLayoutLocked ? "cursor-not-allowed opacity-40" : ""}`}
                           style={{ backgroundColor: currentShelf?.layout_type === t ? COLORS.peach : COLORS.white, borderColor: currentShelf?.layout_type === t ? COLORS.coral : "transparent", color: COLORS.deepPurple }}
                         >
                           <span className="whitespace-pre-line text-center">
                             {t === "booklet" ? "冊子/雑誌類" : 
                              t === "booklet_doc" ? "書籍\n(冊子サイズ)" : 
                              t === "document" ? "書籍\n(文庫サイズ)" : 
                              t === "bible" ? "聖書" :
                              "パンフレット/\n招待状"}
                           </span>
                         </button>
                       ))}
                    </div>
                  </section>
                  {currentShelf?.layout_type !== "none" && (
                    <section className="space-y-6">
                      <SectionLabel label="タグ設定" />
                      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl space-y-4">
                        {(() => {
                           const isSpecialTagLayout = currentShelf?.layout_type === "document" || currentShelf?.layout_type === "bible";
                           const canLangTag = activeShelfIdx === 0 || isSpecialTagLayout;
                           const canFreeDist = isSpecialTagLayout;

                           return (
                             <>
                               <div className="flex gap-2">
                                  <TagOptionBtn label="なし" active={currentShelf?.tag_1.type === "none"} 
                                    onClick={() => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "none", value: "" }, tag_2: { type: "none", value: "" } } : s) })); }} 
                                  />
                                  {canLangTag && (
                                    <TagOptionBtn label="言語" color={COLORS.coral} active={currentShelf?.tag_1.type === "lang"} 
                                      onClick={() => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "lang", value: "" }, tag_2: { type: "none", value: "" } } : s) })); }}
                                    />
                                  )}
                                  {canFreeDist && (
                                    <TagOptionBtn label="無料配布" color={COLORS.deepPurple} active={currentShelf?.tag_1.type === "free_dist"} 
                                      onClick={() => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "free_dist", value: "無料で差し上げています" }, tag_2: { type: "none", value: "" } } : s) })); }}
                                    />
                                  )}
                               </div>
                               {currentShelf?.tag_1.type === "lang" && (
                                 <div className="grid grid-cols-2 gap-3 pt-2">
                                    <TagSelect value={currentShelf.tag_1.value} placeholder="左タグ" onChange={v => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_1: { type: "lang", value: v } } : s) })); }} />
                                    <TagSelect value={currentShelf.tag_2.value} placeholder="右タグ" onChange={v => { if (isLayoutLocked) return; (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => ({ ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, tag_2: { type: v ? "lang" : "none", value: v } } : s) })); }} />
                                 </div>
                               )}
                             </>
                           );
                        })()}
                      </div>
                    </section>
                  )}
                  {currentShelf?.layout_type !== "none" && (
                    <section className="space-y-6">
                      <SectionLabel label="出版物を配置" />
                      <div className="grid grid-cols-2 gap-4">
                        {currentShelf?.items.map((itId, sIdx) => {
                          const item = itId ? itemMap[itId] : null;
                          return (
                            <div key={sIdx} className="space-y-3">
                              <button onClick={() => { if (!isLayoutLocked) { setActiveSlotIdx(sIdx); setSelectionMode("items"); } }}
                                className={`aspect-[1/1.4] w-full rounded-[2.5rem] bg-white border-4 p-4 flex flex-col items-center justify-center transition-all ${activeSlotIdx === sIdx && selectionMode === "items" ? "shadow-2xl scale-105" : "border-slate-50 opacity-80"} ${isLayoutLocked ? "opacity-40 grayscale-[0.5] cursor-not-allowed" : ""}`}
                                style={{ borderColor: activeSlotIdx === sIdx && selectionMode === "items" ? COLORS.coral : COLORS.white }}
                              >
                                {item ? <img src={item.url} className="w-full h-full object-contain drop-shadow-lg" /> : <div className="text-center"><Plus className="w-10 h-10 opacity-10 mx-auto mb-2" /><p className="text-[10px] font-black opacity-30 uppercase tracking-widest">S-{sIdx+1}</p></div>}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="space-y-8">
                  <SectionLabel label="ポスターを選択" />
                  <button onClick={() => { if (!isLayoutLocked) setSelectionMode("items"); }} className={`w-full aspect-[1/1.4] rounded-[3rem] bg-white shadow-xl flex flex-col items-center justify-center overflow-hidden border-4 border-white transition-all active:scale-95 ${isLayoutLocked ? "opacity-40 grayscale-[0.5] cursor-not-allowed" : ""}`}>
                    {currentCart.poster ? <img src={itemMap[currentCart.poster]?.url} className="w-full h-full object-contain p-8" /> : <><Plus className="w-16 h-16 opacity-10 mb-4" /><p className="text-sm font-black opacity-30 uppercase tracking-widest">Select Poster</p></>}
                  </button>
                </section>
              )}
            </div>
            <div className="p-8 bg-white rounded-t-[3rem] shadow-2xl flex flex-col gap-4">
              <div className="flex gap-4">
                <button onClick={() => { if (activeShelfIdx === 0 && activeCart === "A") setStep("menu"); else if (activeShelfIdx === 0 && activeCart === "B") { setActiveCart("A"); setActiveShelfIdx(3); } else setActiveShelfIdx(prev => prev - 1); }}
                  className="w-20 h-16 rounded-[1.5rem] bg-cream flex items-center justify-center active:scale-90 transition-all font-black text-coral">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={() => { if (activeShelfIdx === 3) { if (activeCart === "A") { setActiveCart("B"); setActiveShelfIdx(0); } else setStep("preview"); } else setActiveShelfIdx(prev => prev + 1); }}
                  className="flex-1 h-16 rounded-[1.5rem] font-black text-white shadow-lg shadow-coral/30 active:scale-95 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.coral }}>
                  <span>{activeShelfIdx === 3 && activeCart === "B" ? "プレビューへ" : "次へ進む"}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Shortcut to Preview */}
              <button 
                onClick={() => setStep("preview")}
                className="w-full h-14 rounded-[1.25rem] font-black text-sm text-slate-400 border-2 border-slate-100 active:scale-95 transition-all text-center"
              >
                編集を切り上げてプレビューへ
              </button>
            </div>
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div key="preview" initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col h-full overflow-y-auto bg-cream">
            <WizardHeader title="最終確認" onBack={() => setStep("edit")} />
            <div className="p-8 space-y-8 pb-32">
               <div className="bg-white rounded-[3rem] p-10 shadow-xl space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black" style={{ color: COLORS.deepPurple }}>{formatPeriodDisplay(period)}</h3>
                      <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-1">Ready to Save</p>
                    </div>
                    <div className="w-14 h-14 rounded-3xl flex items-center justify-center bg-emerald-50 text-emerald-500"><Check className="w-8 h-8" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {(["A", "B"] as CartId[]).map((cid, i) => (
                      <div key={cid} className="space-y-4 flex flex-col items-center">
                         <p className="font-black text-sm opacity-40 uppercase tracking-widest text-center">カート {cid}</p>
                         <div className="aspect-[2/3] w-full bg-cream rounded-[2rem] p-4 flex flex-col gap-2 shadow-inner">
                            <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden p-2">
                               {(() => {
                                 const pId = (i === 0 ? cartA : cartB).poster;
                                 return pId ? <img src={itemMap[pId]?.url} className="w-full h-full object-contain opacity-20" /> : null;
                               })()}
                            </div>
                            <div className="flex gap-1 h-10"><div className="flex-1 bg-white/50 rounded-lg" /><div className="flex-1 bg-white/50 rounded-lg" /></div>
                         </div>
                         <button 
                           onClick={() => { setActiveCart(cid); setActiveShelfIdx(0); setStep("edit"); }}
                           className="text-[10px] font-black uppercase tracking-widest text-coral/60 border-b border-coral/20 pb-0.5"
                         >
                           ↑ 編集に戻る
                         </button>
                      </div>
                    ))}
                  </div>
               </div>
                <div className="space-y-4">
                   {/* Supplementary Notes (Wizard Preview) */}
                   <div className="bg-white rounded-[3rem] p-8 shadow-xl space-y-6">
                      <div className="flex items-center justify-between">
                         <SectionLabel label="補足事項" />
                         {!isLayoutLocked && <Plus className="w-5 h-5 text-coral" onClick={() => setNotes(prev => [...prev, { text: "", color: "inherit" }])} />}
                      </div>
                      <div className="space-y-4">
                         {notes.length === 0 ? (
                            <p className="text-center text-slate-300 font-bold text-xs py-4">補足事項はありません</p>
                         ) : notes.map((line, idx) => (
                            <div key={idx} className="flex gap-4 items-start bg-cream/30 p-4 rounded-3xl border border-cream/50 relative group">
                               <div className="flex flex-col gap-3 pt-1">
                                  {[
                                     { val: "inherit", color: "bg-slate-800" },
                                     { val: "#dc2626", color: "bg-red-600" },
                                     { val: "#2563eb", color: "bg-blue-600" },
                                     { val: "#059669", color: "bg-emerald-600" }
                                  ].map(c => (
                                     <button
                                        key={c.val}
                                        disabled={isLayoutLocked}
                                        onClick={() => { if (!isLayoutLocked) setNotes(prev => prev.map((l, i) => i === idx ? { ...l, color: c.val } : l)); }}
                                        className={`w-4 h-4 rounded-full ${c.color} ${line.color === c.val ? "ring-4 ring-offset-2 ring-slate-200" : "opacity-30"} ${isLayoutLocked ? "cursor-not-allowed" : ""}`}
                                     />
                                  ))}
                               </div>
                               <textarea
                                  value={line.text}
                                  onChange={(e) => { if (!isLayoutLocked) setNotes(prev => prev.map((l, i) => i === idx ? { ...l, text: e.target.value } : l)); }}
                                  readOnly={isLayoutLocked}
                                  rows={1}
                                  className={`flex-1 bg-transparent text-sm font-bold outline-none resize-none leading-relaxed ${isLayoutLocked ? "opacity-70" : ""}`}
                                  style={{ color: line.color !== "inherit" ? line.color : undefined }}
                                  placeholder="内容を入力..."
                               />
                               {!isLayoutLocked && (
                                 <button onClick={() => setNotes(prev => prev.filter((_, i) => i !== idx))} className="shrink-0 p-1 text-red-300">
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={toggleLayoutLock}
                      className={`flex-1 py-6 rounded-[2rem] font-black text-xl transition-all active:scale-95 flex items-center justify-center gap-3 border-4 ${
                        isLayoutLocked 
                          ? "bg-white text-rose-500 border-rose-400" 
                          : "bg-white text-slate-400 border-slate-100"
                      }`}
                    >
                      {isLayoutLocked ? <Lock className="w-6 h-6" /> : <LockOpen className="w-6 h-6 opacity-40" />}
                      <span>{isLayoutLocked ? "ロック解除" : "ロックする"}</span>
                    </button>

                    <button onClick={handleSave} disabled={saveStatus === "saving" || !period.trim()} className="flex-[1.5] py-6 rounded-[2rem] font-black text-xl text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                      style={{ backgroundColor: saveStatus === "saved" ? "#10b981" : COLORS.deepPurple }}>
                      {saveStatus === "saving" ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
                      <span>{saveStatus === "saved" ? "保存済み" : "配置を保存"}</span>
                    </button>
                  </div>
                 <div className="grid grid-cols-3 gap-3">
                    <ExportCircle icon={<FileImage />} onClick={handleExportPng} active={exporting === "png"} />
                    <ExportCircle icon={<FileText />} onClick={handleExportPdf} active={exporting === "pdf"} />
                    <ExportCircle icon={<FileSpreadsheet />} onClick={handleExportXlsx} active={exporting === "xlsx"} />
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectionMode === "items" && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-[200] bg-cream flex flex-col">
            <WizardHeader title="配置を選ぶ" onBack={() => setSelectionMode("shelf-type")} />
            <div className="px-6 py-4 space-y-3">
               <div className="relative">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                 <input type="text" placeholder="名前で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                   className="w-full h-16 bg-white rounded-[1.5rem] pl-14 pr-6 font-black outline-none shadow-sm focus:ring-4 ring-coral/10" style={{ color: COLORS.deepPurple }} />
               </div>
               <div className="relative">
                 <SortAsc className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-20" />
                 <select 
                   value={sortOrder} 
                   onChange={e => setSortOrder(e.target.value as any)}
                   className="w-full h-12 bg-white rounded-xl pl-14 pr-6 font-black outline-none shadow-sm appearance-none" 
                   style={{ color: COLORS.deepPurple }}
                 >
                   <option value="newest">新着順</option>
                   <option value="name_asc">名前順 (昇順)</option>
                   <option value="name_desc">名前順 (降順)</option>
                 </select>
                 <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 pointer-events-none" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 no-scrollbar">
               {(() => {
                 let result = items.filter(it => {
                    if (activeShelfIdx === 3) return it.category === "poster";
                    const allowed = currentShelf?.layout_type === "booklet" ? ["booklet", "magazine"]
                      : currentShelf?.layout_type === "booklet_doc" ? ["booklet_doc"]
                      : (currentShelf?.layout_type === "document" || currentShelf?.layout_type === "bible") ? ["document", "bible"]
                      : ["pamphlet", "invitation"];
                    return allowed.includes(it.category) && it.name.toLowerCase().includes(searchQuery.toLowerCase());
                 });

                 if (sortOrder === "name_asc") {
                   result.sort((a, b) => a.name.localeCompare(b.name, "ja"));
                 } else if (sortOrder === "name_desc") {
                   result.sort((a, b) => b.name.localeCompare(a.name, "ja"));
                 }

                 return result.map(it => (
                    <button key={it.id} onClick={() => { (activeCart === "A" ? setCartA : setCartB)((prev: CartLayoutV2): CartLayoutV2 => { if (activeShelfIdx === 3) return { ...prev, poster: it.id!, posterType: it.poster_type || prev.posterType }; return { ...prev, shelves: prev.shelves.map((s, i) => i === activeShelfIdx ? { ...s, items: s.items.map((id, j) => j === activeSlotIdx ? it.id! : id) } : s) }; }); setSelectionMode("shelf-type"); }}
                      className="w-full flex items-center gap-5 p-4 rounded-[2rem] bg-white hover:shadow-lg transition-all active:scale-[0.98] text-left">
                      <img src={it.url} className="w-16 h-16 object-contain rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: COLORS.deepPurple }}>{it.name}</p>
                        <div className="flex gap-2 mt-1">
                          <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{GALLERY_FILTER_LABELS[it.category as GalleryFilterType] || it.category}</p>
                          <span className={`text-[9px] font-black rounded px-1 py-0.5 tracking-tighter ${
                            it.language === "ja" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            it.language === "en" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {LANG_FILTER_OPTIONS.find(o => o.key === it.language)?.label || it.language}
                          </span>
                          {it.category === "poster" && it.poster_type && (
                            <span className={`text-[9px] font-black rounded px-1 py-0.5 tracking-tighter border ${
                              it.poster_type === "マグポス" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                              it.poster_type === "コルトン" ? "bg-rose-50 text-rose-700 border-rose-100" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {it.poster_type}
                            </span>
                          )}
                        </div>
                      </div>

                    </button>
                 ));
               })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuCard({ icon, title, desc, color, onClick, wide, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex flex-col items-center justify-center p-6 rounded-[2.5rem] transition-all active:scale-95 shadow-xl shadow-black/5 ${wide ? "w-full text-center flex-row gap-6 p-5" : "aspect-square"} ${disabled ? "opacity-40 grayscale cursor-not-allowed" : ""}`} style={{ backgroundColor: color }}>
       <div className={`${wide ? "w-14 h-14" : "w-16 h-16"} rounded-[1.5rem] bg-cream flex items-center justify-center ${wide ? "" : "mb-4"} shadow-inner shrink-0`}><div style={{ color: COLORS.coral }}>{React.cloneElement(icon as React.ReactElement, { className: wide ? "w-6 h-6" : "w-8 h-8" } as any)}</div></div>
       <div className={wide ? "text-left" : ""}><p className={`${wide ? "text-base" : "text-lg"} font-black tracking-tight`} style={{ color: COLORS.deepPurple }}>{title}</p>{desc && <p className="text-[9px] font-bold opacity-30 tracking-widest uppercase mt-1 line-clamp-1">{desc}</p>}</div>
    </button>
  );
}
function SectionLabel({ label }: { label: string }) { return <h3 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 ml-2" style={{ color: COLORS.deepPurple }}>{label}</h3>; }
function LocationBtn({ label, active, onClick }: any) { return <button onClick={onClick} className={`p-5 rounded-[1.5rem] font-black text-sm transition-all border-4 ${active ? "shadow-lg scale-105" : "bg-white border-transparent opacity-60"}`} style={{ backgroundColor: active ? COLORS.peach : COLORS.white, borderColor: active ? COLORS.coral : "transparent", color: COLORS.deepPurple }}>{label}</button>; }
function TagOptionBtn({ label, color, active, onClick }: any) { return <button onClick={onClick} className={`flex-1 py-4 px-2 rounded-2xl border-4 font-black text-[10px] uppercase transition-all ${active ? "shadow-md" : "bg-cream/40 border-transparent opacity-40"}`} style={{ backgroundColor: active ? (color || COLORS.peach) : "transparent", borderColor: active ? (color || COLORS.coral) : "transparent", color: active ? COLORS.white : COLORS.deepPurple }}>{label}</button>; }
function TagSelect({ value, onChange, placeholder }: any) { return <div className="relative"><select value={value} onChange={e => onChange(e.target.value)} className="w-full h-12 bg-cream/40 rounded-xl px-4 text-[11px] font-black outline-none appearance-none" style={{ color: COLORS.deepPurple }}><option value="">{placeholder || "選択..."}</option>{LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}</select><ChevronDown className="absolute right-3 top-4 w-3 h-3 opacity-20 pointer-events-none" /></div>; }
function ExportCircle({ icon, active, onClick }: any) { return <button onClick={onClick} disabled={active} className={`flex-1 aspect-square rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${active ? "bg-slate-100 opacity-50" : "bg-white"}`}>{active ? <div className="w-6 h-6 border-4 border-slate-200 border-t-coral rounded-full animate-spin" /> : <div style={{ color: COLORS.coral }}>{React.cloneElement(icon, { className: "w-8 h-8" })}</div>}</button>; }
function WizardHeader({ title, onBack }: any) { return <div className="shrink-0 pt-16 pb-8 px-8 flex items-center gap-6 bg-white z-[150] rounded-b-[3rem] shadow-sm"><button onClick={onBack} className="w-14 h-14 flex items-center justify-center bg-cream rounded-[1.5rem] active:scale-90 transition-all shadow-inner"><ChevronLeft className="w-7 h-7" style={{ color: COLORS.deepPurple }} /></button><h2 className="text-xl font-black tracking-tight" style={{ color: COLORS.deepPurple }}>{title}</h2></div>; }
function EmptyState({ icon, text, sub }: any) { return <div className="flex flex-col items-center justify-center py-20 opacity-30">{React.cloneElement(icon, { className: "w-16 h-16 mb-4" })}<p className="font-black text-sm">{text}</p>{sub && <p className="text-[10px] font-bold mt-1">{sub}</p>}</div>; }

function DeleteLayoutRow({ period, displayName, onConfirm, isLocked }: { period: string; displayName: string; onConfirm: () => void; isLocked: boolean }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="w-full rounded-[2rem] overflow-hidden shadow-lg shadow-black/5">
      {confirming ? ( 
        <div className="bg-red-50 p-6 space-y-4">
          <p className="font-black text-sm text-red-700">「{displayName}」を削除しますか？</p>
          <div className="flex gap-3">
            <button onClick={onConfirm} className="flex-1 py-4 bg-red-600 text-white font-black text-sm rounded-2xl active:scale-95">削除</button>
            <button onClick={() => setConfirming(false)} className="flex-1 py-4 bg-white border border-red-100 text-red-400 font-black text-sm rounded-2xl">キャンセル</button>
          </div>
        </div>
      ) : ( 
        <button 
          onClick={() => { if (!isLocked) setConfirming(true); }} 
          disabled={isLocked}
          className={`w-full flex items-center justify-between p-6 bg-white text-left active:scale-[0.98] transition-all ${isLocked ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
        >
          <div>
            <div className="flex items-center gap-2">
              <p className="font-black text-base" style={{ color: COLORS.deepPurple }}>{displayName}</p>
              {isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            <p className="text-[10px] text-red-400 font-black uppercase mt-1 tracking-widest">{isLocked ? "ロック中のため削除不可" : "Tap to delete"}</p>
          </div>
          <Trash2 className="w-6 h-6 text-red-200" />
        </button> 
      )}
    </div>
  );
}
