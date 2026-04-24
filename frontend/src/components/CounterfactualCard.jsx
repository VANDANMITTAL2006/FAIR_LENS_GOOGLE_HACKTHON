import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const CounterfactualCard = ({ profile }) => {
  const parsed = useMemo(() => {
    if (!profile || profile.status !== 'ok') {
      return null;
    }

    const original = Number(profile.original_score || 0);
    const counterfactual = Number(profile.counterfactual_score || 0);
    const delta = Number(profile.delta || 0);

    return {
      attribute: profile.attribute,
      originalGroup: profile.original_group,
      counterfactualGroup: profile.counterfactual_group,
      original,
      counterfactual,
      delta,
    };
  }, [profile]);

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!parsed) {
      setAnimatedScore(0);
      return;
    }

    const target = parsed.counterfactual;
    const steps = 24;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(timer);
      } else {
        setAnimatedScore(current);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [parsed]);

  if (!parsed) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
        <p className="text-sm text-slate-400">
          Counterfactual analysis is unavailable for this dataset. Provide a prediction column to compare protected-group outcomes.
        </p>
      </section>
    );
  }

  const tone = parsed.delta >= 0 ? 'from-red-500 to-emerald-500' : 'from-emerald-500 to-red-500';

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Counterfactual Analysis</p>
      <h3 className="mt-2 text-3xl font-bold text-white">Protected Attribute Swap Test</h3>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Attribute</p>
          <p className="mt-2 text-lg font-semibold text-white">{parsed.attribute}</p>
          <p className="mt-3 text-sm text-slate-300">{parsed.originalGroup} -&gt; {parsed.counterfactualGroup}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Outcome Shift</p>
          <p className={`mt-2 text-lg font-semibold ${parsed.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {parsed.delta >= 0 ? '+' : ''}{parsed.delta.toFixed(2)} pts
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex items-end justify-between">
          <p className="text-sm text-slate-400">Counterfactual positive rate</p>
          <motion.p key={parsed.counterfactual} className="text-5xl font-bold text-white">
            {animatedScore.toFixed(2)}%
          </motion.p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            key={parsed.counterfactual}
            initial={{ width: 0 }}
            animate={{ width: `${clamp(parsed.counterfactual, 0, 100)}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          />
        </div>
      </div>
    </section>
  );
};

export default CounterfactualCard;
