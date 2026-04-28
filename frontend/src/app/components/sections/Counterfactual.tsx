import { SectionHeader } from './SectionHeader';
import { ArrowRight, GitBranch, RefreshCcw } from 'lucide-react';
import { useFairLensState } from '../../state/FairLensContext';

function DecisionCard({
  title,
  decision,
  tone,
}: {
  title: string;
  decision: string;
  tone: 'before' | 'after';
}) {
  const ring = tone === 'before' ? 'ring-rose-500/20' : 'ring-emerald-500/20';
  const dot = tone === 'before' ? 'bg-rose-400' : 'bg-emerald-400';
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          decision
        </span>
      </div>
      <div className="mt-3 text-2xl tracking-tight text-zinc-50">{decision}</div>
      <div className="mt-1 text-xs text-zinc-500">Probability and class label populate post-audit</div>
    </div>
  );
}

export function Counterfactual({ auditData }: { auditData?: any }) {
  const { auditResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;
  const cf = liveAudit?.counterfactual_data || liveAudit?.counterfactual || {};
  const status = cf?.status || 'skipped';

  const rows = [
    {
      feature: 'attribute',
      before: cf?.original_group || '—',
      after: cf?.counterfactual_group || '—',
      changed: Boolean(cf?.original_group && cf?.counterfactual_group && cf.original_group !== cf.counterfactual_group),
    },
    {
      feature: 'score',
      before: cf?.original_score != null ? `${cf.original_score}%` : '—',
      after: cf?.counterfactual_score != null ? `${cf.counterfactual_score}%` : '—',
      changed: cf?.original_score != null && cf?.counterfactual_score != null && Number(cf.original_score) !== Number(cf.counterfactual_score),
    },
    {
      feature: 'delta',
      before: '0%',
      after: cf?.delta != null ? `${cf.delta}%` : '—',
      changed: cf?.delta != null,
    },
  ];

  return (
    <section id="counterfactual" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Counterfactual Analysis"
          title="Smallest realistic change to flip a decision."
          description="DiCE-style counterfactuals show the minimum, plausibility-constrained perturbation that reverses the model's outcome — surfacing actionable recourse for affected individuals."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <DecisionCard title="Original instance" decision={cf?.original_group || '—'} tone="before" />
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300">
              <RefreshCcw className="h-3.5 w-3.5 text-violet-300" />
              Decision flipped
              <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-zinc-400">{status}</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>
          <DecisionCard title="Counterfactual" decision={cf?.counterfactual_group || '—'} tone="after" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] lg:col-span-2">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-zinc-100">
                <GitBranch className="h-4 w-4 text-indigo-300" />
                Feature deltas
              </div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">before vs after</div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 text-left">Feature</th>
                  <th className="px-5 py-3 text-left">Before</th>
                  <th className="px-5 py-3 text-left">After</th>
                  <th className="px-5 py-3 text-left">Changed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.feature} className={`text-zinc-300 ${i !== rows.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                    <td className="px-5 py-3 text-zinc-200">{row.feature}</td>
                    <td className="px-5 py-3 text-zinc-500">{row.before}</td>
                    <td className="px-5 py-3 text-zinc-500">{row.after}</td>
                    <td className="px-5 py-3">
                      <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                        {row.changed ? 'yes' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">Distance</div>
              <div className="mt-1 text-2xl tracking-tight text-zinc-100">{cf?.distance ?? '—'}</div>
              <div className="mt-1 text-xs text-zinc-500">L1 / L2 / Gower (categorical-aware)</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">Similarity score</div>
              <div className="mt-1 text-2xl tracking-tight text-zinc-100">{cf?.delta != null ? `${Math.max(0, 100 - Number(cf.delta))}%` : '—'}</div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-violet-500"
                  style={{ width: `${cf?.delta != null ? Math.max(0, 100 - Number(cf.delta)) : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">Plausibility</div>
              <div className="mt-1 text-sm text-zinc-300">
                {status === 'ok'
                  ? 'Counterfactual generated from backend pipeline.'
                  : 'Counterfactual component unavailable for this run. UI fallback enabled.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
