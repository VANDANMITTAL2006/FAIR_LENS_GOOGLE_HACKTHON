import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const BiasChart = ({ groupData, pieData }) => {
  const pieColors = ['#22c55e', '#f97316'];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
      {/* Bar Chart */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-6 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Group Analysis
            </p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              Approval Rate by Group
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Compare positive outcomes across protected groups.
            </p>
          </div>

          <div className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300">
            Live Data
          </div>
        </div>

        <div className="mt-8 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupData}
              margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => `${value}%`}
                contentStyle={{
                  background: '#020617',
                  border: '1px solid #1e293b',
                  color: '#fff',
                  borderRadius: '12px',
                }}
                cursor={{ fill: 'rgba(56,189,248,0.08)' }}
              />
              <Bar
                dataKey="value"
                radius={[8, 8, 0, 0]}
                fill="#38bdf8"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-6 shadow-xl shadow-black/20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Overall Score
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            Fairness Overview
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Balance between fairness and risk exposure.
          </p>
        </div>

        <div className="mt-6 flex h-60 items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={pieColors[index]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-3">
          {pieData.map((entry, index) => (
            <div
              key={entry.name}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: pieColors[index] }}
                />
                <span className="text-sm text-slate-300">
                  {entry.name}
                </span>
              </div>

              <span className="text-sm font-semibold text-white">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BiasChart;