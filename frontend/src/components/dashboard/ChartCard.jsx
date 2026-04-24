import { Icon } from '@iconify/react';
import { Card, CardHeader } from '../ui/Card';

export default function ChartCard({ title, subtitle, right, className = '' }) {
  return (
    <Card className={`p-5 ${className}`}>
      <CardHeader title={title} subtitle={subtitle} right={right} />
      <div className="mt-4">
        <div className="h-[180px] w-full rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden relative">
          {/* Placeholder “enterprise” chart surface */}
          <svg viewBox="0 0 600 180" className="w-full h-full opacity-90">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="1" stopColor="rgba(255,255,255,0.02)" />
              </linearGradient>
              <linearGradient id="line" x1="0" x2="1">
                <stop offset="0" stopColor="rgba(251,191,36,0.7)" />
                <stop offset="1" stopColor="rgba(248,113,113,0.75)" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="600" height="180" fill="url(#g1)" />
            {/* grid */}
            {Array.from({ length: 10 }).map((_, i) => (
              <line
                key={i}
                x1={(i * 600) / 10}
                y1="0"
                x2={(i * 600) / 10}
                y2="180"
                stroke="rgba(255,255,255,0.04)"
              />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={(i * 180) / 6}
                x2="600"
                y2={(i * 180) / 6}
                stroke="rgba(255,255,255,0.04)"
              />
            ))}
            {/* line */}
            <path
              d="M 10 140 C 80 90, 140 120, 210 80 C 280 35, 330 55, 390 70 C 460 90, 500 50, 590 40"
              fill="none"
              stroke="url(#line)"
              strokeWidth="3"
            />
            <path
              d="M 10 140 C 80 90, 140 120, 210 80 C 280 35, 330 55, 390 70 C 460 90, 500 50, 590 40 L 590 180 L 10 180 Z"
              fill="rgba(248,113,113,0.08)"
            />
          </svg>

          <div className="absolute top-3 right-3 flex items-center gap-2 text-[11px] text-slate-500">
            <Icon icon="material-symbols:timeline" className="text-base" />
            <span>Last 24h</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Max gap</div>
            <div className="mt-1 text-sm font-semibold text-on-surface">4.7%</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Top cohort</div>
            <div className="mt-1 text-sm font-semibold text-on-surface">Age 45–54</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Signal</div>
            <div className="mt-1 text-sm font-semibold text-on-surface">Elevated</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

