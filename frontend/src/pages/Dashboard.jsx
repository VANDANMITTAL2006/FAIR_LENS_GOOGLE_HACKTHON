import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, BarChart3, Shield, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { runAudit, runDebias, uploadFile, extractUploadId } from '../services/api';

/* ─── Constants ─── */
const MAX_ATTRIBUTES = 3;

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

const STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  COMPLETED: 'completed',
  ERROR: 'error',
};

/* ─── Helpers ─── */
function riskColor(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('high') || l.includes('critical')) return 'text-red-400';
  if (l.includes('medium')) return 'text-amber-400';
  if (l.includes('low')) return 'text-emerald-400';
  return 'text-slate-400';
}

function riskBg(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('high') || l.includes('critical')) return 'bg-red-500/10 border-red-500/20';
  if (l.includes('medium')) return 'bg-amber-500/10 border-amber-500/20';
  if (l.includes('low')) return 'bg-emerald-500/10 border-emerald-500/20';
  return 'bg-slate-500/10 border-slate-500/20';
}

function statusLabel(status) {
  const map = {
    [STATUS.IDLE]: 'Ready',
    [STATUS.UPLOADING]: 'Uploading',
    [STATUS.ANALYZING]: 'Analyzing',
    [STATUS.COMPLETED]: 'Completed',
    [STATUS.ERROR]: 'Error',
  };
  return map[status] || 'Ready';
}

function statusDotColor(status) {
  const map = {
    [STATUS.IDLE]: 'bg-slate-400',
    [STATUS.UPLOADING]: 'bg-blue-400 animate-pulse',
    [STATUS.ANALYZING]: 'bg-amber-400 animate-pulse',
    [STATUS.COMPLETED]: 'bg-emerald-400',
    [STATUS.ERROR]: 'bg-red-400',
  };
  return map[status] || 'bg-slate-400';
}

