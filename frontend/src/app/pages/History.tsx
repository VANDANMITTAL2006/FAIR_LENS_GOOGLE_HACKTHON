import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import { api, AuditHistory } from '../services/api';
import { Eye } from 'lucide-react';
import { Button } from '../components/ui/button';

export function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AuditHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'dataset_name',
      label: 'Dataset',
      render: (val: string) => <span className="text-zinc-100">{val}</span>
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val: string) => new Date(val).toLocaleString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => <StatusBadge status={val as any} />
    },
    {
      key: 'metrics_summary',
      label: 'Metrics',
      render: (val: any) => (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            DP: {val.demographic_parity.toFixed(2)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            EO: {val.equalized_odds.toFixed(2)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            DI: {val.disparate_impact.toFixed(2)}
          </Badge>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: AuditHistory) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/analysis', { state: { datasetId: row.id } })}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl text-zinc-100 mb-2">Audit History</h1>
        <p className="text-sm text-zinc-500">All previous fairness audits</p>
      </div>

      <DataTable
        columns={columns}
        data={history}
      />
    </div>
  );
}
