import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-primary/10 text-primary border-transparent",
    secondary: "bg-slate-100 text-slate-700 border-transparent",
    outline: "border-slate-200 text-slate-600",
    success: "bg-emerald-50 text-emerald-700 border-transparent",
    warning: "bg-amber-50 text-amber-700 border-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
