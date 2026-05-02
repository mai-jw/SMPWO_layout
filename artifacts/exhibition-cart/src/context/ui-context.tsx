"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface UIContextType {
  isUploadPanelOpen: boolean;
  openUploadPanel: () => void;
  closeUploadPanel: () => void;
  isLayoutLocked: boolean;
  toggleLayoutLock: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);

  const openUploadPanel = () => setIsUploadPanelOpen(true);
  const closeUploadPanel = () => setIsUploadPanelOpen(false);
  const toggleLayoutLock = () => setIsLayoutLocked((prev) => !prev);

  return (
    <UIContext.Provider
      value={{
        isUploadPanelOpen,
        openUploadPanel,
        closeUploadPanel,
        isLayoutLocked,
        toggleLayoutLock,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
