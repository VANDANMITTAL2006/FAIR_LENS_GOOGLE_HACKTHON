import { Progress } from './ui/progress';

interface ProgressBarProps {
  progress: number;
  stage?: string;
  message?: string;
}

export function ProgressBar({ progress, stage, message }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{stage || 'Processing'}</span>
        <span className="text-zinc-500">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
