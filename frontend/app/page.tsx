"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { Node, Edge } from "reactflow";
import ResultCard from "@/components/ResultCard";
import AIPanel from "@/components/AIPanel";
import ApiConfigPanel from "@/components/ApiConfigPanel";
import { getApiUrl, getWebSocketUrl } from "@/lib/api";

const GraphView = dynamic(() => import("@/components/GraphView"), { ssr: false });

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
  done: boolean;
}

type WsEvent =
  | { type: "partial"; payload: SearchResponse }
  | { type: "complete"; payload: SearchResponse }
  | { type: "error"; error?: string };

const WS_EVENT_TYPES = new Set(["partial", "complete", "error"]);

const DEFAULT_SEARCH_ERROR = "Search failed. Check the API connection and try again.";

type WsStatus = "connecting" | "connected" | "disconnected" | "error";
type LoadingState = "idle" | "loading" | "done" | "error";
type QueryType = "auto" | "ip" | "domain" | "email" | "phone" | "hash" | "url" | "username";

const QUERY_TYPES: QueryType[] = ["auto", "ip", "domain", "email", "phone", "hash", "url", "username"];

const WS_STATUS_CLASS: Record<WsStatus, string> = {
  connecting: "text-yellow-400",
  connected: "text-green-400",
  disconnected: "text-slate-400",
  error: "text-red-400",
};

function parseWsMessage(payload: unknown): WsEvent | SearchResponse | null {
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload) as WsEvent | SearchResponse;
  } catch {
    return null;
  }
}

function buildGraph(data: SearchResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "root",
    data: { label: `${data.query}\n[${data.query_type}]` },
    position: { x: 0, y: 0 },
    style: {
      background: "#1d4ed8",
      color: "#fff",
      border: "2px solid #3b82f6",
      borderRadius: "8px",
      padding: "10px 16px",
      fontWeight: 600,
    },
  });

  const successful = data.results.filter((r) => r.success);
  const total = successful.length;

  successful.forEach((result, i) => {
    const angle = ((2 * Math.PI) / Math.max(total, 1)) * i - Math.PI / 2;
    const sx = Math.cos(angle) * 220;
    const sy = Math.sin(angle) * 220;

    nodes.push({
      id: `src-${result.source}`,
      data: { label: result.source.toUpperCase() },
      position: { x: sx, y: sy },
      style: {
        background: "#065f46",
        color: "#ecfdf5",
        border: "1px solid #10b981",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: 600,
      },
    });

    edges.push({
      id: `e-root-${result.source}`,
      source: "root",
      target: `src-${result.source}`,
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    });

    if (result.data) {
      Object.entries(result.data)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .slice(0, 3)
        .forEach(([key, value], j) => {
          const nodeId = `data-${result.source}-${key}`;
          const raw = Array.isArray(value)
            ? `[${(value as unknown[]).length} items]`
            : String(value);
          const label = `${key}: ${raw.slice(0, 28)}${raw.length > 28 ? "…" : ""}`;

          nodes.push({
            id: nodeId,
            data: { label },
            position: { x: sx + (j - 1) * 160, y: sy + 130 },
            style: {
              background: "#1e293b",
              color: "#94a3b8",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "11px",
            },
          });

          edges.push({
            id: `e-${result.source}-${key}`,
            source: `src-${result.source}`,
            target: nodeId,
            style: { stroke: "#334155" },
          });
        });
    }
  });

  return { nodes, edges };
}

