import { Sparkles, Github, Twitter, BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950">
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="tracking-tight text-zinc-50">FairLens</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
              The AI fairness auditing platform for teams shipping models into production.
            </p>
            <div className="mt-5 flex items-center gap-2 text-zinc-500">
              <a href="#" className="rounded-md p-1.5 hover:bg-white/[0.04] hover:text-zinc-200"><Github className="h-4 w-4" /></a>
              <a href="#" className="rounded-md p-1.5 hover:bg-white/[0.04] hover:text-zinc-200"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="rounded-md p-1.5 hover:bg-white/[0.04] hover:text-zinc-200"><BookOpen className="h-4 w-4" /></a>
            </div>
          </div>

          {[
            { title: "Product", items: ["Overview", "Audit", "Debias Lab", "Compliance"] },
            { title: "Docs", items: ["API reference", "Quickstart", "Metrics glossary", "Changelog"] },
            { title: "Company", items: ["Security", "Privacy", "Terms", "Contact"] },
          ].map((g) => (
            <div key={g.title}>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">{g.title}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {g.items.map((i) => (
                  <li key={i}><a href="#" className="text-zinc-400 hover:text-zinc-100">{i}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-zinc-500">
          <div>© FairLens — All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>v0.9.0 · build placeholder</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