/* ─── Dashboard ─── */
function Dashboard() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadMeta, setUploadMeta] = useState(null);
  const [auditData, setAuditData] = useState(EMPTY_AUDIT);
  const [debiasStrategies, setDebiasStrategies] = useState([]);
  const [appliedStrategy, setAppliedStrategy] = useState('None');
  const [pipelineStatus, setPipelineStatus] = useState(STATUS.IDLE);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedAttributes, setDetectedAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);

  const hasFile = !!file;
  const hasResults = auditData !== EMPTY_AUDIT && pipelineStatus === STATUS.COMPLETED;

  const metrics = useMemo(() => {
    const m = auditData?.metrics || EMPTY_AUDIT.metrics;
    const dp = Math.abs(Number(m.demographic_parity_difference || 0)) * 100;
    const eo = Math.abs(Number(m.equalized_odds_difference || 0)) * 100;
    const pp = Math.abs(Number(m.predictive_parity_diff || 0)) * 100;
    const di = Number(m.disparate_impact_ratio || 1);
    const fairnessScore = Math.max(0, Math.round(100 - (dp + eo) / 2));
    return { dp, eo, pp, di, fairnessScore, risk: auditData?.risk_level || 'Unknown' };
  }, [auditData]);

  /* ─── Handlers ─── */
  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setFileName(nextFile.name);
    setError('');
    setPipelineStatus(STATUS.IDLE);
    setDetectedAttributes([]);
    setSelectedAttributes([]);
  };

  const toggleAttribute = (attr) => {
    setSelectedAttributes((prev) => {
      if (prev.includes(attr)) return prev.filter((a) => a !== attr);
      if (prev.length >= MAX_ATTRIBUTES) return prev;
      return [...prev, attr];
    });
  };

  const removeAttribute = (attr) => {
    setSelectedAttributes((prev) => prev.filter((a) => a !== attr));
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const runPipeline = async () => {
    if (!file) {
      setError('Select a CSV file before running analysis.');
      return;
    }

    setPipelineStatus(STATUS.UPLOADING);
    setError('');
    setStatusMessage('Uploading dataset...');

    try {
      const uploadRes = await uploadFile(file);
      const meta = uploadRes?.data || uploadRes;
      setUploadMeta(meta);

      // Populate detected attributes and auto-select top 3
      const detected = meta?.protected_attributes || [];
      setDetectedAttributes(detected);
      const autoSelected = detected.slice(0, MAX_ATTRIBUTES);
      setSelectedAttributes(autoSelected);

      const uploadId = extractUploadId(uploadRes);
      if (!uploadId) {
        throw new Error('Upload completed but dataset identifier is missing.');
      }

      // Validate attribute selection
      const safeAttributes = autoSelected.slice(0, MAX_ATTRIBUTES);
      if (safeAttributes.length === 0) {
        console.warn('[FairLens] No protected attributes detected — audit will use backend defaults.');
      }

      setPipelineStatus(STATUS.ANALYZING);
      setStatusMessage('Running fairness analysis...');

      const auditRes = await runAudit(uploadId);
      console.log("AUDIT RESPONSE:", auditRes);

      if (auditRes?.status === 'failed') {
        throw new Error(auditRes?.warnings?.[0] || 'Analysis could not be completed.');
      }

      setAuditData(auditRes);

      // Attempt debiasing using first selected attribute
      const columns = meta?.columns || [];
      const labelCol =
        columns.find((col) => ['y_true', 'outcome', 'income_binary', 'two_year_recid', 'action_taken'].includes(col)) ||
        columns[columns.length - 1];
      const protectedCol = safeAttributes[0] ||
        columns.find((col) => ['sex', 'gender', 'race', 'age'].includes(col.toLowerCase()));

      if (labelCol && protectedCol) {
        setStatusMessage('Computing mitigation strategies...');
        try {
          const debiasRes = await runDebias({ file, labelCol, protectedCol, privilegedGroup: '1' });
          setDebiasStrategies(debiasRes?.strategies || []);
        } catch {
          setDebiasStrategies([]);
        }
      }

      setPipelineStatus(STATUS.COMPLETED);
      setStatusMessage('');
    } catch (err) {
      setError('We couldn\'t process this dataset. Please verify the format and try again.');
      setPipelineStatus(STATUS.ERROR);
      setStatusMessage('');
      console.error('[FairLens]', err);
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setUploadMeta(null);
    setAuditData(EMPTY_AUDIT);
    setDebiasStrategies([]);
    setAppliedStrategy('None');
    setPipelineStatus(STATUS.IDLE);
    setError('');
    setStatusMessage('');
    setDetectedAttributes([]);
    setSelectedAttributes([]);
  };

  /* ─── Render ─── */
  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">

      {/* ─── 1. Status Bar ─── */}
      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111827]/70 px-6 py-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${statusDotColor(pipelineStatus)} shadow-sm`} />
          <span className="text-sm font-medium text-gray-300 tracking-tight">
            {statusLabel(pipelineStatus)}
          </span>
          {statusMessage && (
            <span className="text-sm text-gray-500 font-normal ml-2 border-l border-white/10 pl-3">
              {statusMessage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasResults && (
            <span className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md border ${riskBg(metrics.risk)} ${riskColor(metrics.risk)}`}>
              Risk: {metrics.risk}
            </span>
          )}
          <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">FairLens v1.0</span>
        </div>
      </div>

      {/* ─── 2. Top Section: Upload + Overview Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upload Card */}
        <div className="group rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-lg transition-all duration-300 hover:border-white/10">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 shadow-inner group-hover:scale-110 transition-transform">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Dataset Audit</h2>
              <p className="text-sm text-gray-500">Upload CSV to begin fairness analysis</p>
            </div>
          </div>

          <div 
            className={`relative rounded-2xl border-2 border-dashed border-white/10 bg-black/20 p-10 text-center transition-all cursor-pointer hover:bg-black/30 hover:border-blue-500/30 ${fileName ? 'border-blue-500/20 bg-blue-500/5' : ''}`}
            onClick={handleUploadClick}
          >
            {fileName ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                  <FileText size={28} />
                </div>
                <div className="max-w-xs truncate">
                  <p className="text-sm font-medium text-white truncate">{fileName}</p>
                  <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ''} • Ready
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white/5 rounded-full text-gray-500">
                  <Upload size={32} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">No dataset selected</p>
                  <p className="text-xs text-gray-500 mt-1">Drag and drop or click to browse</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />

          {/* Attribute Selection (only if results exist) */}
          {detectedAttributes.length > 0 && pipelineStatus === STATUS.COMPLETED && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Protected Attributes</span>
                <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {selectedAttributes.length}/{MAX_ATTRIBUTES} Selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedAttributes.map((attr) => {
                  const isSelected = selectedAttributes.includes(attr);
                  const isDisabled = !isSelected && selectedAttributes.length >= MAX_ATTRIBUTES;
                  return (
                    <button
                      key={attr}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleAttribute(attr); }}
                      disabled={isDisabled}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all duration-200
                        ${isSelected
                          ? 'border-blue-500/50 bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                          : isDisabled
                            ? 'border-white/5 bg-white/2 opacity-30 cursor-not-allowed'
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white'}
                      `}
                    >
                      {attr}
                      {isSelected && <X size={12} className="opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); runPipeline(); }}
              disabled={!hasFile || pipelineStatus === STATUS.UPLOADING || pipelineStatus === STATUS.ANALYZING}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {(pipelineStatus === STATUS.UPLOADING || pipelineStatus === STATUS.ANALYZING) ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Run Analysis</span>
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>
            {hasResults && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); resetState(); }}
                className="p-3.5 rounded-xl border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all shadow-sm"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Errors */}
          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <div>
                <p className="text-sm text-red-200">{error}</p>
                <button type="button" onClick={runPipeline} className="mt-2 text-xs font-semibold text-red-400 hover:underline">
                  Retry pipeline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dataset Overview Card */}
        <div className="rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Dataset Snapshot</h3>
          </div>
          
          {uploadMeta ? (
            <div className="space-y-6">
              <SnapshotRow label="Row Count" value={uploadMeta?.rows?.toLocaleString() ?? '—'} />
              <SnapshotRow label="Feature Set" value={`${uploadMeta?.columns?.length ?? '—'} Columns`} />
              <SnapshotRow 
                label="Primary Constraint" 
                value={selectedAttributes[0] || '—'} 
                valueClass="text-blue-400 font-semibold"
              />
              <SnapshotRow 
                label="Risk Evaluation" 
                value={metrics.risk} 
                valueClass={riskColor(metrics.risk)} 
              />
              <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Warnings</p>
                  <p className="text-xl font-bold text-white">{auditData?.warnings?.length || 0}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Detections</p>
                  <p className="text-xl font-bold text-white">{detectedAttributes.length}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[calc(100%-3rem)] flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <BarChart3 size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-300">No data loaded</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[180px]">Upload a CSV to generate metadata snapshot</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. Bottom Section: Results ─── */}
      <AnimatePresence mode="wait">
        {hasResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Main Score Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Shield size={120} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                    <Shield size={40} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-1">Overall Trust Score</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white tracking-tighter">{metrics.fairnessScore}</span>
                      <span className="text-xl text-gray-600 font-medium">/100</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black uppercase tracking-tighter text-lg ${riskBg(metrics.risk)} ${riskColor(metrics.risk)}`}>
                    {metrics.risk} RISK
                  </div>
                  <p className="text-xs text-gray-500 max-w-[240px] text-right leading-relaxed">
                    Based on standard fairness benchmarks across {selectedAttributes.length} protected groups.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricTile
                label="Demographic Parity"
                value={`${metrics.dp.toFixed(1)}%`}
                helper="Selection rate difference"
                trend={metrics.dp > 5 ? 'up' : 'down'}
                severity={metrics.dp > 10 ? 'critical' : metrics.dp > 5 ? 'warning' : 'ok'}
              />
              <MetricTile
                label="Equalized Odds"
                value={`${metrics.eo.toFixed(1)}%`}
                helper="Error rate parity gap"
                trend={metrics.eo > 5 ? 'up' : 'down'}
                severity={metrics.eo > 10 ? 'critical' : metrics.eo > 5 ? 'warning' : 'ok'}
              />
              <MetricTile
                label="Predictive Parity"
                value={`${metrics.pp.toFixed(1)}%`}
                helper="Group precision variance"
                trend={metrics.pp > 5 ? 'up' : 'down'}
                severity={metrics.pp > 10 ? 'critical' : metrics.pp > 5 ? 'warning' : 'ok'}
              />
              <MetricTile
                label="Disparate Impact"
                value={metrics.di.toFixed(3)}
                helper="EEOC 80% Rule (0.800)"
                trend={metrics.di < 0.8 ? 'up' : 'down'}
                severity={metrics.di < 0.8 ? 'critical' : metrics.di < 0.9 ? 'warning' : 'ok'}
              />
            </div>

            {/* Explainer Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feature Impact */}
              <div className="rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-400" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Feature Attribution</h3>
                  </div>
                </div>
                {(auditData?.top_shap_features || []).length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-xl">
                    <p className="text-sm text-gray-600">No attribution signal detected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(auditData?.top_shap_features || []).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between group rounded-xl border border-white/5 bg-black/20 px-5 py-4 transition-all hover:bg-black/40 hover:border-white/10">
                        <span className="text-sm font-medium text-gray-300">{item.feature}</span>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500 rounded-full opacity-50" style={{ width: '60%' }} />
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-400">{item.impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compliance & Counterfactual */}
              <div className="rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-lg flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-8">Regulatory Context</h3>
                
                <div className="flex-1 space-y-6">
                  {(auditData?.regulatory_flags || []).length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">Compliant Profile</p>
                        <p className="text-xs text-emerald-600/80">No active regulatory risks flagged</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(auditData?.regulatory_flags || []).map((flag, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-sm text-amber-200/90 leading-relaxed">
                            {typeof flag === 'string' ? flag : flag.clause || JSON.stringify(flag)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {auditData?.counterfactual_data?.status === 'ok' && (
                    <div className="mt-auto pt-8 border-t border-white/5">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600 mb-4">Counterfactual Integrity Test</h4>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pivot</p>
                          <p className="text-xs font-bold text-white truncate">{auditData.counterfactual_data.attribute || '—'}</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Variance</p>
                          <p className={`text-xs font-bold ${(auditData.counterfactual_data.delta || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {(auditData.counterfactual_data.delta || 0) >= 0 ? '+' : ''}{Number(auditData.counterfactual_data.delta || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Mapping</p>
                          <p className="text-[10px] font-medium text-gray-400 truncate">{auditData.counterfactual_data.original_group || '—'} → {auditData.counterfactual_data.counterfactual_group || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mitigation Strategies */}
            {debiasStrategies.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-[#111827]/70 p-8 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Optimization Strategies</h3>
                    <p className="text-xs text-gray-600 mt-1">Recommended mitigation for detected bias vectors</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Strategy: {appliedStrategy}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {debiasStrategies.map((s) => (
                    <div key={s.id} className="relative group rounded-2xl border border-white/5 bg-black/30 p-6 transition-all hover:bg-black/50 hover:border-white/10 overflow-hidden">
                      <div className="absolute -right-4 -top-4 p-8 opacity-0 group-hover:opacity-5 transition-opacity">
                        <Activity size={60} />
                      </div>
                      <h4 className="text-base font-bold text-white">{s.title || s.name || s.id}</h4>
                      <p className="mt-3 text-xs text-gray-500 leading-relaxed min-h-[48px]">{s.description || 'Fairness improvement strategy'}</p>
                      
                      <div className="mt-6 flex flex-wrap gap-3">
                        {s.fairness_gain != null && (
                          <div className="px-2 py-1 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-400 border border-emerald-500/10">
                            +{(s.fairness_gain * 100).toFixed(1)}% Fairness
                          </div>
                        )}
                        {s.accuracy_loss != null && (
                          <div className="px-2 py-1 rounded bg-amber-500/10 text-[10px] font-bold text-amber-400 border border-amber-500/10">
                            -{(s.accuracy_loss * 100).toFixed(1)}% Loss
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setAppliedStrategy(s.title || s.name || s.id)}
                        className="mt-6 w-full py-2.5 rounded-xl bg-white/5 text-xs font-bold text-gray-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        Apply Strategy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-white/5 bg-[#111827]/40 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <BarChart3 size={32} className="text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">No analysis results yet</h3>
            <p className="text-sm text-gray-600 mt-2 max-w-sm">
              Upload a CSV dataset and click "Run Analysis" to generate comprehensive fairness metrics.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="pt-12 pb-6 text-center">
        <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.4em]">Advanced AI Fairness Auditor • 2025</p>
      </footer>
    </div>
  );
}

/* ─── Refined Sub-Components ─── */
function SnapshotRow({ label, value, valueClass = 'text-gray-300' }) {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">{label}</span>
      <span className={`text-sm font-medium ${valueClass} tabular-nums`}>{value}</span>
    </div>
  );
}

function MetricTile({ label, value, helper, trend, severity }) {
  const borderMap = {
    critical: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    ok: 'border-emerald-500/20 bg-emerald-500/5',
  };
  const valueColorMap = {
    critical: 'text-red-400',
    warning: 'text-amber-400',
    ok: 'text-emerald-400',
  };
  const glowMap = {
    critical: 'shadow-red-500/5',
    warning: 'shadow-amber-500/5',
    ok: 'shadow-emerald-500/5',
  };

  return (
    <div className={`group relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 shadow-xl ${borderMap[severity]} ${glowMap[severity]}`}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
        <div className={`p-1.5 rounded-lg bg-black/20 ${valueColorMap[severity]}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-black tracking-tighter ${valueColorMap[severity]}`}>{value}</span>
      </div>
      <p className="mt-3 text-[11px] text-gray-600 leading-relaxed font-medium">
        {helper}
      </p>
    </div>
  );
}

export default Dashboard;
