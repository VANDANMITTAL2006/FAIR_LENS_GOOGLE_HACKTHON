import { useMemo, useState } from 'react';
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/sections/Hero";
import { Upload } from "./components/sections/Upload";
import { Overview } from "./components/sections/Overview";
import { RiskSignals } from "./components/sections/RiskSignals";
import { Analysis } from "./components/sections/Analysis";
import { Explainability } from "./components/sections/Explainability";
import { DebiasLab } from "./components/sections/DebiasLab";
import { Counterfactual } from "./components/sections/Counterfactual";
import { Compliance } from "./components/sections/Compliance";
import { History } from "./components/sections/History";
import { Footer } from "./components/sections/Footer";
import { extractData, extractUploadId } from "../services/api";
import { useUpload } from "../hooks/useUpload";
import { useAudit } from "../hooks/useAudit";
import { useDebias } from "../hooks/useDebias";
import { useStream } from "../hooks/useStream";
import { useFairLensState } from "./state/FairLensContext";

function pickLabelColumn(columns: string[]) {
  const preferred = ['y_true', 'outcome', 'income_binary', 'two_year_recid', 'action_taken', 'approved'];
  return columns.find((col) => preferred.includes(col)) || columns[columns.length - 1];
}

function pickProtectedColumn(columns: string[], protectedAttributes: string[]) {
  if (protectedAttributes.length > 0) {
    return protectedAttributes[0];
  }
  const fallback = ['sex', 'gender', 'race', 'age', 'applicant_sex', 'applicant_race_1'];
  return columns.find((col) => fallback.includes(col.toLowerCase()));
}

