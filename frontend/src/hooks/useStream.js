import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAudit } from '../services/api';

export function useStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState(null);
  const [stage, setStage] = useState('waiting');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const sourceRef = useRef(null);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  const connect = useCallback((jobId) => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setData(null);
    setStage('waiting');
    setProgress(0);
    setMessage('Connecting to audit stream...');

    disconnect();

    return new Promise((resolve, reject) => {
      const source = streamAudit(jobId, {
        onOpen: () => {
          setMessage('Audit stream connected.');
        },
        onEvent: (event) => {
          setStage(event?.stage || 'running');
          setProgress(Number(event?.progress || 0));
          setMessage(event?.message || 'Processing audit...');

          if (event?.error) {
            const nextError = String(event.error);
            setError(nextError);
            setLoading(false);
            disconnect();
            reject(new Error(nextError));
            return;
          }

          if (event?.done) {
            const result = event?.result || event;
            setData(result);
            setSuccess(true);
            setLoading(false);
            disconnect();
            resolve(result);
          }
        },
        onError: (streamError) => {
          const nextError = streamError instanceof Error ? streamError.message : String(streamError);
          setError(nextError);
          setLoading(false);
          disconnect();
          reject(new Error(nextError));
        },
      });

      sourceRef.current = source;
    });
  }, [disconnect]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connect,
    disconnect,
    loading,
    error,
    success,
    data,
    stage,
    progress,
    message,
  };
}
