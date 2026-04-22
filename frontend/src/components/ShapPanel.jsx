import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

const ShapPanel = ({ shapData }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Model Explainability
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            Feature Impact Analysis
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Ranked drivers influencing predictions. High-impact variables may
            require governance review if they proxy protected attributes.
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
          <ShieldAlert size={18} />
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {shapData.map((item, index) => {
          const impact = Math.abs(item.impact);
          const width = Math.max(impact * 100, 6);
          const positive = item.impact >= 0;

          return (
            <motion.div
              key={item.feature}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 }}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium capitalize text-slate-200">
                  {item.feature.replace(/-/g, ' ')}
                </span>

                <span
                  className={`text-sm font-bold ${
                    positive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {item.impact > 0
                    ? `+${item.impact.toFixed(2)}`
                    : item.impact.toFixed(2)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    positive
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                      : 'bg-gradient-to-r from-rose-500 to-orange-400'
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs leading-5 text-slate-400">
        Variables with persistent high contribution should be reviewed for
        leakage, proxy bias, and regulatory explainability requirements.
      </div>
    </motion.div>
  );
};

export default ShapPanel;