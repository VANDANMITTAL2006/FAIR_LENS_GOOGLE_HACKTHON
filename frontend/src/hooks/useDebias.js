import { useCallback, useState } from 'react';
import { extractData, runDebias } from '../services/api';

export function useDebias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);

  const execute = useCallback(async (payload) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await runDebias(payload);
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

  return {
    execute,
    loading,
    error,
    success,
    data,
  };
}
