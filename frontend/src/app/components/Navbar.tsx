import { Sparkles, FileDown } from "lucide-react";
import { useEffect, useState } from "react";

const NAV = [
  { label: "Upload", id: "upload" },
  { label: "Overview", id: "overview" },
  { label: "Analysis", id: "analysis" },
  { label: "Explainability", id: "explainability" },
  { label: "Debias", id: "debias" },
  { label: "Report", id: "report" },
  { label: "History", id: "history" },
];

export function Navbar() {
  const [active, setActive] = useState<string>("upload");

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <a href="#hero" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg shadow-violet-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="tracking-tight text-zinc-50">FairLens</span>
          <span className="ml-2 hidden rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400 sm:inline">
            v0.9 · beta
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const isActive = active === n.id;
            return (
              <a
                key={n.id}
                href={`#${n.id}`}
                className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "text-zinc-50"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                }`}
              >
                {n.label}
                {isActive && (
                  <span className="absolute inset-x-3 -bottom-[7px] h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#report"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-indigo-400 to-violet-600 px-3.5 py-1.5 text-sm text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_rgba(124,58,237,0.6)] transition hover:brightness-110"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Report
          </a>
        </div>
      </div>
    </header>
  );
}
