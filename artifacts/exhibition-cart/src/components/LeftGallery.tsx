"use client";

import { useState, useMemo } from "react";
import { useUpdateItem, useDeleteItem, useCopyItem } from "@/hooks/use-items";
import type { Item, CartLayoutV2 } from "@/lib/supabase";
import {
  Library, Upload, Search, Languages, ChevronDown,
  SortAsc, X, Pencil, Copy, Trash2, Check,
} from "lucide-react";
import {
  GALLERY_FILTER_LABELS, GALLERY_FILTER_ICONS,
  LANG_FILTER_OPTIONS, EXPLICIT_LANG_KEYS,
} from "@/lib/config";

export type GalleryFilterType = keyof typeof GALLERY_FILTER_LABELS;

export interface LeftGalleryProps {
  items: Item[];
  onOpenUpload: () => void;
  width?: number | string;
  cartA?: CartLayoutV2;
  setCartA?: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  cartB?: CartLayoutV2;
  setCartB?: React.Dispatch<React.SetStateAction<CartLayoutV2>>;
  onClose?: () => void;
}

export function LeftGallery({ items, onOpenUpload, width, onClose }: LeftGalleryProps) {
  const [filter, setFilter] = useState<GalleryFilterType>("all");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "name_asc" | "name_desc">("newest");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLanguage, setEditLanguage] = useState("");

  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();
  const copyMutation = useCopyItem();

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
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id,
        name: editValue,
        short_name: editShortName.trim() || undefined,
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

  return (
    <aside
      className="shrink-0 bg-white border-r border-border flex flex-col h-full overflow-hidden transition-none w-full"
      style={width !== undefined ? { width } : undefined}
    >
      <div className="py-1.5 px-4 bg-[#64748b] flex items-center justify-between shadow-md relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Library className="w-5 h-5 text-white" />
          <div>
            <p className="font-rounded font-black text-sm tracking-widest text-white mt-0.5">LIBRARY</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="p-1.5 bg-[#ffd76d] text-zinc-800 hover:opacity-90 rounded-lg transition-all flex items-center justify-center group shadow-md active:scale-95"
            title="画像をアップロード"
          >
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-border space-y-3 shrink-0 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="名前で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-medium border border-border rounded-lg pl-9 pr-3 py-2 bg-slate-50 text-foreground outline-none focus:border-sky-400 placeholder:text-slate-400 transition-all"
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(GALLERY_FILTER_LABELS) as [GalleryFilterType, string][]).map(([key, label]) => {
            const Icon = GALLERY_FILTER_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key as GalleryFilterType)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all border ${
                  filter === key
                    ? "bg-[#aecbe2] text-slate-800 border-[#9bbad2] shadow-sm"
                    : "bg-white text-slate-500 border-slate-100 hover:border-sky-200 hover:bg-sky-50/30"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${filter === key ? "text-slate-700" : "text-slate-400"}`} />
                {key === "pamphlet" ? (
                  <span className="flex flex-col items-center justify-center gap-0 leading-[1.2] min-h-[2.2em] text-center font-bold tracking-tighter w-full" style={{ fontSize: "7.5px" }}>
                    <span style={{ whiteSpace: "nowrap", display: "block" }}>パンフレット</span>
                    <span style={{ whiteSpace: "nowrap", display: "block" }}>/招待状</span>
                  </span>
                ) : (
                  <span className="text-[8.5px] font-bold leading-[1.1] text-center min-h-[2.2em] flex items-center justify-center whitespace-pre-line tracking-tighter w-full">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Language & Sort Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="w-full text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
            >
              {LANG_FILTER_OPTIONS.filter((opt) => opt.key !== "sign_ja" || filter === "poster").map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.key === "all" ? "すべての言語" : opt.label}</option>
              ))}
            </select>
            <Languages className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none text-slate-600 focus:border-sky-400 transition-all appearance-none cursor-pointer"
            >
              <option value="newest">新着順</option>
              <option value="name_asc">名前 A-Z</option>
              <option value="name_desc">名前 Z-A</option>
            </select>
            <SortAsc className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredItems.length === 0 ? (
          <p className="text-base text-muted-foreground text-center py-8 font-medium">該当するアイテムなし</p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left border border-transparent hover:bg-sky-50 hover:border-sky-100 group transition-all bg-white">
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

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">正式名</label>
                      <input
                        autoFocus
                        className="text-xs font-black text-foreground bg-white border border-sky-400 rounded px-2 py-1.5 w-full outline-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">略称 (出版物のみ)</label>
                      <input
                        placeholder="詳細情報での略称 (任意)"
                        className="text-xs font-bold text-foreground bg-white border border-slate-200 rounded px-2 py-1 w-full outline-none focus:border-sky-400"
                        value={editShortName}
                        onChange={(e) => setEditShortName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

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
                        {LANG_FILTER_OPTIONS.filter((o) => o.key !== "all" && o.key !== "foreign" && (o.key !== "sign_ja" || editCategory === "poster")).map((o) => (
                          <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                        <option value="other">その他外国語</option>
                      </select>
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
                            className="p-1.5 bg-sky-600 text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-sky-700 transition-colors px-4 relative z-20 font-bold text-xs"
                            title="保存"
                          >
                            <Check className="w-4 h-4 mr-1" /> 保存
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-black text-foreground truncate leading-tight mb-1" title={item.name}>{item.name}</p>
                    {item.short_name && (
                      <p className="text-[10px] font-bold text-slate-400 truncate leading-tight mb-1">
                        略称: {item.short_name}
                      </p>
                    )}
                    <div className="absolute right-0 top-0 flex flex-col gap-1.5">
                      <button
                        onClick={(e) => handleStartEdit(e, item)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full opacity-60 group-hover:opacity-100 transition-all"
                        title="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {item.category === "poster" && (
                        <button
                          onClick={(e) => handleCopyItem(e, item)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          title="コピーを作成"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}

                {editingId !== item.id && item.category && (
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black bg-zinc-100 text-zinc-700 rounded px-1.5 py-0.5 uppercase">
                      {GALLERY_FILTER_LABELS[item.category as GalleryFilterType] || item.category}
                    </span>
                    <span className={`text-[10px] font-black rounded px-1.5 py-0.5 tracking-tighter ${
                      item.language === "ja" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      item.language === "en" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      "bg-slate-50 text-slate-600 border border-slate-100"
                    }`}>
                      {LANG_FILTER_OPTIONS.find((o) => o.key === item.language)?.label || item.language}
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
