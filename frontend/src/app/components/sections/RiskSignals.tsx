import { SectionHeader } from "./SectionHeader";
import { ShieldAlert, AlertTriangle, ArrowUpRight } from "lucide-react";
import { useFairLensState } from "../../state/FairLensContext";

const FALLBACK_VIOLATIONS = [
  { title: "Hard threshold breaches", body: "Metric values that cross a regulator-defined limit (e.g., disparate impact < 0.80)." },
  { title: "Failed regulatory checks", body: "Specific controls in EU AI Act / NIST RMF that did not pass." },
  { title: "Severe disparity detected", body: "Group-level outcome gaps exceeding the configured severity ceiling." },
];

const FALLBACK_WARNINGS = [
  { title: "Borderline fairness score", body: "Metrics within 5% of the configured threshold — review before deployment." },
  { title: "Low sample size in subgroup", body: "Confidence intervals too wide to assert fairness for one or more groups." },
  { title: "Metadata incomplete", body: "Missing protected-attribute schema, target column, or model card details." },
  { title: "Drift risk detected", body: "Distribution shift between training data and the audited dataset." },
];

export function RiskSignals({ auditData }: { auditData?: any }) {
  const { auditResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;

  const liveViolations = (liveAudit?.regulatory_flags || []).map((entry: any) => ({
    title: typeof entry === 'string' ? entry : (entry?.clause || 'Regulatory flag'),
    body: typeof entry === 'string' ? 'Flagged by backend compliance checks.' : JSON.stringify(entry),
  }));

  const liveWarnings = (liveAudit?.warnings || []).map((item: any) => ({
    title: String(item),
    body: 'Pipeline warning returned by backend components.',
  }));

  const violations = liveViolations.length > 0 ? liveViolations : FALLBACK_VIOLATIONS;
  const warnings = liveWarnings.length > 0 ? liveWarnings : FALLBACK_WARNINGS;

  return (
    <section id="risk-signals" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Risk Signals"
          title="Governance signals, separated from raw metrics."
          description="Violations are blocking — they prevent a model from passing the audit. Warnings are advisory — they highlight risk that warrants human review before deployment."
          action={
            <div className="hidden items-center gap-3 text-xs text-zinc-400 md:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Blocking
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Advisory
              </span>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Violations */}
          <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.06] to-transparent p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
                  <ShieldAlert className="h-5 w-5 text-rose-300" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-rose-300/80">Violations</div>
                  <div className="text-zinc-100">Blocking governance failures</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl tracking-tight text-zinc-50">{liveViolations.length > 0 ? liveViolations.length : '—'}</div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">total</div>
              </div>
            </div>

            <ul className="relative mt-6 space-y-3">
              {violations.map((v) => (
                <li
                  key={v.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/30 p-4"
                >
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-rose-400 ring-4 ring-rose-400/15" />
                  <div className="flex-1">
                    <div className="text-sm text-zinc-100">{v.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-zinc-400">{v.body}</div>
                  </div>
                  <span className="rounded border border-rose-500/20 bg-rose-500/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-200">
                    {liveViolations.length > 0 ? 'live' : 'none'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
              <span className="text-zinc-500">Audit gate</span>
              <a href="#report" className="inline-flex items-center gap-1 text-rose-200 hover:text-rose-100">
                Review compliance <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Warnings */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-amber-300/80">Warnings</div>
                  <div className="text-zinc-100">Advisory review items</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl tracking-tight text-zinc-50">{liveWarnings.length > 0 ? liveWarnings.length : '—'}</div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">total</div>
              </div>
            </div>

            <ul className="relative mt-6 space-y-3">
              {warnings.map((w) => (
                <li
                  key={w.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/30 p-4"
                >
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-400/15" />
                  <div className="flex-1">
                    <div className="text-sm text-zinc-100">{w.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-zinc-400">{w.body}</div>
                  </div>
                  <span className="rounded border border-amber-500/20 bg-amber-500/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                    {liveWarnings.length > 0 ? 'live' : 'none'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
              <span className="text-zinc-500">Recommended</span>
              <a href="#analysis" className="inline-flex items-center gap-1 text-amber-200 hover:text-amber-100">
                Investigate analysis <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
