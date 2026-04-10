import type { Metadata } from "next";
import { Noto_Sans_JP, Outfit, M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const rounded = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-rounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "展示カート作成ツール",
  description: "展示カートのレイアウトを編集・管理するツール",
};

import { UIProvider, useUI } from "@/context/ui-context";
import { UploadSlidePanel } from "@/components/UploadSlidePanel";
import { AnimatePresence } from "framer-motion";

function GlobalUI({ children }: { children: React.ReactNode }) {
  const { isUploadPanelOpen, closeUploadPanel } = useUI();
  
  return (
    <>
      <Navbar />
      {children}
      <AnimatePresence>
        {isUploadPanelOpen && (
          <UploadSlidePanel onClose={closeUploadPanel} />
        )}
      </AnimatePresence>
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} ${outfit.variable} ${rounded.variable} font-sans antialiased bg-background text-foreground flex flex-col min-h-screen`}>
        <Providers>
          <UIProvider>
            <GlobalUI>
              {children}
            </GlobalUI>
          </UIProvider>
        </Providers>
      </body>
    </html>
  );
}
