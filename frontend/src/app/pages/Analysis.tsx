import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { MetricCard } from '../components/MetricCard';
import { Card } from '../components/ui/card';
import { StatusBadge } from '../components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { FairnessMetrics } from '../services/api';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export function Analysis() {
  const location = useLocation();
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);

  useEffect(() => {
    const datasetId = location.state?.datasetId || 'mock-dataset-id';

    const mockMetrics: FairnessMetrics = {
      demographic_parity: 0.82,
      equalized_odds: 0.75,
      disparate_impact: 0.68,
      group_metrics: {
        'Male': { tpr: 0.85, fpr: 0.12, precision: 0.88, recall: 0.85 },
        'Female': { tpr: 0.72, fpr: 0.18, precision: 0.79, recall: 0.72 },
        'Non-binary': { tpr: 0.68, fpr: 0.22, precision: 0.74, recall: 0.68 },
      },
      shap_values: {
        'credit_score': [0.45, 0.42, 0.38, 0.35, 0.32],
        'income': [0.38, 0.35, 0.29, 0.25, 0.22],
        'employment_status': [0.25, 0.23, 0.21, 0.19, 0.16],
        'education': [0.18, 0.16, 0.14, 0.12, 0.11],
        'age': [0.12, 0.11, 0.10, 0.09, 0.08],
      },
      counterfactuals: [
        {
          original: { age: 25, income: 45000, credit_score: 620, loan_approved: 0 },
          counterfactual: { age: 25, income: 52000, credit_score: 680, loan_approved: 1 },
          distance: 0.15,
        },
        {
          original: { age: 32, income: 38000, credit_score: 590, loan_approved: 0 },
          counterfactual: { age: 32, income: 48000, credit_score: 650, loan_approved: 1 },
          distance: 0.21,
        },
        {
          original: { age: 41, income: 65000, credit_score: 710, loan_approved: 0 },
          counterfactual: { age: 41, income: 65000, credit_score: 740, loan_approved: 1 },
          distance: 0.08,
        },
      ],
      component_status: {
        shap: 'success',
        counterfactual: 'success',
      },
      warnings: ['High disparity detected in Non-binary group', 'Disparate impact below regulatory threshold'],
    };
    setMetrics(mockMetrics);
  }, [location]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading analysis...</div>
      </div>
    );
  }

  const groupData = Object.entries(metrics.group_metrics).map(([group, vals]) => ({
    group,
    ...vals,
  }));

  const radarData = Object.entries(metrics.group_metrics).flatMap(([group, vals]) =>
    Object.entries(vals).map(([metric, value]) => ({
      group,
      metric,
      value,
    }))
  ).reduce((acc, { metric, group, value }) => {
    const existing = acc.find(d => d.metric === metric);
    if (existing) {
      existing[group] = value;
    } else {
      acc.push({ metric, [group]: value });
    }
    return acc;
  }, [] as any[]);

  const shapData = Object.entries(metrics.shap_values || {}).map(([feature, values]) => ({
    feature,
    importance: values.reduce((a, b) => a + Math.abs(b), 0) / values.length,
  })).sort((a, b) => b.importance - a.importance);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl text-zinc-100 mb-2">Analysis</h1>
        <p className="text-sm text-zinc-500">Comprehensive fairness metrics and insights</p>
      </div>

      {metrics.warnings && metrics.warnings.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            {metrics.warnings.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-6">
        <MetricCard
          title="Demographic Parity"
          value={metrics.demographic_parity}
          format="decimal"
          threshold={{ good: 0.9, warning: 0.7 }}
        />
        <MetricCard
          title="Equalized Odds"
          value={metrics.equalized_odds}
          format="decimal"
          threshold={{ good: 0.9, warning: 0.7 }}
        />
        <MetricCard
          title="Disparate Impact"
          value={metrics.disparate_impact}
          format="ratio"
          threshold={{ good: 0.8, warning: 0.6 }}
        />
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="groups">Group Comparison</TabsTrigger>
          <TabsTrigger value="shap">Feature Importance</TabsTrigger>
          <TabsTrigger value="counterfactual">Counterfactuals</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-6">
          <Card className="p-6 border-zinc-800 bg-zinc-900/50">
            <h3 className="text-lg text-zinc-100 mb-6">Performance by Group</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={groupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="group" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Bar dataKey="tpr" fill="#10b981" name="TPR" />
                <Bar dataKey="fpr" fill="#ef4444" name="FPR" />
                <Bar dataKey="precision" fill="#3b82f6" name="Precision" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 border-zinc-800 bg-zinc-900/50">
            <h3 className="text-lg text-zinc-100 mb-6">Metric Radar</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="metric" stroke="#71717a" />
                <PolarRadiusAxis stroke="#71717a" />
                {Object.keys(metrics.group_metrics).map((group, idx) => (
                  <Radar
                    key={group}
                    name={group}
                    dataKey={group}
                    stroke={['#10b981', '#3b82f6', '#f59e0b'][idx]}
                    fill={['#10b981', '#3b82f6', '#f59e0b'][idx]}
                    fillOpacity={0.2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="shap">
          <Card className="p-6 border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-zinc-100">SHAP Feature Importance</h3>
              <StatusBadge status={metrics.component_status.shap} />
            </div>
            {metrics.component_status.shap === 'success' ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={shapData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" stroke="#71717a" />
                  <YAxis type="category" dataKey="feature" stroke="#71717a" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  />
                  <Bar dataKey="importance" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                SHAP analysis unavailable
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="counterfactual">
          <Card className="p-6 border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-zinc-100">Counterfactual Examples</h3>
              <StatusBadge status={metrics.component_status.counterfactual} />
            </div>
            {metrics.component_status.counterfactual === 'success' && metrics.counterfactuals ? (
              <div className="space-y-4">
                {metrics.counterfactuals.map((cf, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-black/30 border border-zinc-800">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm text-zinc-500 mb-2">Original</h4>
                        <div className="space-y-1">
                          {Object.entries(cf.original).map(([key, val]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-zinc-400">{key}:</span>
                              <span className="text-zinc-300">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm text-zinc-500 mb-2">Counterfactual</h4>
                        <div className="space-y-1">
                          {Object.entries(cf.counterfactual).map(([key, val]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-zinc-400">{key}:</span>
                              <span className={cf.original[key] !== val ? 'text-emerald-400' : 'text-zinc-300'}>
                                {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                      Distance: {cf.distance.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                Counterfactual analysis unavailable
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