export default function OmniTraceDashboard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("connecting");
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<QueryType>("auto");
  const [sandboxTarget, setSandboxTarget] = useState("");
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Detect whether a backend URL is available (runs client-side only).
  useEffect(() => {
    setApiConfigured(getApiUrl() !== null);
  }, []);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxAttempts = 5;
    const baseDelay = 1000;

    const connect = () => {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        setWsStatus("disconnected");
        return;
      }

      const wsUrl = getWebSocketUrl(apiUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        reconnectAttempts = 0;
      };
      ws.onmessage = (event) => {
        const message = parseWsMessage(event.data);
        if (!message) return;

        if ("type" in message && typeof message.type === "string" && WS_EVENT_TYPES.has(message.type)) {
          const wsEvent = message as WsEvent;
          if (wsEvent.type === "error") {
            setSearchError(wsEvent.error ?? DEFAULT_SEARCH_ERROR);
            setLoadingState("error");
            return;
          }

          setResults(wsEvent.payload);
          const { nodes, edges } = buildGraph(wsEvent.payload);
          setGraphNodes(nodes);
          setGraphEdges(edges);

          if (wsEvent.type === "complete") {
            setLoadingState("done");
          }

          return;
        }

        // Backward-compatible fallback for older backend payloads.
        const legacy = message as SearchResponse;
        setResults(legacy);
        const { nodes, edges } = buildGraph(legacy);
        setGraphNodes(nodes);
        setGraphEdges(edges);
        if (legacy.done) {
          setLoadingState("done");
        }
      };
      ws.onerror = () => {
        setWsStatus("error");
      };
      ws.onclose = () => {
        setWsStatus("disconnected");
        if (reconnectAttempts < maxAttempts) {
          const delay = baseDelay * Math.pow(2, reconnectAttempts);
          console.log(`Reconnecting in ${delay}ms… (attempt ${reconnectAttempts + 1}/${maxAttempts})`);
          reconnectTimer = setTimeout(connect, delay);
          reconnectAttempts++;
        }
      };
    };

    // Only attempt a connection when a backend URL is (or may be) available.
    // When apiConfigured is explicitly false the panel is showing and there is
    // no URL to connect to, so skip to avoid a redundant connect/disconnect cycle.
    if (apiConfigured === false) {
      setWsStatus("disconnected");
      return;
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [apiConfigured]); // re-run when apiConfigured changes so we connect once a URL is saved

  const handleSearch = async (searchQuery = query, forceType = selectedType) => {
    const q = searchQuery.trim();
    if (!q || loadingState === "loading") return;

    setLoadingState("loading");
    setSearchError(null);
    setResults(null);
    setGraphNodes([]);
    setGraphEdges([]);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        query: q,
        ...(forceType === "auto" ? {} : { force_type: forceType }),
      }));
      return;
    }

    // REST fallback when WebSocket is unavailable
    try {
      const apiUrl = getApiUrl();
      if (!apiUrl) {
        throw new Error("Search service is not configured.");
      }
      const res = await fetch(`${apiUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          ...(forceType === "auto" ? {} : { force_type: forceType }),
        }),
      });

      if (!res.ok) {
        let message = `Search failed with status ${res.status}`;
        try {
          const errorData = await res.json();
          if (errorData?.detail && typeof errorData.detail === "string") {
            message = errorData.detail;
          }
        } catch {
          // ignore JSON parse failure for error bodies
        }
        throw new Error(message);
      }

      const data: SearchResponse = await res.json();
      setResults(data);
      const { nodes, edges } = buildGraph(data);
      setGraphNodes(nodes);
      setGraphEdges(edges);
      setLoadingState("done");
    } catch (e) {
      console.error("Search failed:", e);
      setSearchError(e instanceof Error ? e.message : DEFAULT_SEARCH_ERROR);
      setLoadingState("error");
    }
  };

  return (
    <div className="min-h-screen text-green-200">
      {apiConfigured === false && (
        <ApiConfigPanel onConnected={() => setApiConfigured(true)} />
      )}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">OmniTrace Intelligence Platform</h1>
        <span className={`text-sm font-medium ${WS_STATUS_CLASS[wsStatus]}`}>
          ● WS {wsStatus}
        </span>
      </div>

      <div className="cyber-panel mb-8 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Query type">
          {QUERY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selectedType === type ? "true" : "false"}
              onClick={() => setSelectedType(type)}
              className={`border px-3 py-2 text-xs font-bold uppercase tracking-widest transition ${
                selectedType === type
                  ? "border-red-500 bg-red-950/40 text-red-300"
                  : "border-green-950 bg-black/30 text-green-700 hover:border-green-700 hover:text-green-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Enter target: IP, domain, email, hash, URL..."
        />
        <button
          onClick={() => void handleSearch()}
          disabled={!query.trim() || loadingState === "loading"}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-8 py-3 rounded-lg font-medium transition"
        >
          {loadingState === "loading" ? "Scanning..." : "Execute trace"}
        </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Panel */}
        <div className="lg:col-span-1 bg-slate-900 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Intelligence Results</h2>

          {loadingState === "loading" && (
            <p className="text-slate-400 text-sm animate-pulse">Querying intelligence sources...</p>
          )}

          {loadingState === "error" && searchError && (
            <p role="alert" aria-live="assertive" className="text-red-400 text-sm">
              {searchError}
            </p>
          )}

          {results && (
            <>
              <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                <span className="bg-brand-900/40 text-brand-100 px-2 py-0.5 rounded font-mono">
                  {results.query_type}
                </span>
                {results.cached && (
                  <span className="bg-slate-700 px-2 py-0.5 rounded">cached</span>
                )}
                <span className="ml-auto">{results.results.length} sources</span>
              </div>

              {results.ai_summary && <AIPanel summary={results.ai_summary} />}

              <div className="space-y-3">
                {results.results.map((r) => (
                  <ResultCard key={r.source} result={r} />
                ))}
              </div>
            </>
          )}

          {loadingState === "idle" && (
            <p className="text-slate-500 text-sm">Run a search to see results here.</p>
          )}
        </div>

        {/* Graph Visualization */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl p-6 h-[600px]">
          <h2 className="text-xl font-semibold mb-4">Relationship Graph</h2>
          <div className="h-[520px] rounded-lg overflow-hidden">
            <GraphView nodes={graphNodes} edges={graphEdges} />
          </div>
        </div>
      </div>

      {/* Sandbox Analysis */}
      <div className="mt-8 bg-slate-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Submit for Sandbox Analysis</h2>
        <p className="text-slate-500 text-sm">
          Upload a file or paste a URL/hash to submit for dynamic sandbox analysis
          via Hybrid Analysis or ANY.RUN.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={sandboxTarget}
            onChange={(event) => setSandboxTarget(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch(sandboxTarget, "url");
              }
            }}
            className="terminal-input flex-auto border border-green-900 bg-black/60 px-4 py-3 text-sm text-green-200 placeholder:text-green-900 focus:outline-none"
            placeholder="https://suspicious-target.example"
            aria-label="Sandbox URL"
          />
          <button
            type="button"
            disabled={!sandboxTarget.trim() || loadingState === "loading"}
            onClick={() => void handleSearch(sandboxTarget, "url")}
            className="border border-red-500/70 bg-red-950/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-red-300 hover:bg-red-950/60 disabled:opacity-40"
          >
            Detonate URL
          </button>
        </div>
      </div>
    </div>
  );
}
