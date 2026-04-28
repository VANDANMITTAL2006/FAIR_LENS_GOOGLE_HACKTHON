import { useCallback, useState } from 'react';
import { extractData, uploadDataset } from '../services/api';

export function useUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);

  const upload = useCallback(async (file) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await uploadDataset(file);
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
    upload,
    loading,
    error,
    success,
    data,
  };
}
