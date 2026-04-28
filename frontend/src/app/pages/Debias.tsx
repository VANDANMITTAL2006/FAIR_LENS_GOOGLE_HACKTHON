import { useEffect, useState } from 'react';
import { useDebias } from '../hooks/useDebias';
import { StrategyCard } from '../components/StrategyCard';
import { MetricCard } from '../components/MetricCard';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { DebiasStrategy } from '../services/api';

export function Debias() {
  const { runDebias, running, result } = useDebias();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    runDebias('mock-dataset-id').catch(console.error);
  }, [runDebias]);

  const strategies = result?.strategies || [];

  if (running && !result) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading strategies...</div>
      </div>
    );
  }

  const handleApplyStrategy = async () => {
    if (!selectedStrategy) return;
    setShowComparison(false);
    await runDebias('mock-dataset-id', selectedStrategy);
    setShowComparison(true);
  };

  const beforeMetrics = {
    demographic_parity: 0.82,
    equalized_odds: 0.75,
    disparate_impact: 0.68,
  };

  const afterMetrics = selectedStrategy
    ? {
        demographic_parity: beforeMetrics.demographic_parity + (strategies.find(s => s.id === selectedStrategy)?.improvement.demographic_parity || 0),
        equalized_odds: beforeMetrics.equalized_odds + (strategies.find(s => s.id === selectedStrategy)?.improvement.equalized_odds || 0),
        disparate_impact: beforeMetrics.disparate_impact + (strategies.find(s => s.id === selectedStrategy)?.improvement.disparate_impact || 0),
      }
    : beforeMetrics;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-zinc-100 mb-2">Debias Lab</h1>
          <p className="text-sm text-zinc-500">Apply debiasing strategies and compare results</p>
        </div>
        {selectedStrategy && !showComparison && (
          <Button onClick={handleApplyStrategy} disabled={running}>
            {running ? 'Applying...' : 'Apply & Compare'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {showComparison ? (
        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="comparison">Before vs After</TabsTrigger>
            <TabsTrigger value="strategies">All Strategies</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl text-zinc-100">Impact Analysis</h2>
              <Button variant="outline" onClick={() => setShowComparison(false)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Another Strategy
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 border-zinc-800 bg-zinc-900/50">
                <h3 className="text-lg text-zinc-400 mb-6">Before</h3>
                <div className="space-y-4">
                  <MetricCard
                    title="Demographic Parity"
                    value={beforeMetrics.demographic_parity}
                    format="decimal"
                    threshold={{ good: 0.9, warning: 0.7 }}
                  />
                  <MetricCard
                    title="Equalized Odds"
                    value={beforeMetrics.equalized_odds}
                    format="decimal"
                    threshold={{ good: 0.9, warning: 0.7 }}
                  />
                  <MetricCard
                    title="Disparate Impact"
                    value={beforeMetrics.disparate_impact}
                    format="ratio"
                    threshold={{ good: 0.8, warning: 0.6 }}
                  />
                </div>
              </Card>

              <Card className="p-6 border-emerald-500/30 bg-emerald-500/5">
                <h3 className="text-lg text-emerald-400 mb-6">After</h3>
                <div className="space-y-4">
                  <MetricCard
                    title="Demographic Parity"
                    value={afterMetrics.demographic_parity}
                    format="decimal"
                    threshold={{ good: 0.9, warning: 0.7 }}
                    trend={(afterMetrics.demographic_parity - beforeMetrics.demographic_parity) / beforeMetrics.demographic_parity}
                  />
                  <MetricCard
                    title="Equalized Odds"
                    value={afterMetrics.equalized_odds}
                    format="decimal"
                    threshold={{ good: 0.9, warning: 0.7 }}
                    trend={(afterMetrics.equalized_odds - beforeMetrics.equalized_odds) / beforeMetrics.equalized_odds}
                  />
                  <MetricCard
                    title="Disparate Impact"
                    value={afterMetrics.disparate_impact}
                    format="ratio"
                    threshold={{ good: 0.8, warning: 0.6 }}
                    trend={(afterMetrics.disparate_impact - beforeMetrics.disparate_impact) / beforeMetrics.disparate_impact}
                  />
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies">
            <div className="grid grid-cols-3 gap-6">
              {strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  selected={selectedStrategy === strategy.id}
                  onSelect={() => setSelectedStrategy(strategy.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              selected={selectedStrategy === strategy.id}
              onSelect={() => setSelectedStrategy(strategy.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
