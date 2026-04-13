"use client";

import { useState, useEffect, useCallback } from "react";

export type ViewMode = "pc" | "mobile";

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("pc");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Initial detection on mount
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      
      // Check saved preference first
      const saved = localStorage.getItem("smpwo-view-mode") as ViewMode | null;
      if (saved && (saved === "pc" || saved === "mobile")) {
        return saved;
      }
      
      return isMobileDevice ? "mobile" : "pc";
    };

    setViewMode(detectDevice());
    setHasMounted(true);
  }, []);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("smpwo-view-mode", mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    const nextMode = viewMode === "pc" ? "mobile" : "pc";
    changeViewMode(nextMode);
  }, [viewMode, changeViewMode]);

  return {
    viewMode,
    isMobileView: viewMode === "mobile",
    setViewMode: changeViewMode,
    toggleViewMode,
    hasMounted // Useful to avoid hydration mismatch if needed
  };
}
