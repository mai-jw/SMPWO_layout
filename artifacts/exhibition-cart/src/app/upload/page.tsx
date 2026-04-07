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
  Tag
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
  status: UploadStatus;
  errorMessage?: string;
}

export default function UploadAdminPage() {
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
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[50vh] z-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-background"></div>
      </div>

      <div className="relative z-10">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">アップロード管理</h1>
            <p className="mt-3 text-slate-500 max-w-2xl">
              新しい展示画像をシステムに追加します。ファイル名に <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">_poster</code> や <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">_jp</code> を含めると自動的にカテゴリ・言語が設定されます。
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
              <div
                {...getRootProps()}
                className={`
                  relative overflow-hidden group flex flex-col items-center justify-center w-full h-[320px] rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer bg-white/50 backdrop-blur
                  ${isDragActive ? "border-primary bg-primary/5 scale-[1.02] shadow-xl" : "border-slate-300 hover:border-primary/50 hover:bg-slate-50 shadow-sm hover:shadow-md"}
                `}
              >
                <input {...getInputProps()} />
                <div className={`p-4 rounded-full transition-colors duration-300 ${isDragActive ? "bg-primary/20 text-primary" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"}`}>
                  <UploadCloud className="w-10 h-10" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-700">画像をドロップ</h3>
                <p className="mt-2 text-sm text-slate-500 text-center px-6">
                  またはクリックしてファイルを選択<br/>
                  <span className="text-xs opacity-70 mt-2 block">(JPG, PNG, WEBP, GIF)</span>
                </p>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-slate-400" />
                    <h2 className="font-semibold text-slate-700">アップロード待ち ({stagedFiles.length}件)</h2>
                  </div>
                  
                  {stagedFiles.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={clearCompleted}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        完了項目をクリア
                      </button>
                      <button
                        onClick={handleUploadAll}
                        disabled={isUploadingAll || stagedFiles.every(f => f.status === 'success')}
                        className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      >
                        {isUploadingAll ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> 実行中...</>
                        ) : (
                          <><UploadCloud className="w-4 h-4" /> 一括アップロード</>
                        )}
                      </button>
                    </div>
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
                        <p>ファイルが選択されていません</p>
                      </motion.div>
                    )}

                    {stagedFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                          file.status === "success" 
                            ? "bg-emerald-50/50 border-emerald-100" 
                            : file.status === "error"
                              ? "bg-destructive/5 border-destructive/20"
                              : "bg-white border-slate-200 hover:border-primary/30 shadow-sm"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                          <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                          {file.status === "uploading" && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                              <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                          )}
                          {file.status === "success" && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-[2px]">
                              <CheckCircle2 className="w-8 h-8 text-emerald-600 drop-shadow" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-2">
                            <input
                              type="text"
                              value={file.name}
                              onChange={(e) => updateFileMeta(file.id, "name", e.target.value)}
                              disabled={file.status !== "idle" && file.status !== "error"}
                              className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none w-full truncate transition-colors px-1 -ml-1"
                              placeholder="アイテム名"
                            />
                            {file.status === "idle" && (
                              <button
                                onClick={() => removeFile(file.id)}
                                className="text-slate-400 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3 mt-3">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={file.category}
                                onChange={(e) => updateFileMeta(file.id, "category", e.target.value)}
                                disabled={file.status !== "idle" && file.status !== "error"}
                                className="text-sm bg-slate-100 border-none rounded-md px-2 py-1 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-70 outline-none"
                              >
                                <option value="general">一般 (General)</option>
                                <option value="poster">ポスター (Poster)</option>
                                <option value="booklet">冊子類 (Booklet)</option>
                                <option value="booklet_doc">冊子サイズ書籍</option>
                                <option value="document">書籍 (Document)</option>
                                <option value="pamphlet">パンフレット (Pamphlet)</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-400 px-1">Aあ</span>
                              <select
                                value={file.language}
                                onChange={(e) => updateFileMeta(file.id, "language", e.target.value)}
                                disabled={file.status !== "idle" && file.status !== "error"}
                                className="text-sm bg-slate-100 border-none rounded-md px-2 py-1 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 disabled:opacity-70 outline-none"
                              >
                                <option value="ja">日本語 (JA)</option>
                                <option value="en">English (EN)</option>
                                <option value="other">その他 (Other)</option>
                              </select>
                            </div>
                          </div>

                          {file.status === "error" && (
                            <p className="text-xs text-destructive mt-2 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {file.errorMessage}
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
        </main>
      </div>
    </div>
  );
}
