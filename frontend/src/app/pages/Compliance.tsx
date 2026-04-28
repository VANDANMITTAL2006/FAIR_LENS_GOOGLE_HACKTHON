import { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import { Download, FileText } from 'lucide-react';
import { api, ComplianceReport } from '../services/api';

export function Compliance() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReport('mock-dataset-id')
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.dataset_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !report) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-500">Loading report...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-zinc-100 mb-2">Compliance Report</h1>
          <p className="text-sm text-zinc-500">
            Generated on {new Date(report.generated_at).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card className="p-8 border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/30">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl text-zinc-100 mb-1">Overall Compliance Score</h2>
            <p className="text-sm text-zinc-500">Based on regulatory standards and best practices</p>
          </div>
          <div className="text-right">
            <div className="text-4xl text-blue-400">{report.compliance_score}</div>
            <div className="text-xs text-zinc-500">/ 100</div>
          </div>
        </div>

        <div className="space-y-6">
          {report.sections.map((section, idx) => (
            <div key={idx} className="p-6 rounded-lg bg-black/30 border border-zinc-800">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg text-zinc-100">{section.title}</h3>
                <StatusBadge status={section.status} />
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 border-zinc-800 bg-zinc-900/50">
        <h3 className="text-lg text-zinc-100 mb-4">Recommendations</h3>
        <ul className="space-y-3">
          {report.recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
              <span className="text-sm text-zinc-400">{rec}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
