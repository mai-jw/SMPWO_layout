import { useState, useMemo } from "react";
import { useItems, useDeleteItem } from "@/hooks/use-items";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Badge";
import { Search, Loader2, Image as ImageIcon, Trash2, Filter, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ItemsList() {
  const { data: items = [], isLoading, error } = useItems();
  const deleteMutation = useDeleteItem();
  
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

  const handleDelete = async (item: any) => {
    if (confirm(`「${item.name}」を削除してもよろしいですか？`)) {
      await deleteMutation.mutateAsync(item);
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "ja": return "日本語";
      case "en": return "English";
      default: return "その他";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "poster": return "ポスター";
      case "general": return "一般";
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
                  <option value="general">一般</option>
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
                  <option value="en">English</option>
                  <option value="other">その他</option>
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
            <img 
              src={`${import.meta.env.BASE_URL}images/empty-gallery.png`} 
              alt="Empty Gallery" 
              className="w-64 max-w-full opacity-80 mb-6 drop-shadow-xl"
            />
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
                    
                    <button
                      onClick={() => handleDelete(item)}
                      className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur text-destructive hover:text-white hover:bg-destructive rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
