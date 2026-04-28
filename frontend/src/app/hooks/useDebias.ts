import { useState } from 'react';
import { api, DebiasResult } from '../services/api';

export function useDebias() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebiasResult | null>(null);

  const runDebias = async (datasetId: string, strategy?: string) => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runDebias(datasetId, strategy);
      setResult(res);
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Debiasing failed');
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return { runDebias, running, error, result };
}
