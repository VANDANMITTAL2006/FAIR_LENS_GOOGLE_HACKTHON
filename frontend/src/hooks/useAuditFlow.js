import { useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE } from '../services/api';

/**
 * Enterprise Audit Execution Flow Hook
 * Correct Pipeline: UPLOAD (dataset_id) -> AUDIT (job_id) -> STREAM (SSE)
 */
export function useAuditFlow({ onComplete, onError } = {}) {
  const [status, setStatus] = useState('idle'); // idle | ready | uploading | initializing | streaming | success | error
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [datasetId, setDatasetId] = useState(null);
  const [jobId, setJobId] = useState(null);
  
  const eventSourceRef = useRef(null);

  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[SSE] Closing connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const runAudit = useCallback(async (selectedFile) => {
    console.log("RUN AUDIT STARTED");
    console.log("RECEIVED FILE:", selectedFile);

    if (!selectedFile) {
      console.error("selectedFile is null");
      return;
    }

    setStatus('uploading');
    setProgress(5);
    setMessage('Ingesting dataset to cluster...');
    setDatasetId(null);
    setJobId(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      console.log("Uploading file...");

      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();
      console.log("Upload response:", uploadData);

      const datasetId = uploadData?.data?.dataset_id;

      if (!datasetId) {
        throw new Error("dataset_id missing");
      }

      console.log("Running audit with:", datasetId);
      setDatasetId(datasetId);
      setJobId(datasetId);

      setStatus('initializing');
      setMessage('Provisioning audit job...');
      setProgress(50);

      const auditRes = await fetch(`${API_BASE}/audit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ dataset_id: datasetId })
      });

      const auditData = await auditRes.json();
      console.log("Audit result:", auditData);

      setStatus('success');
      setProgress(100);
      if (onComplete) onComplete(auditData);

    } catch (err) {
      console.error("Audit flow failed:", err);
      setStatus('error');
      setMessage(err.message);
      if (onError) onError(err.message);
    }
  }, [onComplete, onError]);

  // Clean up
  useEffect(() => {
    return () => closeStream();
  }, [closeStream]);

  return {
    runAudit,
    status,
    setStatus, // Expose setStatus so component can transition to 'ready'
    progress,
    message,
    jobId,
    datasetId,
    isIdle: status === 'idle',
    isReady: status === 'ready',
    isUploading: status === 'uploading',
    isInitializing: status === 'initializing',
    isStreaming: status === 'streaming',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}
