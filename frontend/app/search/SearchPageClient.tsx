"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ArrowLeft, RefreshCw } from "lucide-react";
import ResultCard from "@/components/ResultCard";
import AIPanel from "@/components/AIPanel";
import VTChart from "@/components/VTChart";
import { getApiUrl } from "@/lib/api";

interface IntegrationResult {
  source: string;
  success: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

interface SearchResponse {
  query: string;
  query_type: string;
  cached: boolean;
  results: IntegrationResult[];
  ai_summary: string | null;
}

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [query, setQuery] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("Search service is not configured.");
      }
      const res = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (q) doSearch(q);
  }, [q]); // doSearch is defined inline; re-creating it on every render is safe here

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const vtResult = data?.results.find((r) => r.source === "virustotal");

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <button type="button" onClick={() => router.push("/")} className="p-2 hover:bg-slate-700 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>
        <button type="submit" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition">
          Search
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-400 py-8 justify-center">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Running parallel intelligence gathering…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="px-2 py-0.5 bg-brand-900/40 text-brand-400 rounded-md font-mono text-xs">
              {data.query_type}
            </span>
            <span className="font-mono text-slate-300">{data.query}</span>
            {data.cached && (
              <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded-md text-xs">cached</span>
            )}
            <span className="ml-auto">{data.results.length} sources</span>
          </div>

          {/* AI Summary */}
          {data.ai_summary && <AIPanel summary={data.ai_summary} />}

          {/* VirusTotal chart */}
          {vtResult?.success && vtResult.data && (
            <VTChart data={vtResult.data as Record<string, number>} />
          )}

          {/* Source cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {data.results.map((r) => (
              <ResultCard key={r.source} result={r} />
            ))}
          </div>

          {data.results.length === 0 && (
            <p className="text-slate-400 text-center py-8">
              No integrations available for this query type. Configure API keys in your <code>.env</code>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
