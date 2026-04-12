"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { detectCategoryAndLanguage } from "@/lib/supabase";
import { useUploadItem } from "@/hooks/use-items";
import { 
  UploadCloud, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileImage,
  Tag,
  Pencil
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface StagedFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  category: string;
  language: string;
  posterType: string;
  status: UploadStatus;
  errorMessage?: string;
}

interface UploadSlidePanelProps {
  onClose: () => void;
}

export function UploadSlidePanel({ onClose }: UploadSlidePanelProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const uploadMutation = useUploadItem();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const { category, language } = detectCategoryAndLanguage(file.name);
      return {
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file),
        name: file.name.split('.').slice(0, -1).join('.'),
        category,
        language,
        posterType: category === "poster" ? "マグポス" : "",
        status: "idle" as UploadStatus,
      };
    });
    setStagedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
  });

  const removeFile = (id: string) => {
    setStagedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFileMeta = (id: string, field: keyof StagedFile, value: string) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleUploadAll = async () => {
    const pendingFiles = stagedFiles.filter((f) => f.status === "idle" || f.status === "error");
    if (pendingFiles.length === 0) return;

    setIsUploadingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of pendingFiles) {
      setStagedFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading" } : f))
      );

      try {
        await uploadMutation.mutateAsync({
          file: item.file,
          category: item.category,
          language: item.language,
          customName: item.name,
          poster_type: item.category === "poster" ? item.posterType : undefined,
        });

        setStagedFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "success" } : f))
        );
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "不明なエラーが発生しました";
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: "error", errorMessage }
              : f
          )
        );
        errorCount++;
      }
    }

    setIsUploadingAll(false);

    toast({
      title: "アップロード完了",
      description: `${successCount}件成功${errorCount > 0 ? `、${errorCount}件失敗` : ''}しました。`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const clearCompleted = () => {
    setStagedFiles((prev) => {
      const remaining = prev.filter((f) => f.status !== "success");
      prev.filter((f) => f.status === "success").forEach((f) => URL.revokeObjectURL(f.preview));
      return remaining;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
      />

      {/* Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden pointer-events-auto border-x border-t border-slate-200"
      >
        {/* Handle for visual/mobile */}
        <div className="shrink-0 flex justify-center p-3">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-primary" /> 画像のアップロード
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">新しいアイテムをライブラリに追加します</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
              
              {/* Dropzone Column */}
              <div className="md:col-span-2 space-y-4">
                {/* Upload Zone */}
                <div
                  {...getRootProps()}
                  className={`
                    relative overflow-hidden group flex flex-col items-center justify-center w-full h-[320px] rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer bg-white
                    ${isDragActive ? "border-primary bg-primary/5 scale-[1.02] shadow-xl" : "border-slate-300 hover:border-primary/50 hover:bg-slate-50 shadow-sm hover:shadow-md"}
                  `}
                >
                  <input {...getInputProps()} />
                  <div className={`p-4 rounded-full transition-colors duration-300 ${isDragActive ? "bg-primary/20 text-primary" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"}`}>
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-700 text-center">画像をドロップ</h3>
                  <p className="mt-2 text-sm text-slate-500 text-center px-6">
                    またはクリックして選択<br/>
                    <span className="text-xs opacity-70 mt-2 block">(JPG, PNG, WEBP, GIF)</span>
                  </p>
                </div>
              </div>

              {/* Staged Files Column */}
              <div className="md:col-span-3">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-slate-400" />
                      <h2 className="font-semibold text-slate-700">追加待ち ({stagedFiles.length}件)</h2>
                    </div>
                    
                    {stagedFiles.length > 0 && (
                      <button
                        onClick={clearCompleted}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        完了項目をクリア
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <AnimatePresence initial={false}>
                      {stagedFiles.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="h-full flex flex-col items-center justify-center text-slate-400 py-12"
                        >
                          <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-sm font-medium">ファイルが選択されていません</p>
                        </motion.div>
                      )}

                      {stagedFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`flex gap-3 p-3 rounded-2xl border transition-all ${
                            file.status === "success" 
                              ? "bg-emerald-50/50 border-emerald-200" 
                              : file.status === "error"
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-slate-200 hover:border-primary/40 shadow-xs"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                            <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                            {file.status === "uploading" && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                              </div>
                            )}
                            {file.status === "success" && (
                              <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[2px]">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 drop-shadow" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div className="flex justify-between items-center gap-2 group/name relative">
                              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                                <Pencil className="w-3 h-3 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  value={file.name}
                                  onChange={(e) => updateFileMeta(file.id, "name", e.target.value)}
                                  disabled={file.status !== "idle" && file.status !== "error"}
                                  className="font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full truncate transition-colors"
                                  placeholder="名前を入力..."
                                />
                              </div>
                              {file.status === "idle" && (
                                <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500 p-1 rounded-md shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-1">
                              <select
                                value={file.category}
                                onChange={(e) => updateFileMeta(file.id, "category", e.target.value)}
                                disabled={file.status !== "idle" && file.status !== "error"}
                                className="text-[10px] bg-slate-100 border-none rounded-md px-1.5 py-1 text-slate-700 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                              >
                                <option value="poster">ポスター</option>
                                <option value="booklet">冊子</option>
                                <option value="magazine">雑誌</option>
                                <option value="booklet_doc">冊子サイズ書籍</option>
                                <option value="document">文庫本サイズ書籍</option>
                                <option value="pamphlet">パンフレット</option>
                                <option value="invitation">招待状</option>
                              </select>

                              <select
                                value={file.language}
                                onChange={(e) => updateFileMeta(file.id, "language", e.target.value)}
                                disabled={file.status !== "idle" && file.status !== "error"}
                                className="text-[10px] bg-slate-100 border-none rounded-md px-1.5 py-1 text-slate-700 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                              >
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

                              {file.category === "poster" && (
                                <select
                                  value={file.posterType}
                                  onChange={(e) => updateFileMeta(file.id, "posterType", e.target.value)}
                                  disabled={file.status !== "idle" && file.status !== "error"}
                                  className="text-[10px] bg-amber-50 border border-amber-200 rounded-md px-1.5 py-1 text-amber-800 font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                  <option value="マグポス">マグポス</option>
                                  <option value="コルトン">コルトン</option>
                                  <option value="その他">その他</option>
                                </select>
                              )}
                            </div>

                            {file.status === "error" && (
                              <p className="text-[9px] text-red-600 mt-1 flex items-center gap-1 font-bold">
                                <AlertCircle className="w-2.5 h-2.5" /> {file.errorMessage}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-6 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {stagedFiles.filter(f => f.status === 'success').length} / {stagedFiles.length} 件完了
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              閉じる
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploadingAll || stagedFiles.length === 0 || stagedFiles.every(f => f.status === 'success')}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98]"
            >
              {isUploadingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> アップロード中...</>
              ) : (
                <><UploadCloud className="w-5 h-5" /> 一括アップロードを開始</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
