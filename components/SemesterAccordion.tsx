"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SemesterAccordion({
  title,
  count,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <span className="font-semibold text-slate-700">{title}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {count} {count === 1 ? "usuário" : "usuários"}
        </span>
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}
