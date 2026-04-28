import { useState } from 'react';
import { api, DatasetMetadata } from '../services/api';

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await api.uploadDataset(file);
      setMetadata(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error, metadata };
}
