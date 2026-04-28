import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import html2pdf from 'html2pdf.js';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  parseDataset,
  calculateGenderGap,
  calculateRaceGap,
  calculateFairnessScore,
  calculateRiskStatus,
  calculateApprovalRates,
} from '../utils/fairness';
import SectionCard from '../components/ui/SectionCard';
import MetricCard from '../components/ui/MetricCard';
import ChartCard from '../components/ui/ChartCard';
import ProgressBar from '../components/ui/ProgressBar';
import StatusBadge from '../components/ui/StatusBadge';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, BarChart3, Shield, Activity, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import DebiasSection from '../components/DebiasSection';
import CounterfactualDemo from '../components/CounterfactualDemo';
import ShapPanel from '../components/ShapPanel';
import UploadCard from '../components/UploadCard';
import MetricsGrid from '../components/MetricsGrid';
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
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(false);

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

    // Parse CSV to get sample data for counterfactual demo
    Papa.parse(nextFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.slice(0, 10); // Take first 10 rows for demo
        setDataset(rows);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setDataset(null);
      }
    });
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
  useEffect(() => {
  const handler = () => downloadReport();
  window.addEventListener("fairlens-export", handler);
  return () => window.removeEventListener("fairlens-export", handler);
}, []);

  /* ─── Apply Strategy (updates metrics from fairness_after) ─── */
  const applyStrategy = (strategy) => {
    setAppliedStrategy(strategy.title || strategy.name || strategy.id);
    const after = strategy.fairness_after || strategy.raw?.fairness_after;
    if (after) {
      setAuditData(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          disparate_impact_ratio: after.disparate_impact ?? prev.metrics.disparate_impact_ratio,
          demographic_parity_difference: after.demographic_parity_diff ?? prev.metrics.demographic_parity_difference,
        },
        risk_level: ((after.disparate_impact ?? 1) >= 0.8) ? 'Low' : 'High',
      }));
    }
  };

  /* ─── Download Compliance Report (PDF) ─── */
  const downloadReport = () => {
    const now = new Date().toLocaleString();
    const riskColor = metrics.risk?.toLowerCase().includes('high') ? '#dc2626' : '#10b981';
    
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; background: white; color: #333;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #6366f1; padding-bottom: 20px;">
          <h1 style="margin: 0; color: #6366f1; font-size: 28px;">FAIRLENS</h1>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">AI Fairness Compliance Report</p>
        </div>

        <div style="margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; width: 30%;">Generated</td>
              <td style="padding: 8px;">${now}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px; font-weight: bold;">Dataset</td>
              <td style="padding: 8px;">${fileName || 'uploaded_file'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Records Analyzed</td>
              <td style="padding: 8px;">${uploadMeta?.rows?.toLocaleString() ?? '—'}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px; font-weight: bold;">Risk Level</td>
              <td style="padding: 8px; color: ${riskColor}; font-weight: bold;">${metrics.risk}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Applied Strategy</td>
              <td style="padding: 8px;">${appliedStrategy}</td>
            </tr>
          </table>
        </div>

        <h2 style="color: #6366f1; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Fairness Metrics</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background: #6366f1; color: white;">
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Metric</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Value</th>
            <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Status</th>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; border: 1px solid #ddd;">Disparate Impact Ratio</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.di.toFixed(3)}</td>
            <td style="padding: 12px; border: 1px solid #ddd; color: ${metrics.di < 0.8 ? '#dc2626' : '#10b981'}; font-weight: bold;">
              ${metrics.di < 0.8 ? '❌ Below 0.800 threshold' : '✓ Within acceptable range'}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">Demographic Parity Diff</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.dp.toFixed(1)}%</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.dp < 10 ? '✓ Good' : '⚠ Needs attention'}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; border: 1px solid #ddd;">Equalized Odds Diff</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.eo.toFixed(1)}%</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.eo < 10 ? '✓ Good' : '⚠ Needs attention'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">Predictive Parity Diff</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.pp.toFixed(1)}%</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${metrics.pp < 10 ? '✓ Good' : '⚠ Needs attention'}</td>
          </tr>
        </table>

        <h2 style="color: #6366f1; font-size: 18px; margin-bottom: 15px;">Protected Attributes</h2>
        <p style="margin-bottom: 20px;">
          ${detectedAttributes.length > 0
            ? detectedAttributes.map(a => `<strong>•</strong> ${a}`).join('<br/>')
            : 'No protected attributes detected'
          }
        </p>

        <h2 style="color: #6366f1; font-size: 18px; margin-bottom: 15px;">Regulatory Compliance</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          ${(auditData?.regulatory_flags || []).length === 0
            ? '<p>✓ No regulatory violations detected</p>'
            : (auditData?.regulatory_flags || []).map(
                f => `<p>⚠ ${typeof f === 'string' ? f : f.clause || JSON.stringify(f)}</p>`
              ).join('')
          }
        </div>

        <h2 style="color: #6366f1; font-size: 18px; margin-bottom: 15px;">Feature Attribution (Top Signals)</h2>
        ${(auditData?.top_shap_features || []).length === 0
          ? '<p>No attribution data available</p>'
          : `
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #6366f1; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Feature</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Impact</th>
              </tr>
              ${(auditData?.top_shap_features || []).map((f, i) => `
                <tr style="${i % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                  <td style="padding: 12px; border: 1px solid #ddd;">${f.feature || 'Unknown'}</td>
                  <td style="padding: 12px; border: 1px solid #ddd;">${f.impact || 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
          `
        }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
          <p>Generated by FairLens AI Fairness Auditor</p>
          <p>CONFIDENTIAL — For Compliance Use Only</p>
        </div>
      </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = html;

    const opt = {
      margin: 10,
      filename: `fairlens_report_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  };


  /* ─── Render ─── */
  return (
  <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

    {/* Hero */}
    <section id="dashboard" className="space-y-4">
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
        System Health
      </p>

      <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
        Monitoring uploaded dataset
        <br />
        and model fairness.
      </h1>

      <p className="max-w-3xl text-slate-400 leading-8">
        Analyze your dataset for demographic parity, bias signals, and fairness drift with enterprise-grade intelligence.
      </p>
    </section>

    
    {/* Upload + Snapshot */}
    <section id="datasets">
  <div className="grid gap-6 lg:grid-cols-2">

    <UploadCard
      fileName={fileName}
      hasFile={hasFile}
      progress={pipelineStatus === STATUS.ANALYZING ? 70 : 0}
      analyzing={
        pipelineStatus === STATUS.UPLOADING ||
        pipelineStatus === STATUS.ANALYZING
      }
      onFileSelect={(selectedFile) =>
        handleFileChange({ target: { files: [selectedFile] } })
      }
      onAnalyze={runPipeline}
      onClear={resetState}
    />

    <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Dataset Snapshot
      </p>

      <h3 className="mt-2 text-2xl font-bold text-white">
        Live Summary
      </h3>

      <div className="mt-8 space-y-5">
        <SnapshotRow
          label="Rows"
          value={uploadMeta?.rows?.toLocaleString() || "—"}
        />

        <SnapshotRow
          label="Columns"
          value={uploadMeta?.columns?.length || "—"}
        />

        <SnapshotRow
          label="Protected Attributes"
          value={detectedAttributes.length || "—"}
        />

        <SnapshotRow
          label="Risk Level"
          value={metrics.risk}
          valueClass={riskColor(metrics.risk)}
        />
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
  <div className="flex items-center justify-between text-sm text-slate-400">
    <span>System Confidence</span>
    <span className="text-white font-medium">
      {metrics.fairnessScore}%
    </span>
  </div>

  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
    <div
      className="h-full rounded-full bg-cyan-400 transition-all duration-700"
      style={{ width: `${metrics.fairnessScore}%` }}
    />
  </div>

  <p className="mt-3 text-sm text-slate-400">
    Confidence based on fairness consistency and detected bias risk.
  </p>
</div>

  </div>
</section>
    

    {/* Metrics */}
    <section id="models">
    <MetricsGrid
      metrics={[
        {
          id: "gender",
          title: "Gender Gap",
          value: `${metrics.dp.toFixed(1)}%`,
          status: metrics.dp > 10 ? "critical" : "healthy",
        },
        {
          id: "race",
          title: "Race Gap",
          value: `${metrics.eo.toFixed(1)}%`,
          status: metrics.eo > 10 ? "critical" : "healthy",
        },
        {
          id: "fairness",
          title: "Fairness Score",
          value: `${metrics.fairnessScore}/100`,
          status: metrics.fairnessScore < 70 ? "warning" : "healthy",
        },
        {
          id: "impact",
          title: "Disparate Impact",
          value: metrics.di.toFixed(3),
          status: metrics.di < 0.8 ? "critical" : "healthy",
        },
      ]}
    />
    </section>
    <CounterfactualDemo auditData={auditData} />

    {/* SHAP */}
    <section id="reports">
    {hasResults && auditData?.top_shap_features?.length > 0 && (
      <ShapPanel shapData={auditData.top_shap_features} />
    )}
</section>

    {/* Debias */}
    <DebiasSection
      strategies={debiasStrategies}
      onApply={applyStrategy}
      appliedStrategy={appliedStrategy}
      metrics={[
        { id: "gender", value: metrics.dp },
        { id: "race", value: metrics.eo },
        { id: "fairness", value: `${metrics.fairnessScore}/100` },
      ]}
      hasFile={hasFile}
    />
    

    {/* Error */}
    {error && (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </div>
    )}

    {/* Footer */}
    <footer className="pt-8 text-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600">
        Advanced AI Fairness Auditor • 2025
      </p>
    </footer>
    </div>
);
}
  

/* ─── Refined Sub-Components ─── */
function SnapshotRow({ label, value, valueClass = 'text-gray-300' }) {
  return (
  <div className="flex items-center justify-between group py-1">
    <span className="text-base text-gray-400 group-hover:text-gray-300 transition-colors">
      {label}
    </span>

    <span className={`text-base font-semibold ${valueClass} tabular-nums`}>
      {value}
    </span>
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
          <ArrowUpRight size={14} />
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