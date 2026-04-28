import { useCallback, useState } from 'react';
import { extractData, runAudit, startAuditAsync } from '../services/api';

export function useAudit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);
  const [jobId, setJobId] = useState(null);

  const runDirect = useCallback(async (payload) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await runAudit(payload);
      const normalized = extractData(response) || response;
      setData(normalized);
      setSuccess(true);
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async (payload) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setJobId(null);

    try {
      const response = await startAuditAsync(payload);
      const normalized = extractData(response) || response;
      const nextJobId = normalized?.job_id || null;
      if (!nextJobId) {
        throw new Error('Backend did not return job_id for async audit.');
      }
      setData(normalized);
      setJobId(nextJobId);
      setSuccess(true);
      return { jobId: nextJobId, response: normalized };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setResult = useCallback((result) => {
    setData(result);
    setSuccess(true);
    setError('');
  }, []);

  return {
    start,
    runDirect,
    setResult,
    loading,
    error,
    success,
    data,
    jobId,
  };
}
