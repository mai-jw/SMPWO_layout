"use client";

import { useState, useEffect, useCallback } from "react";

export type ViewMode = "pc" | "mobile";

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("pc");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setViewMode("pc"); // Force PC view as requested

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
