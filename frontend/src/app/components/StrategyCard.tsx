import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DebiasStrategy } from '../services/api';

interface StrategyCardProps {
  strategy: DebiasStrategy;
  selected?: boolean;
  onSelect: () => void;
}

export function StrategyCard({ strategy, selected, onSelect }: StrategyCardProps) {
  const typeColors = {
    preprocessing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    inprocessing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    postprocessing: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <Card className={`p-6 border transition-all ${selected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg text-zinc-100">{strategy.name}</h3>
            {selected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <Badge className={typeColors[strategy.type]} variant="outline">
            {strategy.type}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-6">{strategy.description}</p>

      <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-black/30 border border-zinc-800">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Demographic Parity</div>
          <div className="text-sm text-emerald-400">+{(strategy.improvement.demographic_parity * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Equalized Odds</div>
          <div className="text-sm text-emerald-400">+{(strategy.improvement.equalized_odds * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Disparate Impact</div>
          <div className="text-sm text-emerald-400">+{(strategy.improvement.disparate_impact * 100).toFixed(1)}%</div>
        </div>
      </div>

      <Button
        onClick={onSelect}
        variant={selected ? 'default' : 'outline'}
        className="w-full"
      >
        {selected ? 'Selected' : 'Apply Strategy'}
        {!selected && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </Card>
  );
}
