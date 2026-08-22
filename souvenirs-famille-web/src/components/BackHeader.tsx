"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel?: string;
  action?: React.ReactNode;
}

export function BackHeader({ title, subtitle, backHref, backLabel = "Retour", action }: BackHeaderProps) {
  return (
    <div className="bg-brand px-4 sm:px-8 py-5 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-white/90 text-sm font-medium -ml-2 py-1.5 pl-2 pr-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
          {action}
        </div>
        <h1 className="text-xl font-semibold text-white mt-2">{title}</h1>
        {subtitle && <p className="text-sm text-white/80 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}