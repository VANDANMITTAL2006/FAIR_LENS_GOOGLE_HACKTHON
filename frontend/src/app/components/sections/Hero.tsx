import { ArrowRight, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden border-b border-white/[0.06]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 40%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-280px] h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-500/30 via-indigo-500/10 to-transparent blur-3xl"
      />

      <div className="relative mx-auto max-w-[1400px] px-6 py-24 lg:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>EU AI Act · NIST AI RMF · ISO/IEC 42001 aligned</span>
          </div>

          <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-[44px] leading-[1.05] tracking-tight text-transparent lg:text-[68px]">
            Trusted AI fairness,
            <br />
            engineered for compliance.
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            FairLens is the AI governance platform for ML teams who ship into
            regulated environments — quantify bias, certify fairness, and
            document remediation across every model release.
          </p>

          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
            Upload · Measure · Detect · Analyze · Explain · Fix · Certify · Track
          </div>

          <div className="mt-9 flex items-center justify-center">
            <a
              href="#upload"
              className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-b from-indigo-400 to-violet-600 px-5 py-2.5 text-sm text-white shadow-[0_1px_0_0_rgba(255,255,255,0.18)_inset,0_12px_32px_-10px_rgba(124,58,237,0.7)] transition hover:brightness-110"
            >
              Start Audit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <div className="mt-14 grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] sm:grid-cols-4">
            {[
              ["Metrics Supported", "8+ Fairness Metrics"],
              ["Explainability", "SHAP + Counterfactuals"],
              ["Compliance Ready", "EU AI Act / NIST / ISO 42001"],
              ["ML Stack", "scikit-learn / XGBoost / PyTorch"],
            ].map(([k, v]) => (
              <div key={k} className="bg-zinc-950 px-4 py-4 text-left">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{k}</div>
                <div className="mt-1 text-sm text-zinc-100">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
