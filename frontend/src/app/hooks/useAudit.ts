import { useState } from 'react';
import { api, FairnessMetrics } from '../services/api';

export function useAudit() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);

  const runAudit = async (datasetId: string, sensitiveAttributes: string[]) => {
    setRunning(true);
    setError(null);
    try {
      const result = await api.runAudit(datasetId, sensitiveAttributes);
      setMetrics(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return { runAudit, running, error, metrics };
}
