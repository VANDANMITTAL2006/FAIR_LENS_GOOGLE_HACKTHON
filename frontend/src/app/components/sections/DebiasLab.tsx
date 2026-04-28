import { SectionHeader } from './SectionHeader';
import { Wand2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useFairLensState } from '../../state/FairLensContext';

function Delta({ label, before, after, dir }: { label: string; before: string; after: string; dir: 'up' | 'down' }) {
  const Icon = dir === 'up' ? TrendingUp : TrendingDown;
  const tone = dir === 'up' ? 'text-emerald-300' : 'text-rose-300';
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-zinc-500 line-through">{before}</span>
        <ArrowRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-100">{after}</span>
        <Icon className={`ml-auto h-3.5 w-3.5 ${tone}`} />
      </div>
    </div>
  );
}

export function DebiasLab({
  strategies,
  appliedStrategyId,
  onApplyStrategy,
  error,
}: {
  strategies?: any[];
  appliedStrategyId?: string;
  onApplyStrategy?: (id: string) => void;
  error?: string;
}) {
  const { debiasResult, setAppliedStrategyId: setGlobalAppliedStrategyId, appliedStrategyId: globalAppliedStrategyId } = useFairLensState();

  const liveStrategies = Array.isArray(strategies) ? strategies : (debiasResult?.strategies || []);
  const activeStrategyId = appliedStrategyId ?? globalAppliedStrategyId;
  const apply = onApplyStrategy || setGlobalAppliedStrategyId;

  const applied = liveStrategies.find((strategy: any) => strategy.id === activeStrategyId)
    || liveStrategies.find((strategy: any) => strategy.recommended)
    || null;

  return (
    <section id="debias" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Debias Lab"
          title="Apply, simulate, and compare remediation strategies."
          description="Each strategy runs against your audited model server-side. Outcomes are reported with fairness gain, accuracy delta, and qualified deployment guidance."
        />

        {error && (
          <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/[0.1] px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {liveStrategies.length === 0 && (
            <div className="col-span-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-zinc-400">
              Debias strategies will appear after upload and audit complete.
            </div>
          )}

          {liveStrategies.map((strategy: any) => (
            <div
              key={strategy.id}
              className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white/[0.02] p-6 transition hover:bg-white/[0.04] ${
                strategy.recommended || strategy.id === activeStrategyId ? 'border-violet-400/30' : 'border-white/[0.06]'
              }`}
            >
              {(strategy.recommended || strategy.id === activeStrategyId) && (
                <span className="absolute right-4 top-4 rounded-full border border-violet-400/30 bg-violet-500/[0.12] px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-200">
                  {strategy.id === activeStrategyId ? 'applied' : 'recommended'}
                </span>
              )}

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/10">
                  <Wand2 className="h-4 w-4 text-violet-300" />
                </div>
                <div>
                  <div className="text-zinc-100">{strategy.title || strategy.id}</div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">backend strategy</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-zinc-400">{strategy.description || strategy.bestUseCase || 'No description'}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Delta
                  label="Bias severity"
                  before={strategy.fairness_before?.demographic_parity_diff != null ? Number(strategy.fairness_before.demographic_parity_diff).toFixed(3) : '—'}
                  after={strategy.fairness_after?.demographic_parity_diff != null ? Number(strategy.fairness_after.demographic_parity_diff).toFixed(3) : '—'}
                  dir="down"
                />
                <Delta
                  label="Accuracy"
                  before={strategy.accuracy_before != null ? Number(strategy.accuracy_before).toFixed(3) : '—'}
                  after={strategy.accuracy_after != null ? Number(strategy.accuracy_after).toFixed(3) : '—'}
                  dir="down"
                />
                <Delta
                  label="Disparate impact"
                  before={strategy.fairness_before?.disparate_impact != null ? Number(strategy.fairness_before.disparate_impact).toFixed(3) : '—'}
                  after={strategy.fairness_after?.disparate_impact != null ? Number(strategy.fairness_after.disparate_impact).toFixed(3) : '—'}
                  dir="up"
                />
                <Delta
                  label="Equalized odds Δ"
                  before={strategy.fairness_before?.equalized_odds_diff != null ? Number(strategy.fairness_before.equalized_odds_diff).toFixed(3) : '—'}
                  after={strategy.fairness_after?.equalized_odds_diff != null ? Number(strategy.fairness_after.equalized_odds_diff).toFixed(3) : '—'}
                  dir="down"
                />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">Fairness</span>
                  <span className="text-emerald-300">
                    {strategy.fairness_improvement_pct != null ? `${Number(strategy.fairness_improvement_pct).toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">Tradeoff</span>
                  <span className="text-amber-300">
                    {strategy.accuracy_loss_pct != null ? `${Math.abs(Number(strategy.accuracy_loss_pct)).toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => apply(strategy.id)}
                className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-md bg-white/[0.05] px-4 py-2 text-sm text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/[0.09]"
              >
                {strategy.id === activeStrategyId ? 'Applied' : 'Apply Strategy'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-100">Side-by-side comparison</div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">populated post-debias</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                label: 'Demographic Parity',
                before: applied?.fairness_before?.demographic_parity_diff,
                after: applied?.fairness_after?.demographic_parity_diff,
              },
              {
                label: 'Equalized Odds',
                before: applied?.fairness_before?.equalized_odds_diff,
                after: applied?.fairness_after?.equalized_odds_diff,
              },
              {
                label: 'Disparate Impact',
                before: applied?.fairness_before?.disparate_impact,
                after: applied?.fairness_after?.disparate_impact,
              },
              {
                label: 'Accuracy',
                before: applied?.accuracy_before,
                after: applied?.accuracy_after,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{item.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg text-zinc-500">{item.before != null ? Number(item.before).toFixed(3) : '—'}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-600" />
                  <span className="text-lg text-zinc-100">{item.after != null ? Number(item.after).toFixed(3) : '—'}</span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-violet-500" style={{ width: `${item.after != null ? 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
