import { Card } from './ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  format?: 'percentage' | 'decimal' | 'ratio';
  threshold?: { good: number; warning: number };
  trend?: number;
  subtitle?: string;
}

export function MetricCard({ title, value, format = 'decimal', threshold, trend, subtitle }: MetricCardProps) {
  const formatValue = (val: number) => {
    if (format === 'percentage') return `${(val * 100).toFixed(1)}%`;
    if (format === 'ratio') return val.toFixed(2);
    return val.toFixed(3);
  };

  const getStatus = () => {
    if (!threshold) return 'neutral';
    if (value >= threshold.good) return 'good';
    if (value >= threshold.warning) return 'warning';
    return 'bad';
  };

  const status = getStatus();
  const statusColors = {
    good: 'border-emerald-500/50 bg-emerald-500/5',
    warning: 'border-amber-500/50 bg-amber-500/5',
    bad: 'border-red-500/50 bg-red-500/5',
    neutral: 'border-zinc-800 bg-zinc-900/50',
  };

  const valueColors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    bad: 'text-red-400',
    neutral: 'text-zinc-100',
  };

  return (
    <Card className={`p-6 border ${statusColors[status]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-zinc-400 mb-1">{title}</div>
          <div className={`text-3xl ${valueColors[status]} mb-1`}>{formatValue(value)}</div>
          {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : trend < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-500" />
            )}
            <span className={trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-zinc-500'}>
              {Math.abs(trend * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
