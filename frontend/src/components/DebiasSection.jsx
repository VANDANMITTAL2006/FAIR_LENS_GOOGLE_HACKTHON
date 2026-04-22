import DebiasCard from './DebiasCard';
import { Sparkles } from 'lucide-react';

const DebiasSection = ({
  strategies,
  onApply,
  appliedStrategy,
  metrics,
  hasFile,
}) => {
  const getRecommendedStrategy = () => {
    if (!hasFile) return null;

    const genderGap = metrics.find((m) => m.id === 'gender')?.value;
    const raceGap = metrics.find((m) => m.id === 'race')?.value;
    const fairness = metrics.find((m) => m.id === 'fairness')?.value;

    const genderVal = parseInt(genderGap || '0');
    const raceVal = parseInt(raceGap || '0');
    const fairnessVal = parseInt((fairness || '0').split('/')[0]);

    if (genderVal > 20 || raceVal > 20) return 'reweighting';
    if (fairnessVal < 70) return 'thresholds';

    return 'feature-removal';
  };

  const recommended = getRecommendedStrategy();

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Debiasing Strategies
          </p>

          <h3 className="mt-2 text-3xl font-bold text-white">
            Intelligent Remediation Engine
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            {hasFile
              ? 'Based on detected fairness gaps, FairLens recommends the most effective mitigation strategy for your dataset.'
              : 'Upload a dataset to unlock personalized debiasing recommendations.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Applied Strategy
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {appliedStrategy}
          </p>
        </div>
      </div>

      {/* Empty State */}
      {!hasFile ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-8 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
            <Sparkles size={22} />
          </div>

          <h4 className="mt-5 text-xl font-semibold text-white">
            Upload a Dataset to Continue
          </h4>

          <p className="mt-2 text-sm text-slate-400">
            We’ll analyze your metrics and recommend the best fairness strategy.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {strategies.map((strategy) => (
            <DebiasCard
              key={strategy.id}
              strategy={strategy}
              onApply={onApply}
              isRecommended={strategy.id === recommended}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default DebiasSection;