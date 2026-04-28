import { SectionHeader } from "./SectionHeader";
import { Brain, Eye, FileSearch } from "lucide-react";
import { useFairLensState } from "../../state/FairLensContext";

const FEATURES = ["feature_01", "feature_02", "feature_03", "feature_04", "feature_05", "feature_06", "feature_07", "feature_08"];

export function Explainability({ auditData }: { auditData?: any }) {
  const { auditResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;

  const shapStatus = liveAudit?.component_status?.shap || 'skipped';
  const shapFeatures = Array.isArray(liveAudit?.top_shap_features) ? liveAudit.top_shap_features : [];

  const rankedFeatures = shapFeatures.length > 0
    ? shapFeatures.slice(0, 8).map((entry: any) => ({
        name: String(entry.feature),
        impact: Number(entry.impact || 0),
      }))
    : FEATURES.map((name) => ({ name, impact: 0 }));

  const maxImpact = Math.max(...rankedFeatures.map((feature) => Math.abs(feature.impact)), 1);

  return (
    <section id="explainability" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Explainability"
          title="SHAP-driven model transparency, with graceful degradation."
          description="If SHAP fails on opaque kernels, FairLens falls back to permutation importance — the UI marks the result as partial rather than failing the audit."
          action={
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] px-2.5 py-1 text-[11px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              SHAP · {shapStatus}
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-100">
                <Brain className="h-4 w-4 text-violet-300" />
                Feature importance (SHAP)
              </div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                {shapFeatures.length > 0 ? 'Computed from backend' : 'Awaiting computation'}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {rankedFeatures.map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  <div className="w-32 truncate text-xs text-zinc-400">{feature.name}</div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-400/70 to-violet-500/80"
                      style={{ width: `${Math.max(5, (Math.abs(feature.impact) / maxImpact) * 100)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs text-zinc-500">{feature.impact.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px] text-zinc-500">
              <span>Method</span>
              <span className="text-zinc-300">TreeSHAP · KernelSHAP · Permutation fallback</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-300" />
                <div className="text-sm text-zinc-100">Top feature insights</div>
              </div>
              <ol className="mt-4 space-y-3 text-sm">
                {rankedFeatures.slice(0, 3).map((feature, index) => (
                  <li key={feature.name} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
                      <span>#{index + 1}</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-600" />
                      <span>contribution</span>
                    </div>
                    <div className="mt-1.5 text-zinc-300">{feature.name} · impact {feature.impact.toFixed(3)}</div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-emerald-300" />
                <div className="text-sm text-zinc-100">Model transparency</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Coverage</div>
                  <div className="mt-1 text-lg text-zinc-100">{shapFeatures.length > 0 ? `${shapFeatures.length}` : '—'}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Stability</div>
                  <div className="mt-1 text-lg text-zinc-100">{shapStatus === 'ok' ? 'High' : shapStatus === 'failed' ? 'Failed' : 'Partial'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
