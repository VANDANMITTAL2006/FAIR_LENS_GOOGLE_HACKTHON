import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUpload } from '../hooks/useUpload';
import { useAudit } from '../hooks/useAudit';
import { useStream } from '../hooks/useStream';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ProgressBar } from '../components/ProgressBar';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

export function UploadPage() {
  const navigate = useNavigate();
  const { upload, uploading, metadata } = useUpload();
  const { runAudit, running } = useAudit();
  const { progress, stage, message, status, startStream } = useStream();
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await upload(file);
  };

  const handleStartAudit = async () => {
    if (!metadata || selectedAttributes.length === 0) return;

    startStream(metadata.id);

    try {
      await runAudit(metadata.id, selectedAttributes);
      navigate('/analysis', { state: { datasetId: metadata.id } });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAttribute = (attr: string) => {
    setSelectedAttributes(prev =>
      prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr]
    );
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl text-zinc-100 mb-2">New Audit</h1>
        <p className="text-sm text-zinc-500">Upload dataset and configure audit parameters</p>
      </div>

      <Card className="p-8 border-zinc-800 bg-zinc-900/50">
        {!metadata ? (
          <div className="text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.parquet,.json"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center py-16 cursor-pointer hover:bg-zinc-800/50 rounded-lg transition-colors border-2 border-dashed border-zinc-700"
            >
              <Upload className="w-12 h-12 text-zinc-500 mb-4" />
              <p className="text-zinc-400 mb-2">
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-zinc-600">CSV, Parquet, or JSON</p>
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-black/30 rounded-lg border border-zinc-800">
              <FileText className="w-8 h-8 text-emerald-400" />
              <div className="flex-1">
                <h3 className="text-lg text-zinc-100 mb-1">{metadata.name}</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Rows:</span>
                    <span className="text-zinc-300 ml-2">{metadata.rows.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Columns:</span>
                    <span className="text-zinc-300 ml-2">{metadata.columns}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Target:</span>
                    <span className="text-zinc-300 ml-2">{metadata.target_column}</span>
                  </div>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-sm text-zinc-400 mb-3">Select Sensitive Attributes</h3>
              <div className="grid grid-cols-2 gap-3">
                {metadata.sensitive_attributes.map((attr) => (
                  <label
                    key={attr}
                    className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedAttributes.includes(attr)}
                      onCheckedChange={() => toggleAttribute(attr)}
                    />
                    <span className="text-sm text-zinc-300">{attr}</span>
                  </label>
                ))}
              </div>
            </div>

            {status === 'running' && (
              <ProgressBar progress={progress} stage={stage} message={message} />
            )}

            <Button
              onClick={handleStartAudit}
              disabled={selectedAttributes.length === 0 || running || status === 'running'}
              className="w-full"
            >
              {running || status === 'running' ? 'Running Audit...' : 'Start Audit'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
