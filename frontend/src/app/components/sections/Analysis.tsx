import { SectionHeader } from "./SectionHeader";
import { AlertTriangle, TrendingUp, BarChart3, Users } from "lucide-react";
import { useFairLensState } from "../../state/FairLensContext";

const fallbackGroups = [
  { group: "Group A", size: "—", rate: "—", disparity: "—" },
  { group: "Group B", size: "—", rate: "—", disparity: "—" },
  { group: "Group C", size: "—", rate: "—", disparity: "—" },
  { group: "Group D", size: "—", rate: "—", disparity: "—" },
];

function MiniBar({ heights }: { heights: number[] }) {
  return (
    <div className="flex h-32 items-end gap-3">
      {heights.map((h, i) => (
        <div key={i} className="relative flex-1">
          <div
            className="w-full rounded-t bg-gradient-to-t from-indigo-500/40 to-violet-400/80"
            style={{ height: `${h}%` }}
          />
          <div className="mt-2 text-center text-[10px] text-zinc-500">G{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

export function Analysis({ auditData }: { auditData?: any }) {
  const { auditResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;

  const groupComparison = Array.isArray(liveAudit?.group_comparison) ? liveAudit.group_comparison : [];
  const groupMetrics = liveAudit?.group_metrics || {};
  const warnings = Array.isArray(liveAudit?.warnings) ? liveAudit.warnings : [];

  const enrichedGroups = groupComparison.length > 0
    ? groupComparison.map((entry: any) => {
        const metric = groupMetrics?.[entry.group] || {};
        return {
          group: entry.group,
          size: String(entry.sample_size ?? metric.sample_size ?? '—'),
          rate: entry.selection_rate != null ? `${(Number(entry.selection_rate) * 100).toFixed(1)}%` : '—',
          rawRate: entry.selection_rate != null ? Number(entry.selection_rate) : 0,
          disparity: metric.disparity != null ? Number(metric.disparity).toFixed(3) : '—',
        };
      })
    : fallbackGroups.map((entry) => ({ ...entry, rawRate: 0 }));

  const maxRate = Math.max(...enrichedGroups.map((entry) => entry.rawRate || 0), 1);
  const barHeights = enrichedGroups.map((entry) => Math.max(8, (entry.rawRate / maxRate) * 100));

  const metrics = liveAudit?.metrics || {};
  const dp = Math.abs(Number(metrics.demographic_parity_difference || 0));
  const eo = Math.abs(Number(metrics.equalized_odds_difference || 0));
  const di = Number(metrics.disparate_impact_ratio || 0);

  return (
    <section id="analysis" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Analysis"
          title="Group-level performance with statistical significance."
          description="Selection rates, disparities, and confidence intervals across protected groups, computed in the audit pipeline and streamed via SSE."
        />

        {/* alert banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <div>
            <div className="text-sm text-amber-100">{warnings[0] || 'Bias alerts will surface here'}</div>
            <div className="text-xs text-amber-200/60">
              {warnings.length > 1
                ? `${warnings.length} warnings returned by backend.`
                : 'Once an audit completes, threshold violations are listed with the impacted group, metric, and severity.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Chart */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-100">
                    <BarChart3 className="h-4 w-4 text-violet-300" />
                    Selection rate by group
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Higher bars indicate higher predicted positive rates within a demographic group.
                  </p>
                </div>
                <div className="flex gap-1 rounded-md border border-white/10 bg-white/[0.03] p-0.5 text-xs">
                  {["Selection", "TPR", "FPR"].map((t, i) => (
                    <button
                      key={t}
                      className={`rounded px-2.5 py-1 ${i === 0 ? "bg-white/[0.06] text-zinc-100" : "text-zinc-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <MiniBar heights={barHeights.slice(0, 4)} />
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
                  <span>Threshold band</span>
                  <span>±10% from majority group</span>
                </div>
              </div>
            </div>

            {/* table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Group</th>
                    <th className="px-5 py-3 text-left">Sample size</th>
                    <th className="px-5 py-3 text-left">Selection rate</th>
                    <th className="px-5 py-3 text-left">Disparity</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedGroups.map((g, i) => (
                    <tr key={g.group} className={`text-zinc-300 ${i !== enrichedGroups.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                          {g.group}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{g.size}</td>
                      <td className="px-5 py-3 text-zinc-400">{g.rate}</td>
                      <td className="px-5 py-3 text-zinc-400">{g.disparity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-300" />
                <div className="text-sm text-zinc-100">Group coverage</div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Sample size and stratification quality per protected group will appear here.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Min group n</div>
                  <div className="mt-1 text-lg text-zinc-100">{groupComparison.length > 0 ? Math.min(...groupComparison.map((entry: any) => Number(entry.sample_size || 0))) : '—'}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">CI width</div>
                  <div className="mt-1 text-lg text-zinc-100">—</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                <div className="text-sm text-zinc-100">Threshold visuals</div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Demographic Parity', value: dp, max: 0.5 },
                  { label: 'Equalized Odds', value: eo, max: 0.5 },
                  { label: 'Disparate Impact', value: di, max: 1.0 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="text-zinc-500">{liveAudit ? item.value.toFixed(3) : '—'}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
                        style={{ width: `${liveAudit ? Math.min(100, (item.value / item.max) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
