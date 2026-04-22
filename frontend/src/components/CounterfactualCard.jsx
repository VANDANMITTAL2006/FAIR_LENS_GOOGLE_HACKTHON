import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react';

const CounterfactualCard = () => {
  const options = [
    {
      id: 'sarah',
      label: 'Sarah Chen',
      probability: 34,
      tag: 'Original',
      tone: 'from-rose-500 via-orange-500 to-amber-500',
    },
    {
      id: 'james-chen',
      label: 'James Chen',
      probability: 67,
      tag: 'Sex Changed',
      tone: 'from-sky-500 via-cyan-500 to-teal-500',
    },
    {
      id: 'james-white',
      label: 'James White',
      probability: 71,
      tag: 'Race Changed',
      tone: 'from-emerald-500 via-lime-500 to-slate-500',
    },
  ];

  const [activeId, setActiveId] = useState('sarah');

  const activeOption = useMemo(
    () => options.find((item) => item.id === activeId),
    [activeId]
  );

  const baseScore = 34;
  const diff = activeOption.probability - baseScore;

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Counterfactual Analysis
          </p>
          <h3 className="mt-2 text-3xl font-bold text-white">
            Identity-only Hiring Simulation
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Observe how model outcomes shift when only identity-related
            attributes change while qualifications remain identical.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <ShieldAlert size={15} />
          Sensitive fairness test
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Candidate Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Candidate
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {activeOption.label}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Education
              </p>
              <p className="mt-3 text-lg font-semibold text-white">MIT</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Experience
              </p>
              <p className="mt-3 text-lg font-semibold text-white">5 Years</p>
            </div>
          </div>

          {/* Score Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">
                Hire Probability
              </p>

              <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {activeOption.tag}
              </span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <motion.h4
                key={activeOption.probability}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-bold text-white"
              >
                {activeOption.probability}%
              </motion.h4>

              <span
                className={`pb-2 text-sm font-semibold ${
                  diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {diff >= 0 ? '+' : ''}
                {diff}%
              </span>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                key={activeOption.id}
                initial={{ width: 0 }}
                animate={{ width: `${activeOption.probability}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full bg-gradient-to-r ${activeOption.tone}`}
              />
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-slate-300">
              Compare scenarios
            </p>

            <div className="mt-3 space-y-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveId(option.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    activeId === option.id
                      ? 'border-sky-400 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{option.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {option.tag}
                      </p>
                    </div>

                    <ArrowRightLeft
                      size={16}
                      className="text-slate-500"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-7 text-slate-300">
            <span className="font-semibold text-white">Insight:</span> The
            model prediction changes significantly when only identity-related
            features are modified. This may indicate unfair sensitivity to
            protected attributes.
          </div>
        </div>
      </div>
    </section>
  );
};

export default CounterfactualCard;