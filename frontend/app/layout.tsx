import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniTrace // OSINT Command",
  description: "Ethical open-source intelligence command platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="scan-line" aria-hidden="true" />
        <header className="sticky top-0 z-50 border-b border-green-950 bg-black/85 backdrop-blur-xl">
          <div className="mx-auto flex h-[3.5rem] max-w-screen-2xl items-center justify-between px-4 sm:px-6">
            <a href="/" className="group flex items-center gap-3" aria-label="OmniTrace home">
              <span className="grid h-9 w-9 place-items-center border border-red-500/60 bg-red-950/20 text-lg text-red-400">
                ⬡
              </span>
              <span>
                <span className="block text-sm font-black tracking-widest text-green-300 group-hover:text-green-200">
                  OMNITRACE
                </span>
                <span className="block text-xs tracking-[0.35em] text-green-800">INTELLIGENCE SYSTEM</span>
              </span>
            </a>
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-green-800">
              <span className="hidden sm:inline">ethical operations only</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-red-400">restricted</span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <footer className="mt-[3rem] border-t border-green-950/80 py-6 text-center text-xs uppercase tracking-widest text-green-900">
          OmniTrace // public data only // authorized and ethical use required
        </footer>
      </body>
    </html>
  );
}
