"use client";

import { Sparkles } from "lucide-react";

export default function AIPanel({ summary }: { summary: string }) {
  return (
    <div className="space-y-2 border border-green-900/70 bg-green-950/20 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-green-400">
        <Sparkles className="w-4 h-4" />
        AI intelligence synthesis
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-green-200/80">{summary}</p>
    </div>
  );
}
