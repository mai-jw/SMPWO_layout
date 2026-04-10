"use client";

import React from "react";
import { useUI } from "@/context/ui-context";
import { UploadSlidePanel } from "@/components/UploadSlidePanel";
import { AnimatePresence } from "framer-motion";
export function GlobalUI({ children }: { children: React.ReactNode }) {
  const { isUploadPanelOpen, closeUploadPanel } = useUI();
  
  return (
    <>
      {children}
      <AnimatePresence>
        {isUploadPanelOpen && (
          <UploadSlidePanel onClose={closeUploadPanel} />
        )}
      </AnimatePresence>
    </>
  );
}
