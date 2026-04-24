import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';

import SectionCard from '../components/ui/SectionCard';
import MetricCard from '../components/ui/MetricCard';
import DebiasSection from '../components/DebiasSection';
import CounterfactualCard from '../components/CounterfactualCard';
import { runAudit, runDebias, uploadFile, extractUploadId } from '../services/api';

const EMPTY_AUDIT = {
  metrics: {
    demographic_parity_difference: 0,
    equalized_odds_difference: 0,
    predictive_parity_diff: 0,
    disparate_impact_ratio: 1,
  },
  group_comparison: [],
  group_metrics: {},
  top_shap_features: [],
  counterfactual_data: {},
  regulatory_flags: [],
  risk_level: 'Unknown',
  warnings: [],
};

function Dashboard() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadMeta, setUploadMeta] = useState(null);
  const [auditData, setAuditData] = useState(EMPTY_AUDIT);
  const [debiasStrategies, setDebiasStrategies] = useState([]);
  const [appliedStrategy, setAppliedStrategy] = useState('None');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState('');

  const hasFile = !!file;

  const displayMetrics = useMemo(() => {
    const m = auditData?.metrics || EMPTY_AUDIT.metrics;
    const dp = Math.abs(Number(m.demographic_parity_difference || 0)) * 100;
    const eo = Math.abs(Number(m.equalized_odds_difference || 0)) * 100;
    const fairnessScore = Math.max(0, Math.round(100 - (dp + eo) / 2));
    return {
      genderGap: dp.toFixed(2),
      raceGap: eo.toFixed(2),
      score: fairnessScore,
      risk: auditData?.risk_level || 'Unknown',
      predictiveParity: Math.abs(Number(m.predictive_parity_diff || 0)) * 100,
      disparateImpact: Number(m.disparate_impact_ratio || 1),
    };
  }, [auditData]);

  const metricsForDebias = useMemo(
    () => [
      { id: 'gender', value: displayMetrics.genderGap },
      { id: 'race', value: displayMetrics.raceGap },
      { id: 'fairness', value: `${displayMetrics.score}/100` },
    ],
    [displayMetrics]
  );

  const resetState = () => {
    setFile(null);
    setFileName('');
    setUploadMeta(null);
    setAuditData(EMPTY_AUDIT);
    setDebiasStrategies([]);
    setAppliedStrategy('None');
    setError('');
    setLastAction('');
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    setFile(nextFile);
    setFileName(nextFile.name);
    setError('');
    setLastAction('File selected');
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const runUploadAndAudit = async () => {
    if (!file) {
      setError('Select a CSV file before running audit.');
      return;
    }

    setIsLoading(true);
    setError('');
    setLastAction('Uploading dataset');

    try {
      console.log('[FairLens] Starting upload. File object:', file, 'Name:', file?.name, 'Size:', file?.size);
      const uploadRes = await uploadFile(file);

      // Store metadata for the Dataset Snapshot panel
      const meta = uploadRes?.data || uploadRes;
      setUploadMeta(meta);

      // Defensively extract upload_id from any response shape
      const uploadId = extractUploadId(uploadRes);
      if (!uploadId) {
        console.error('[FairLens] upload_id missing. Full response:', uploadRes);
        throw new Error('Upload succeeded but upload_id is missing. Please retry upload.');
      }

      setLastAction('Running fairness audit');

      const auditRes = await runAudit(uploadId);
      console.log("AUDIT RESPONSE:", auditRes);

      if (auditRes?.status === 'failed') {
        throw new Error(auditRes?.warnings?.[0] || 'Audit failed to compute');
      }

      setAuditData(auditRes);
      setLastAction('Audit completed');

      const columns = meta?.columns || [];
      const labelCol =
        columns.find((col) => ['y_true', 'outcome', 'income_binary', 'two_year_recid', 'action_taken'].includes(col)) ||
        columns[columns.length - 1];
      const protectedCol =
        meta?.protected_attributes?.[0] ||
        columns.find((col) => ['sex', 'gender', 'race', 'age'].includes(col.toLowerCase()));

      if (labelCol && protectedCol) {
        setLastAction('Running debias strategies');
        const debiasRes = await runDebias({
          file,
          labelCol,
          protectedCol,
          privilegedGroup: '1',
        });
        setDebiasStrategies(debiasRes?.strategies || []);
      } else {
        setDebiasStrategies([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to complete fairness pipeline');
      setLastAction('Pipeline failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyStrategy = (strategyId) => {
    const picked = debiasStrategies.find((item) => item.id === strategyId);
    setAppliedStrategy(picked?.title || strategyId);
  };

  const retry = () => {
    if (file) {
      runUploadAndAudit();
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 pb-12 lg:p-8">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
      >
        <SectionCard title="Upload and Audit" subtitle={fileName || 'No file selected'}>
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700/40 bg-slate-950/80 p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-cyan-400" />
              <p className="mt-3 text-lg font-semibold text-white">Upload CSV and run end-to-end audit</p>
              <p className="mt-2 text-sm text-slate-400">Flow: upload -&gt; audit -&gt; debias, using real backend responses only.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleUploadClick}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Choose File
              </button>
              <button
                type="button"
                onClick={runUploadAndAudit}
                disabled={!hasFile || isLoading}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Analyze'}
              </button>
              <button
                type="button"
                onClick={resetState}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200"
              >
                Reset
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

            {isLoading && (
              <div className="space-y-2">
                <div className="h-3 animate-pulse rounded bg-slate-800" />
                <div className="h-3 animate-pulse rounded bg-slate-800" />
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{lastAction}</p>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="mt-3 rounded-lg border border-red-300/40 px-3 py-1 font-semibold"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Dataset Snapshot" subtitle="Live backend metadata">
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between"><span>Rows</span><span>{uploadMeta?.rows ?? '--'}</span></div>
            <div className="flex items-center justify-between"><span>Columns</span><span>{uploadMeta?.columns?.length ?? '--'}</span></div>
            <div className="flex items-center justify-between"><span>Protected attributes</span><span>{uploadMeta?.protected_attributes?.join(', ') || '--'}</span></div>
            <div className="flex items-center justify-between"><span>Risk level</span><span>{displayMetrics.risk}</span></div>
            <div className="flex items-center justify-between"><span>Warnings</span><span>{auditData?.warnings?.length || 0}</span></div>
          </div>
        </SectionCard>
      </motion.section>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Fairness Metrics" subtitle="Backend-computed (4 metrics)">
          <div className="space-y-4">
            <MetricCard
              title="Demographic Parity Gap"
              value={`${displayMetrics.genderGap}%`}
              helper="Absolute demographic parity difference"
              accent="from-rose-500 to-pink-500"
              trend="up"
            />
            <MetricCard
              title="Equalized Odds Gap"
              value={`${displayMetrics.raceGap}%`}
              helper="Absolute equalized odds difference"
              accent="from-violet-500 to-indigo-500"
              trend="up"
            />
            <MetricCard
              title="Predictive Parity Gap"
              value={`${displayMetrics.predictiveParity.toFixed(2)}%`}
              helper="Absolute predictive parity difference"
              accent="from-amber-500 to-orange-500"
              trend="up"
            />
            <MetricCard
              title="Disparate Impact Ratio"
              value={displayMetrics.disparateImpact.toFixed(3)}
              helper="EEOC threshold is 0.8"
              accent="from-cyan-500 to-blue-600"
              trend={displayMetrics.disparateImpact < 0.8 ? 'up' : 'down'}
            />
          </div>
        </SectionCard>

        <SectionCard title="Model Explainability" subtitle="Top feature impacts and compliance flags">
          <div className="space-y-4 text-sm text-slate-300">
            {(auditData?.top_shap_features || []).length === 0 ? (
              <p className="text-slate-400">No SHAP-style feature signal available for this dataset.</p>
            ) : (
              (auditData?.top_shap_features || []).map((item) => (
                <div key={item.feature} className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-900/70 p-3">
                  <span>{item.feature}</span>
                  <span>{item.impact}</span>
                </div>
              ))
            )}

            <div className="rounded-xl border border-slate-700/40 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Regulatory Flags</p>
              <p className="mt-2">{(auditData?.regulatory_flags || []).join(' | ') || 'No active flags'}</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <CounterfactualCard profile={auditData?.counterfactual_data} allRecords={[]} />

      <DebiasSection
        strategies={debiasStrategies}
        onApply={handleApplyStrategy}
        appliedStrategy={appliedStrategy}
        metrics={metricsForDebias}
        hasFile={hasFile && debiasStrategies.length > 0}
      />
    </div>
  );
}

export default Dashboard;
