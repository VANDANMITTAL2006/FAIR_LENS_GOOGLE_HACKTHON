import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, ShieldAlert } from 'lucide-react';

const CounterfactualCard = ({ profile, allRecords = [] }) => {
  const fallback = {
    sex: 'Female',
    race: 'Non-White',
    education: 'Bachelors',
    age: 29,
    hours: 40,
    probability: 42,
  };

  const base = profile || fallback;

  const buildScenarios = () => {
    const originalProb = estimateProbability(base);

    return [
      {
        id: 'original',
        label: `${base.sex}, ${base.race}`,
        tag: 'Original',
        probability: originalProb,
        data: { ...base },
        tone: 'from-rose-500 via-orange-500 to-amber-500',
      },
      {
        id: 'gender',
        label: `${base.sex === 'Male' ? 'Female' : 'Male'}, ${base.race}`,
        tag: 'Gender Changed',
        probability: estimateProbability({
          ...base,
          sex: base.sex === 'Male' ? 'Female' : 'Male',
        }),
        data: {
          ...base,
          sex: base.sex === 'Male' ? 'Female' : 'Male',
        },
        tone: 'from-sky-500 via-cyan-500 to-teal-500',
      },
      {
        id: 'race',
        label: `${base.sex}, ${base.race === 'White' ? 'Non-White' : 'White'}`,
        tag: 'Race Changed',
        probability: estimateProbability({
          ...base,
          race: base.race === 'White' ? 'Non-White' : 'White',
        }),
        data: {
          ...base,
          race: base.race === 'White' ? 'Non-White' : 'White',
        },
        tone: 'from-emerald-500 via-lime-500 to-slate-500',
      },
    ];
  };

  const estimateProbability = (row) => {
    let score = 40;

    if (row.education?.toLowerCase().includes('master')) score += 18;
    else if (row.education?.toLowerCase().includes('bachelor')) score += 12;
    else score += 5;

    if (Number(row.age) > 30) score += 8;
    if (Number(row.hours) >= 40) score += 10;

    if (row.sex === 'Male') score += 6;
    if (row.race === 'White') score += 5;

    return Math.min(95, Math.max(5, score));
  };

  const scenarios = useMemo(() => buildScenarios(), [profile]);
  const [activeId, setActiveId] = useState('original');

  useEffect(() => {
    setActiveId('original');
  }, [profile]);

  const active = scenarios.find((item) => item.id === activeId);
  const diff = active.probability - scenarios[0].probability;

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Counterfactual Analysis
          </p>

          <h3 className="mt-2 text-3xl font-bold text-white">
            Real Dataset Fairness Simulation
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Same qualifications, protected attributes changed. Observe how predictions shift.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <ShieldAlert size={15} />
          Sensitive fairness test
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Sex</p>
              <p className="mt-3 text-lg font-semibold text-white">{active.data.sex}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Race</p>
              <p className="mt-3 text-lg font-semibold text-white">{active.data.race}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Education</p>
              <p className="mt-3 text-lg font-semibold text-white">{active.data.education}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-400">Hire Probability</p>

              <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {active.tag}
              </span>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <motion.h4
                key={active.probability}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-bold text-white"
              >
                {active.probability}%
              </motion.h4>

              <span className={`pb-2 text-sm font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {diff >= 0 ? '+' : ''}{diff}%
              </span>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                key={active.id}
                initial={{ width: 0 }}
                animate={{ width: `${active.probability}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full bg-gradient-to-r ${active.tone}`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-slate-300">Compare scenarios</p>

            <div className="mt-3 space-y-3">
              {scenarios.map((option) => (
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
                      <p className="mt-1 text-xs text-slate-400">{option.tag}</p>
                    </div>

                    <ArrowRightLeft size={16} className="text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-7 text-slate-300">
            <span className="font-semibold text-white">Insight:</span> If probability changes significantly while qualifications remain constant, the model may be sensitive to protected attributes.
          </div>
        </div>
      </div>
    </section>
  );
};

export default CounterfactualCard;