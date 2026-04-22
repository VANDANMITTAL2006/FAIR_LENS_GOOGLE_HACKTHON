import { Sparkles, ArrowRight } from 'lucide-react';

const DebiasCard = ({ strategy, onApply, isRecommended }) => {
  return (
    <div
      className={`group rounded-2xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isRecommended
          ? 'border-emerald-400/40 bg-emerald-500/5 shadow-emerald-500/10'
          : 'border-slate-800 bg-slate-900/60 shadow-black/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-xl font-bold text-white">
            {strategy.title}
          </h4>

          {isRecommended && (
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
              <Sparkles size={12} />
              Recommended
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-sm leading-7 text-slate-400">
        {strategy.description}
      </p>

      {/* Stats */}
      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Best Use Case
          </p>
          <p className="mt-2 text-sm font-medium text-white">
            {strategy.bestUseCase}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Fairness Gain
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-300">
              {strategy.gain}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Tradeoff
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-300">
              {strategy.cost}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Confidence
            </p>
            <span className="text-sm font-semibold text-white">
              {strategy.confidence}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
              style={{ width: `${strategy.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => onApply(strategy.id)}
        className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
          isRecommended
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        Apply Strategy
        <ArrowRight size={15} />
      </button>
    </div>
  );
};

export default DebiasCard;