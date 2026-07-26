"use client";

import { useState } from "react";
import { Server, ExternalLink } from "lucide-react";
import { setApiUrl } from "@/lib/api";

interface Props {
  onConnected: () => void;
}

const HEALTH_CHECK_TIMEOUT_MS = 5000; // maximum wait for backend /health response

const REPO_README = "https://github.com/AixAriaPrime/OSint#readme";

export default function ApiConfigPanel({ onConnected }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!trimmed) return;

    if (!/^https?:\/\//.test(trimmed)) {
      setError("URL must start with http:// or https://");
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError("Invalid URL format");
      return;
    }

    setIsValidating(true);
    setError(null);
    try {
      const res = await fetch(`${trimmed}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
      });
      if (!res.ok) {
        setError(`Backend returned HTTP ${res.status}. Is the URL correct?`);
        return;
      }
    } catch {
      setError(
        "Could not reach the backend. Check the URL and ensure the server is running."
      );
      return;
    } finally {
      setIsValidating(false);
    }

    setApiUrl(trimmed);
    onConnected();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur">
      <div className="cyber-panel w-full max-w-lg mx-4 p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center border border-red-500/60 bg-red-950/20 p-2 text-red-400">
            <Server className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black tracking-widest text-green-300 uppercase">
              Backend not configured
            </p>
            <p className="text-xs tracking-widest text-green-800">
              OmniTrace requires a running API server
            </p>
          </div>
        </div>

        <p className="text-sm text-green-700 mb-6 leading-relaxed">
          Enter the URL of your OmniTrace backend. The value is saved in your
          browser and used for all API requests.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-green-600 mb-2">
              API URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="https://your-backend.example.com"
              className="terminal-input w-full border border-green-900 bg-black/60 px-4 py-3 text-sm text-green-200 placeholder:text-green-900 focus:outline-none"
              autoFocus
              required
            />
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!url.trim() || isValidating}
            className="w-full border border-red-500/70 bg-red-950/30 px-6 py-3 text-xs font-bold uppercase tracking-widest text-red-300 hover:bg-red-950/60 disabled:opacity-40 transition"
          >
            {isValidating ? "Testing connection…" : "Save & Connect"}
          </button>
        </form>

        <div className="mt-6 border-t border-green-950 pt-4 text-xs text-green-900">
          <p>
            Self-hosting?{" "}
            <a
              href={REPO_README}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-green-700 hover:text-green-400 transition"
            >
              See deploy instructions <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
