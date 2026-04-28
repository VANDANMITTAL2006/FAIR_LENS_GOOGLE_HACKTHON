import { createContext, useContext, useMemo, useState } from 'react';

type PipelineStatus = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';

interface PipelineState {
  status: PipelineStatus;
  message: string;
  progress: number;
  error: string;
}

interface FairLensState {
  file: File | null;
  setFile: (file: File | null) => void;
  uploadData: any;
  setUploadData: (value: any) => void;
  uploadId: string;
  setUploadId: (value: string) => void;
  auditResult: any;
  setAuditResult: (value: any) => void;
  debiasResult: any;
  setDebiasResult: (value: any) => void;
  appliedStrategyId: string;
  setAppliedStrategyId: (value: string) => void;
  pipeline: PipelineState;
  setPipeline: (value: PipelineState | ((previous: PipelineState) => PipelineState)) => void;
}

const initialPipelineState: PipelineState = {
  status: 'idle',
  message: 'Awaiting dataset upload',
  progress: 0,
  error: '',
};

const FairLensContext = createContext<FairLensState | undefined>(undefined);

export function FairLensProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<any>(null);
  const [uploadId, setUploadId] = useState('');
  const [auditResult, setAuditResult] = useState<any>(null);
  const [debiasResult, setDebiasResult] = useState<any>(null);
  const [appliedStrategyId, setAppliedStrategyId] = useState('');
  const [pipeline, setPipeline] = useState<PipelineState>(initialPipelineState);

  const value = useMemo(
    () => ({
      file,
      setFile,
      uploadData,
      setUploadData,
      uploadId,
      setUploadId,
      auditResult,
      setAuditResult,
      debiasResult,
      setDebiasResult,
      appliedStrategyId,
      setAppliedStrategyId,
      pipeline,
      setPipeline,
    }),
    [file, uploadData, uploadId, auditResult, debiasResult, appliedStrategyId, pipeline],
  );

  return <FairLensContext.Provider value={value}>{children}</FairLensContext.Provider>;
}

export function useFairLensState() {
  const context = useContext(FairLensContext);
  if (!context) {
    throw new Error('useFairLensState must be used within FairLensProvider');
  }
  return context;
}
