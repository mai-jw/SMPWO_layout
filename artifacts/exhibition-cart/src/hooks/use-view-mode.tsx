"use client";

import { useState, useEffect, useCallback } from "react";

export type ViewMode = "pc" | "mobile";

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("pc");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Check if the user agent matches common mobile/tablet devices
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sphone|iemobile|mobile/i.test(ua);

    if (isMobileDevice) {
      setViewMode("mobile");
      localStorage.setItem("smpwo-view-mode", "mobile");
    } else {
      setViewMode("pc");
      localStorage.setItem("smpwo-view-mode", "pc");
    }

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
