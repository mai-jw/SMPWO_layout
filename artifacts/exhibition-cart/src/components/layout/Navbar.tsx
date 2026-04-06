"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd, UploadCloud, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "カート編集", icon: ShoppingCart },
    { href: "/gallery", label: "ギャラリー", icon: GalleryVerticalEnd },
    { href: "/upload", label: "アップロード", icon: UploadCloud },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer flex-shrink-0">
          <div className="bg-gradient-to-br from-primary to-indigo-500 text-white p-1.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">
            展示カート<span className="text-primary ml-0.5">作成ツール</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-2 ${
                  isActive
                    ? "text-primary"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute inset-0 rounded-lg bg-primary/10 -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
