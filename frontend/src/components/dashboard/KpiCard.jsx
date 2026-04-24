import { Icon } from '@iconify/react';
import { Card } from '../ui/Card';

export default function KpiCard({ label, value, delta, icon, tone = 'neutral' }) {
  const toneStyles = {
    neutral: 'text-on-surface',
    good: 'text-[#4ade80]',
    warn: 'text-[#fbbf24]',
    bad: 'text-error',
  };

  return (
    <Card className="p-5 glass-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-on-surface">{value}</div>
          {delta ? (
            <div className={`mt-2 text-xs font-semibold ${toneStyles[tone] || toneStyles.neutral}`}>
              {delta}
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className="h-10 w-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-200">
            <Icon icon={icon} className="text-xl" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

