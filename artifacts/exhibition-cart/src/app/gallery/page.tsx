"use client";

import { useState, useMemo } from "react";
import { useItems, useDeleteItem } from "@/hooks/use-items";
import type { Item } from "@/lib/supabase";
import { Badge } from "@/components/ui/ui-badge";
import { Search, Loader2, Image as ImageIcon, Trash2, Filter, AlertCircle, Pencil, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ItemsListPage() {
  const { data: items = [], isLoading, error } = useItems();
  const deleteMutation = useDeleteItem();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesLanguage = filterLanguage === "all" || item.language === filterLanguage;
      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [items, searchQuery, filterCategory, filterLanguage]);

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

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      ja: "日本語", foreign: "外国語", en: "英語",
      zh_hans: "中国語（簡体字）", zh_hant: "中国語（繁体字）",
      ko: "韓国語", vi: "ベトナム語", tl: "タガログ語",
      th: "タイ語", id: "インドネシア語", es: "スペイン語"
    };
    return labels[lang] || lang;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      poster: "ポスター", booklet: "冊子", magazine: "雑誌",
      booklet_doc: "冊子サイズ書籍", document: "文庫本サイズ書籍",
      pamphlet: "パンフレット", invitation: "招待状"
    };
    return labels[cat] || cat;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">ギャラリー</h1>
            <p className="mt-2 text-slate-500">
              展示されているすべての画像アイテムを閲覧・検索できます。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="アイテム名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm text-slate-700"
                >
                  <option value="all">全カテゴリ</option>
                  <option value="poster">ポスター</option>
                  <option value="booklet">冊子</option>
                  <option value="magazine">雑誌</option>
                  <option value="booklet_doc">冊子サイズ書籍</option>
                  <option value="document">文庫本サイズ書籍</option>
                  <option value="pamphlet">パンフレット</option>
                  <option value="invitation">招待状</option>
                </select>
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="appearance-none pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm text-slate-700"
                >
                  <option value="all">全言語</option>
                  <option value="ja">日本語</option>
                  <option value="foreign">外国語</option>
                  <option value="en">英語</option>
                  <option value="zh_hans">中国語（簡体字）</option>
                  <option value="zh_hant">中国語（繁体字）</option>
                  <option value="ko">韓国語</option>
                  <option value="vi">ベトナム語</option>
                  <option value="tl">タガログ語</option>
                  <option value="th">タイ語</option>
                  <option value="id">インドネシア語</option>
                  <option value="es">スペイン語</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <AlertCircle className="w-12 h-12 mb-4 opacity-80" />
            <h3 className="text-lg font-bold">データの取得に失敗しました</h3>
            <p className="mt-2 text-sm opacity-80 text-center max-w-md">
              {error instanceof Error ? error.message : "不明なエラーが発生しました"}
            </p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col bg-white rounded-2xl p-3 shadow-sm border border-slate-100 animate-pulse">
                <div className="w-full aspect-square bg-slate-100 rounded-xl mb-4"></div>
                <div className="h-5 bg-slate-100 rounded-md w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-slate-100 shadow-sm border-dashed">
            <h3 className="text-xl font-bold text-slate-800">アイテムが見つかりません</h3>
            <p className="mt-2 text-slate-500 max-w-md">
              条件に一致する画像がありません。アップロード画面から新しいアイテムを追加してください。
            </p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          >
            <AnimatePresence>
              {filteredItems.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  key={item.id}
                  className="group relative bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 transition-all duration-300 flex flex-col"
                >
                  <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-4">
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    {editingId === item.id ? (
                      <div className="absolute top-2 right-2 flex gap-2">
                        {deleteConfirmId === item.id ? (
                          <>
                            <div className="absolute -top-1 -right-1 bg-white/95 backdrop-blur rounded-lg p-2 shadow-lg border border-red-200 flex flex-col items-end whitespace-nowrap min-w-[200px] z-50">
                              <p className="text-xs font-bold text-red-600 mb-2 px-1">本当に削除しますか？</p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => executeDelete(item)}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition flex items-center gap-1"
                                >
                                  はい、削除
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200 transition"
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setDeleteConfirmId(item.id!)}
                              className="p-2 bg-white/95 backdrop-blur text-destructive hover:text-white hover:bg-destructive rounded-lg shadow-sm transition-all duration-200"
                              title="削除を実行"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-white/95 backdrop-blur text-slate-500 hover:text-slate-800 rounded-lg shadow-sm transition-all duration-200"
                              title="キャンセル"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(item.id!)}
                        className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                        title="編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 flex flex-col px-1">
                    <h3 className="font-bold text-slate-900 leading-tight line-clamp-1 group-hover:text-primary transition-colors" title={item.name}>
                      {item.name}
                    </h3>
                    {item.created_at && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {format(new Date(item.created_at), 'yyyy年MM月dd日', { locale: ja })}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-auto pt-4">
                      <Badge variant={item.category === "poster" ? "default" : "secondary"}>
                        {getCategoryLabel(item.category)}
                      </Badge>
                      <Badge variant={item.language === "ja" ? "success" : item.language === "en" ? "warning" : "outline"}>
                        {getLanguageLabel(item.language)}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