export default function App() {
  const {
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
  } = useFairLensState();

  const uploadState = useUpload();
  const auditState = useAudit();
  const streamState = useStream();
  const debiasState = useDebias();

  const debiasStrategies = Array.isArray(debiasResult?.strategies) ? debiasResult.strategies : [];
  const selectedStrategy = debiasStrategies.find((strategy: any) => strategy.id === appliedStrategyId) || null;

  const metricsFromAudit = selectedStrategy?.fairness_after
    ? {
        ...(auditResult?.metrics || {}),
        disparate_impact_ratio: selectedStrategy.fairness_after.disparate_impact ?? auditResult?.metrics?.disparate_impact_ratio,
        demographic_parity_difference: selectedStrategy.fairness_after.demographic_parity_diff ?? auditResult?.metrics?.demographic_parity_difference,
      }
    : auditResult?.metrics;

  const enrichedAuditData = auditResult
    ? {
        ...auditResult,
        metrics: metricsFromAudit,
      }
    : null;

  const handleFileSelect = (nextFile: File) => {
    setFile(nextFile);
    setUploadData(null);
    setUploadId('');
    setAuditResult(null);
    setDebiasResult(null);
    setAppliedStrategyId('');
    setPipeline({
      status: 'idle',
      message: 'File selected. Ready to run audit.',
      progress: 0,
      error: '',
    });
  };

  const runPipeline = async () => {
    if (!file) {
      setPipeline((previous) => ({ ...previous, status: 'error', error: 'Please select a dataset file first.' }));
      return;
    }

    setPipeline({
      status: 'uploading',
      message: 'Uploading dataset...',
      progress: 20,
      error: '',
    });

    try {
      const uploadRes = await uploadState.upload(file);
      const meta = extractData(uploadRes) || uploadRes;
      setUploadData(meta);

      const uploadId = extractUploadId(uploadRes);
      if (!uploadId) {
        throw new Error('Upload completed but upload_id is missing.');
      }
      setUploadId(uploadId);

      setPipeline((previous) => ({
        ...previous,
        status: 'analyzing',
        message: 'Starting async audit...',
        progress: 35,
      }));

      let auditResult: any = null;

      try {
        const { jobId } = await auditState.start({ dataset_id: uploadId });
        if (jobId) {
          auditResult = await streamState.connect(jobId);
        }
      } catch {
        auditResult = null;
      }

      if (!auditResult) {
        setPipeline((previous) => ({
          ...previous,
          status: 'analyzing',
          message: 'Async stream unavailable. Running direct audit...',
          progress: 55,
        }));
        auditResult = await auditState.runDirect({ dataset_id: uploadId });
      }

      if (auditResult?.status === 'failed') {
        throw new Error(auditResult?.warnings?.[0] || 'Audit failed.');
      }

      setAuditResult(auditResult);
      auditState.setResult(auditResult);

      const columns = meta?.columns || [];
      const protectedAttributes = meta?.protected_attributes || [];
      const labelColumn = pickLabelColumn(columns);
      const protectedColumn = pickProtectedColumn(columns, protectedAttributes);

      if (labelColumn && protectedColumn) {
        setPipeline((previous) => ({
          ...previous,
          status: 'analyzing',
          message: 'Computing debias strategies...',
          progress: Math.max(previous.progress, 80),
        }));
        try {
          const debiasResult = await debiasState.execute({
            file,
            dataset_id: uploadId,
            label_column: labelColumn,
            protected_column: protectedColumn,
            privileged_group: '1',
          });
          setDebiasResult(debiasResult);
          const recommended = debiasResult?.recommended;
          if (recommended) {
            setAppliedStrategyId(recommended);
          }
        } catch (debiasErr) {
          setDebiasResult(null);
          setPipeline((previous) => ({
            ...previous,
            error: debiasErr instanceof Error ? debiasErr.message : String(debiasErr),
          }));
        }
      }

      setPipeline({
        status: 'completed',
        message: 'Audit complete.',
        progress: 100,
        error: '',
      });
    } catch (pipelineErr) {
      setPipeline({
        status: 'error',
        message: 'Pipeline failed.',
        progress: 100,
        error: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr),
      });
    }
  };

  const applyStrategy = (strategyId: string) => {
    setAppliedStrategyId(strategyId);
  };

  const downloadReport = () => {
    const reportPayload = {
      generated_from: 'audit_result',
      upload_id: uploadId || null,
      upload_meta: uploadData || null,
      status: enrichedAuditData?.status || 'unknown',
      warnings: enrichedAuditData?.warnings || [],
      component_status: enrichedAuditData?.component_status || {},
      metrics: enrichedAuditData?.metrics || {},
      regulatory_flags: enrichedAuditData?.regulatory_flags || [],
      debias: debiasResult || null,
    };
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fairlens_report_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pipelineProgress = useMemo(() => {
    if (pipeline.status === 'analyzing' && streamState.progress > 0) {
      return streamState.progress;
    }
    return pipeline.progress;
  }, [pipeline.status, pipeline.progress, streamState.progress]);

  const mergedError = pipeline.error || uploadState.error || auditState.error || streamState.error || debiasState.error;

  return (
    <div className="dark min-h-screen scroll-smooth bg-zinc-950 text-zinc-100 antialiased">
      <Navbar />
      <main>
        <Hero />
        <Upload
          fileName={file?.name || ''}
          status={pipeline.status}
          statusMessage={streamState.loading ? streamState.message : pipeline.message}
          progress={pipelineProgress}
          uploadMeta={uploadData}
          onFileSelect={handleFileSelect}
          onRunPipeline={runPipeline}
          error={mergedError}
        />
        <Overview auditData={enrichedAuditData} />
        <RiskSignals auditData={enrichedAuditData} />
        <Analysis auditData={enrichedAuditData} />
        <Explainability auditData={enrichedAuditData} />
        <DebiasLab
          strategies={debiasStrategies}
          appliedStrategyId={appliedStrategyId}
          onApplyStrategy={applyStrategy}
          error={debiasState.error}
        />
        <Counterfactual auditData={enrichedAuditData} />
        <Compliance
          onDownload={downloadReport}
          auditData={enrichedAuditData}
        />
        <History />
      </main>
      <Footer />
    </div>
  );
}
