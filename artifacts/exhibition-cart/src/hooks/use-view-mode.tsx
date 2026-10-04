"use client";

import { useState, useEffect, useCallback } from "react";

export type ViewMode = "pc" | "mobile";

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      if (window.location.port === "5000") return "mobile";
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "mobile") return "mobile";
    }
    return "pc";
  });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Check if running on port 5000 (explicitly requested to open mobile view on port 5000)
    const isPort5000 = typeof window !== "undefined" && window.location.port === "5000";
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const viewParam = urlParams?.get("view");

    // Check if user agent is a mobile/tablet device
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isMobileDevice = /iphone|ipad|ipod|android|blackberry|mini|windows\sphone|iemobile|mobile/i.test(ua);

    if (isPort5000 || viewParam === "mobile" || isMobileDevice) {
      setViewMode("mobile");
      localStorage.setItem("smpwo-view-mode", "mobile");
    } else {
      const savedMode = localStorage.getItem("smpwo-view-mode") as ViewMode | null;
      if (savedMode === "mobile") {
        setViewMode("mobile");
      } else {
        setViewMode("pc");
        localStorage.setItem("smpwo-view-mode", "pc");
      }
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
    hasMounted
  };
}
