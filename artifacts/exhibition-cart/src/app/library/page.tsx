"use client";

import { useState, useMemo } from "react";
import { useItems, useUpdateItem, useDeleteItem, useCopyItem } from "@/hooks/use-items";
import { useUI } from "@/context/ui-context";
import type { Item } from "@/lib/supabase";
import {
  Library, Search, Upload, Languages, ChevronDown, Pencil,
  Trash2, X, Check, ArrowLeft, Image as ImageIcon, Home, Copy, SortAsc
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { GALLERY_FILTER_LABELS, GALLERY_FILTER_ICONS, LANG_FILTER_OPTIONS, EXPLICIT_LANG_KEYS } from "@/lib/config";
import type { GalleryFilterType } from "@/app/page";

export default function LibraryPage() {
  const { data: items = [], isLoading } = useItems();
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const copyMutation = useCopyItem();
  const { openUploadPanel } = useUI();

  const [filter, setFilter] = useState<GalleryFilterType>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "name_asc" | "name_desc">("newest");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLanguage, setEditLanguage] = useState("");

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      const matchCat = filter === "all" || item.category === filter;
      const isForeign = !EXPLICIT_LANG_KEYS.includes(item.language) && item.language !== "all";
      const matchLang = langFilter === "all" || (langFilter === "foreign" ? isForeign : item.language === langFilter);
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchLang && matchSearch;
    });

    if (sortOrder === "name_asc") {
      result.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    } else if (sortOrder === "name_desc") {
      result.sort((a, b) => b.name.localeCompare(a.name, "ja"));
    } else {
      // newest is handled by Supabase order by created_at desc
      // but since we might be sorting a filtered list, we ensure it's still sorted if it was somehow lost
    }

    return result;
  }, [items, filter, langFilter, searchQuery, sortOrder]);

  const handleStartEdit = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setEditingId(item.id!);
    setEditValue(item.name);
    setEditShortName(item.short_name || "");
    setEditCategory(item.category);
    setEditLanguage(item.language);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) { setEditingId(null); return; }
    try {
      await updateMutation.mutateAsync({ id, name: editValue, short_name: editShortName, category: editCategory, language: editLanguage });
    } catch (err) {
      console.error("Failed to update item:", err);
    }
    setEditingId(null);
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

  const handleCopyItem = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    if (!confirm(`${item.name} のコピーを作成しますか？`)) return;
    try {
      await copyMutation.mutateAsync(item);
    } catch (err: any) {
      console.error("Failed to copy item:", err);
      alert(`コピーに失敗しました: ${err.message}`);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#fdfaf3] flex flex-col">
        {/* Header */}
        <div className="bg-[#64748b] shadow-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-xs font-bold tracking-widest uppercase">HOME</span>
              </Link>
              <div className="w-px h-5 bg-white/20" />
              <div className="flex items-center gap-2">
                <Library className="w-5 h-5 text-white" />
                <span className="font-black text-base tracking-widest text-white uppercase">LIBRARY</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-white/40 text-[10px] font-bold tracking-widest uppercase">Management Mode</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border-b border-slate-100 shadow-sm sticky top-[52px] z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[160px] max-w-xs w-full sm:w-auto flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="名前で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm font-medium border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 text-slate-800 outline-none focus:border-sky-400 placeholder:text-slate-400 transition-all"
              />
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {(Object.entries(GALLERY_FILTER_LABELS) as [GalleryFilterType, string][]).map(([key, label]) => {
                const Icon = GALLERY_FILTER_ICONS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border text-xs font-bold whitespace-nowrap ${
                      filter === key
                        ? "bg-[#aecbe2] text-slate-800 border-[#9bbad2] shadow-sm"
                        : "bg-white text-slate-500 border-slate-200 hover:border-sky-200 hover:bg-sky-50/30"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${filter === key ? "text-slate-700" : "text-slate-400"}`} />
                    {key === "pamphlet" ? "パンフレット/招待状" : label}
                  </button>
                );
              })}
            </div>
            {/* Language Filter */}
            <div className="relative flex-none">
              <Languages className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={langFilter}
                onChange={(e) => setLangFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
              >
                {LANG_FILTER_OPTIONS.filter(opt => opt.key !== "sign_ja" || filter === "poster").map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.key === "all" ? "すべての言語" : opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort Order */}
            <div className="relative flex-none">
              <SortAsc className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-2 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
              >
                <option value="newest">新着順</option>
                <option value="name_asc">名前順 (昇順)</option>
                <option value="name_desc">名前順 (降順)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            <div className="text-xs text-slate-400 font-bold flex-none ml-auto">
              {filteredItems.length} 件
            </div>
          </div>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop Left Sidebar: HOME & Upload */}
          <aside className="hidden lg:flex w-[72px] bg-[#64748b] border-r border-slate-600/30 flex-col items-center py-8 gap-8 shrink-0 z-20 shadow-[4px_0_12px_rgba(0,0,0,0.1)]">
            <Link 
              href="/" 
              className="group flex flex-col items-center gap-1.5 transition-all"
              title="ホーム（カート編集）"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white group-hover:bg-[#fdfaf3] group-hover:text-slate-800 transition-all shadow-lg group-hover:scale-110">
                <Home className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-white/50 group-hover:text-white uppercase tracking-widest mt-0.5">Home</span>
            </Link>

            <button 
              onClick={openUploadPanel}
              className="group flex flex-col items-center gap-1.5 transition-all"
              title="画像をアップロード"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#ffd76d] flex items-center justify-center text-zinc-800 transition-all shadow-lg group-hover:bg-[#ffeaab] group-hover:scale-110">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-white/50 group-hover:text-white uppercase tracking-widest mt-0.5">Upload</span>
            </button>
          </aside>

          {/* Item Grid */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-hide">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 animate-pulse">
                    <div className="w-full aspect-square bg-slate-100 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold text-lg">該当するアイテムなし</p>
                <p className="text-slate-400 text-sm mt-1">条件を変更するか、画像をアップロードしてください。</p>
                <button
                  onClick={openUploadPanel}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-[#ffd76d] text-zinc-800 rounded-xl font-bold shadow-md hover:opacity-90 transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  アップロード
                </button>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12"
              >
                <AnimatePresence>
                  {filteredItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="group relative bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 hover:border-sky-200 transition-all duration-200 flex flex-col"
                    >
                      {/* Image */}
                      <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3">
                        <img
                          src={item.url}
                          alt={item.name}
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        {editingId !== item.id && (
                          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => handleStartEdit(e, item)}
                              className="p-1.5 bg-white/90 backdrop-blur text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg shadow-sm"
                              title="編集"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {item.category === "poster" && (
                              <button
                                onClick={(e) => handleCopyItem(e, item)}
                                className="p-1.5 bg-white/90 backdrop-blur text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg shadow-sm"
                                title="コピーを作成"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info / Edit form */}
                      {editingId === item.id ? (
                        <div className="space-y-2 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                            className="absolute -top-1 -right-1 p-1 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-full shadow-sm transition-all z-10"
                            title="キャンセル"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <input
                            autoFocus
                            className="text-xs font-bold text-slate-800 bg-white border border-sky-400 rounded-lg px-2 py-1.5 w-full outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="登録名"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id!); if (e.key === "Escape") setEditingId(null); }}
                          />
                          <input
                            className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 w-full outline-none focus:border-sky-400"
                            value={editShortName}
                            onChange={(e) => setEditShortName(e.target.value)}
                            placeholder="略称 (省略可)"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id!); if (e.key === "Escape") setEditingId(null); }}
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="text-[10px] font-bold border border-slate-200 rounded px-1 py-1 bg-white outline-none focus:border-sky-400"
                            >
                              {Object.entries(GALLERY_FILTER_LABELS).filter(([k]) => k !== "all").map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            <select
                              value={editLanguage}
                              onChange={(e) => setEditLanguage(e.target.value)}
                              className="text-[10px] font-bold border border-slate-200 rounded px-1 py-1 bg-white outline-none focus:border-sky-400"
                            >
                              {LANG_FILTER_OPTIONS.filter(o => o.key !== "all" && o.key !== "foreign" && (o.key !== "sign_ja" || editCategory === "poster")).map(o => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                              ))}
                              <option value="other">その他外国語</option>
                            </select>

                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            {deleteConfirmId === item.id ? (
                              <div className="flex gap-1.5 w-full">
                                <button onClick={() => executeDelete(item)} className="flex-1 px-2 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition">はい</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-200 transition">戻る</button>
                              </div>
                            ) : (
                              <>
                                <button onClick={() => setDeleteConfirmId(item.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="削除">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleSaveEdit(item.id!)} className="flex-1 py-1.5 bg-sky-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-sky-700 transition-colors shadow-sm">
                                  <Check className="w-3.5 h-3.5" /> 保存
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate leading-tight mb-0.5" title={item.name}>
                            {item.name}
                          </p>
                          {item.short_name && (
                            <p className="text-[10px] text-slate-500 font-medium truncate mb-1" title={`略称: ${item.short_name}`}>
                              略称: {item.short_name}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-auto">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 uppercase truncate">
                              {GALLERY_FILTER_LABELS[item.category as GalleryFilterType] || item.category}
                            </span>
                            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 tracking-tighter ${
                              item.language === "ja" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                              item.language === "en" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              "bg-slate-50 text-slate-600 border border-slate-100"
                            }`}>
                              {LANG_FILTER_OPTIONS.find(o => o.key === item.language)?.label || item.language}
                            </span>

                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
