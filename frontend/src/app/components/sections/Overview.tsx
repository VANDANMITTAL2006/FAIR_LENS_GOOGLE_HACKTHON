import { SectionHeader } from "./SectionHeader";
import { useFairLensState } from "../../state/FairLensContext";
import {
  Activity, Scale, GitCompare, Target,
  ShieldAlert, Gauge,
} from "lucide-react";

type Status = "pass" | "warn" | "fail" | "idle";

const statusStyles: Record<Status, { dot: string; text: string; ring: string }> = {
  pass: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "ring-emerald-500/20" },
  warn: { dot: "bg-amber-400", text: "text-amber-300", ring: "ring-amber-500/20" },
  fail: { dot: "bg-rose-400", text: "text-rose-300", ring: "ring-rose-500/20" },
  idle: { dot: "bg-zinc-500", text: "text-zinc-400", ring: "ring-white/10" },
};

interface Metric {
  label: string;
  value: string;
  hint: string;
  status: Status;
  icon: React.ComponentType<{ className?: string }>;
  threshold: string;
}

function buildMetrics(auditData: any): Metric[] {
  const raw = auditData?.metrics || {};
  const dp = Math.abs(Number(raw.demographic_parity_difference || 0));
  const eo = Math.abs(Number(raw.equalized_odds_difference || 0));
  const pp = Math.abs(Number(raw.predictive_parity_diff || 0));
  const di = Number(raw.disparate_impact_ratio || 0);
  const severity = Math.round((dp + eo + pp) * 100 / 3);
  const risk = String(auditData?.risk_level || '—');

  return [
    { label: 'Demographic Parity', value: auditData ? dp.toFixed(3) : '—', hint: 'P(Ŷ=1 | A=a)', status: auditData ? (dp <= 0.1 ? 'pass' : dp <= 0.2 ? 'warn' : 'fail') : 'idle', icon: Scale, threshold: 'Δ ≤ 0.10' },
    { label: 'Equalized Odds', value: auditData ? eo.toFixed(3) : '—', hint: 'TPR & FPR parity', status: auditData ? (eo <= 0.1 ? 'pass' : eo <= 0.2 ? 'warn' : 'fail') : 'idle', icon: GitCompare, threshold: 'Δ ≤ 0.10' },
    { label: 'Disparate Impact', value: auditData ? di.toFixed(3) : '—', hint: 'Four-fifths rule', status: auditData ? (di >= 0.8 ? 'pass' : di >= 0.6 ? 'warn' : 'fail') : 'idle', icon: Activity, threshold: '≥ 0.80' },
    { label: 'Predictive Parity', value: auditData ? pp.toFixed(3) : '—', hint: 'PPV across groups', status: auditData ? (pp <= 0.05 ? 'pass' : pp <= 0.1 ? 'warn' : 'fail') : 'idle', icon: Target, threshold: 'Δ ≤ 0.05' },
    { label: 'Bias Severity', value: auditData ? String(severity) : '—', hint: 'Weighted score 0–100', status: auditData ? (severity < 30 ? 'pass' : severity < 60 ? 'warn' : 'fail') : 'idle', icon: Gauge, threshold: '< 30' },
    { label: 'Risk Level', value: risk, hint: 'Composite risk', status: auditData ? (risk.toLowerCase() === 'low' ? 'pass' : risk.toLowerCase() === 'medium' ? 'warn' : 'fail') : 'idle', icon: ShieldAlert, threshold: 'low / med / high' },
  ];
}

function MetricCard({ m }: { m: Metric }) {
  const s = statusStyles[m.status];
  const Icon = m.icon;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04] ring-1 ${s.ring}`}>
          <Icon className="h-4 w-4 text-zinc-300" />
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2 py-0.5 text-[11px] ${s.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {m.status === "idle" ? "awaiting audit" : m.status}
        </div>
      </div>
      <div className="mt-5 text-[11px] uppercase tracking-wider text-zinc-500">{m.label}</div>
      <div className="mt-1 text-3xl tracking-tight text-zinc-50">{m.value}</div>
      <div className="mt-1 text-xs text-zinc-500">{m.hint}</div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
        <span>Threshold</span>
        <span className="text-zinc-300">{m.threshold}</span>
      </div>
    </div>
  );
}

export function Overview({ auditData }: { auditData?: any }) {
  const { auditResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;
  const metrics = buildMetrics(liveAudit);

  return (
    <section id="overview" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Fairness Overview"
          title="A live, regulator-ready scoreboard for every model."
          description="Eight headline metrics tracked against statistical and regulatory thresholds. Cards populate from the audit pipeline as soon as a job completes."
          action={
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${liveAudit ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {liveAudit ? 'Live backend metrics loaded' : 'Pipeline ready · awaiting dataset'}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => <MetricCard key={m.label} m={m} />)}
        </div>
      </div>
    </section>
  );
}
