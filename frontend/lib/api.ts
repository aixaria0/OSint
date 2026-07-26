// Build-time API URL (takes priority when baked in at compile time).
const BUILD_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();

const LS_KEY = "omnitrace_api_url";


/**
 * Returns the backend API base URL (no trailing slash).
 *
 * Resolution order:
 *   a. NEXT_PUBLIC_API_URL baked in at build time.
 *   b. URL stored in localStorage by the user via the in-app config panel.
 *   c. http://localhost:8000 when running on localhost (local dev).
 *   d. null - the caller should prompt the user to configure the URL.
 */
export function getApiUrl(): string | null {
  if (BUILD_API_URL) return BUILD_API_URL.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored.replace(/\/+$/, "");

    const h = window.location.hostname;
    const parts = h.split(".");
    // Match localhost or any 127.0.0.0/8 loopback IP (numeric octet validation)
    const isLoopback = parts.length === 4 && parts[0] === "127" &&
      parts.every((p) => /^\d{1,3}$/.test(p) && +p <= 255);
    if (h === "localhost" || isLoopback) {
      return "http://localhost:8000";
    }
  }

  return null;
}

/** Persist a custom backend URL in localStorage. */
export function setApiUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, url.trim().replace(/\/+$/, ""));
  }
}

/** Remove a previously stored backend URL from localStorage. */
export function clearApiUrl(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LS_KEY);
  }
}

export function getWebSocketUrl(apiUrl: string): string {
  const proto = apiUrl.startsWith("https") ? "wss" : "ws";
  return apiUrl.replace(/^https?/, proto) + "/ws";
}
