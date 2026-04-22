import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, helper, accent, trend }) => {
  const positive = trend === 'up';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-6 shadow-xl shadow-black/20"
    >
      {/* Glow */}
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${accent}`}
      />

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>

          <h3 className="text-4xl font-bold tracking-tight text-white">
            {value}
          </h3>

          <p className="max-w-xs text-sm leading-6 text-slate-400">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}
        >
          {positive ? (
            <ArrowUpRight size={16} />
          ) : (
            <ArrowDownRight size={16} />
          )}
        </div>
      </div>

      {/* Footer line */}
      <div className="relative z-10 mt-6 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full w-2/3 rounded-full bg-gradient-to-r ${accent}`}
        />
      </div>
    </motion.div>
  );
};

export default MetricCard;