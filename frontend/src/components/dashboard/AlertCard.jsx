import { Icon } from '@iconify/react';
import { Card } from '../ui/Card';

export default function AlertCard({ title, detail, severity = 'warning', right }) {
  const styles = {
    warning: {
      ring: 'border-white/10',
      icon: 'material-symbols:warning',
      badge: 'bg-white/[0.06] text-[#fbbf24] border border-white/10',
      glow: 'hover:shadow-[0_0_40px_rgba(251,191,36,0.08)]',
    },
    danger: {
      ring: 'border-white/10',
      icon: 'material-symbols:error',
      badge: 'bg-error-container/20 text-error border border-error/30',
      glow: 'hover:shadow-[0_0_40px_rgba(248,113,113,0.08)]',
    },
    info: {
      ring: 'border-white/10',
      icon: 'material-symbols:info',
      badge: 'bg-white/[0.06] text-slate-200 border border-white/10',
      glow: 'hover:shadow-[0_0_40px_rgba(255,255,255,0.06)]',
    },
    success: {
      ring: 'border-white/10',
      icon: 'material-symbols:check-circle',
      badge: 'bg-white/[0.06] text-[#4ade80] border border-white/10',
      glow: 'hover:shadow-[0_0_40px_rgba(74,222,128,0.08)]',
    },
  };

  const s = styles[severity] || styles.warning;

  return (
    <Card className={`p-5 glass-hover ${s.glow}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 h-9 w-9 rounded-2xl flex items-center justify-center ${s.badge}`}>
            <Icon icon={s.icon} className="text-lg" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-on-surface truncate">{title}</div>
            {detail ? <div className="mt-1 text-xs text-on-surface-variant">{detail}</div> : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </Card>
  );
}

