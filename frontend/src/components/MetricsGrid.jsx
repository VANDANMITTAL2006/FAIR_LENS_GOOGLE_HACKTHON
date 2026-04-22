import MetricCard from './MetricCard';

const MetricsGrid = ({ metrics }) => {
  return (
    <section className="space-y-6">
      {/* Top row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Live Analytics
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Fairness Overview
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Real-time indicators for demographic parity, fairness risk, and model health.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Synced with latest analysis
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>
    </section>
  );
};

export default MetricsGrid;