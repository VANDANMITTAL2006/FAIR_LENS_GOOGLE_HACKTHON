import { useState, useCallback } from 'react';
import { api, StreamEvent } from '../services/api';

export function useStream() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');

  const startStream = useCallback((datasetId: string) => {
    setStatus('running');
    const cleanup = api.streamAudit(datasetId, (event: StreamEvent) => {
      setProgress(event.progress);
      setStage(event.stage);
      setMessage(event.message);
      if (event.status === 'completed') {
        setStatus('completed');
      } else if (event.status === 'error') {
        setStatus('error');
      }
    });

    return cleanup;
  }, []);

  return { progress, stage, message, status, startStream };
}
