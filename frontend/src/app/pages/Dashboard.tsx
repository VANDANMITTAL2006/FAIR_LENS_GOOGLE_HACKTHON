import { useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { api, AuditHistory } from '../services/api';

export function Dashboard() {
  const [history, setHistory] = useState<AuditHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const latestAudit = history[0];

  const columns = [
    { key: 'dataset_name', label: 'Dataset' },
    {
      key: 'created_at',
      label: 'Created',
      render: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => <StatusBadge status={val as any} />
    },
    {
      key: 'metrics_summary',
      label: 'DP Score',
      render: (val: any) => <span className="text-zinc-300">{val.demographic_parity.toFixed(3)}</span>
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-zinc-100 mb-2">Dashboard</h1>
          <p className="text-sm text-zinc-500">Overview of your fairness audits</p>
        </div>
        <Link to="/upload">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Audit
          </Button>
        </Link>
      </div>

      {latestAudit && (
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            title="Demographic Parity"
            value={latestAudit.metrics_summary.demographic_parity}
            format="decimal"
            threshold={{ good: 0.9, warning: 0.7 }}
            subtitle="Latest audit"
          />
          <MetricCard
            title="Equalized Odds"
            value={latestAudit.metrics_summary.equalized_odds}
            format="decimal"
            threshold={{ good: 0.9, warning: 0.7 }}
            subtitle="Latest audit"
          />
          <MetricCard
            title="Disparate Impact"
            value={latestAudit.metrics_summary.disparate_impact}
            format="ratio"
            threshold={{ good: 0.8, warning: 0.6 }}
            subtitle="Latest audit"
          />
          <MetricCard
            title="Total Audits"
            value={history.length}
            format="decimal"
            subtitle="All time"
          />
        </div>
      )}

      <div>
        <h2 className="text-xl text-zinc-100 mb-4">Recent Audits</h2>
        <DataTable columns={columns} data={history} />
      </div>
    </div>
  );
}
