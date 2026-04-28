import { Badge } from './ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'running' | 'completed' | 'warning' | 'pass' | 'fail';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = {
    success: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', text: 'Success' },
    completed: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', text: 'Completed' },
    pass: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', text: 'Pass' },
    failed: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/30', text: 'Failed' },
    fail: { icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/30', text: 'Fail' },
    pending: { icon: Clock, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', text: 'Pending' },
    running: { icon: Clock, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', text: 'Running' },
    warning: { icon: AlertCircle, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', text: 'Warning' },
  };

  const { icon: Icon, color, text } = config[status];

  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1.5 px-2 py-1`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label || text}</span>
    </Badge>
  );
}
