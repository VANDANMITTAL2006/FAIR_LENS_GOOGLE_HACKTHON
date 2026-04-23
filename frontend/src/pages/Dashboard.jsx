import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

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
import { Upload } from 'lucide-react';
import DebiasSection from '../components/DebiasSection';

function Dashboard({ hasData, onDataChange }) {
  const fileInputRef = useRef(null);
  const [dataset, setDataset] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [appliedStrategy, setAppliedStrategy] = useState('None');
  const [adjustedMetrics, setAdjustedMetrics] = useState(null);
  ({
  score: 0,
  genderGap: 0,
  raceGap: 0,
});

  const hasDataset = !!dataset?.length;

const strategies = [
  {
    id: 'reweighting',
    title: 'Reweighting',
    description: 'Balances underrepresented groups by adjusting training weights.',
    bestUseCase: 'Large demographic gaps',
    gain: '+18%',
    cost: 'Low',
    confidence: 92,
  },
  {
    id: 'thresholds',
    title: 'Threshold Adjustment',
    description: 'Uses separate decision thresholds for fairness parity.',
    bestUseCase: 'Prediction imbalance',
    gain: '+12%',
    cost: 'Medium',
    confidence: 84,
  },
  {
    id: 'feature-removal',
    title: 'Feature Removal',
    description: 'Removes proxy attributes causing indirect bias.',
    bestUseCase: 'Sensitive proxy detection',
    gain: '+9%',
    cost: 'Low',
    confidence: 79,
  },
];
 const metrics = useMemo(() => {
  if (!hasDataset) {
    return {
      genderGap: 0,
      raceGap: 0,
      score: 0,
      risk: "No dataset loaded",
    };
  }

  const genderGap = calculateGenderGap(dataset);
  const raceGap = calculateRaceGap(dataset);
  const score = calculateFairnessScore(genderGap, raceGap);
  const risk = calculateRiskStatus(score);

  return { genderGap, raceGap, score, risk };
}, [dataset, hasDataset]);

const displayMetrics = adjustedMetrics || metrics;

  const dataStats = useMemo(() => {
  if (!hasDataset) {
    return {
      missingLabels: 0,
      correlatedProxy: 0,
      sampleSize: 0,
    };
  }

  const total = dataset.length;

  let missing = 0;

  dataset.forEach((row) => {
    const values = Object.values(row);
    values.forEach((v) => {
      if (
  v === '' ||
  v === null ||
  v === undefined ||
  String(v).toLowerCase() === 'na' ||
  String(v).toLowerCase() === 'n/a' ||
  String(v).toLowerCase() === 'null' ||
  String(v).toLowerCase() === 'unknown'
) {
  missing++;
}
    });
  });

  const totalCells = total * Object.keys(dataset[0]).length;

  const missingLabels = ((missing / totalCells) * 100).toFixed(1);

  const correlatedProxy = Math.min(
    100,
    Math.abs(metrics.genderGap || 0) + Math.abs(metrics.raceGap || 0)
  ).toFixed(1);

  const sampleSize = total;

  return {
    missingLabels,
    correlatedProxy,
    sampleSize,
  };
}, [dataset, hasDataset, metrics]);
 

  const timelineData = useMemo(() => {
  if (!hasDataset) return [];

  const base = metrics.score > 0 ? metrics.score : 72;

  return [
    { time: 'Week 1', fairness: base - 15 },
    { time: 'Week 2', fairness: base - 10 },
    { time: 'Week 3', fairness: base - 5 },
    { time: 'Week 4', fairness: base },
  ];
}, [hasDataset, metrics.score]);
const batchData = useMemo(() => {
  if (!hasDataset) return [];

  const approvals = calculateApprovalRates(dataset);

  return [
    { name: 'Male', value: approvals.maleRate || 0 },
    { name: 'Female', value: approvals.femaleRate || 0 },
    { name: 'White', value: approvals.whiteRate || 0 },
    { name: 'Non-White', value: approvals.nonWhiteRate || 0 },
  ];
}, [dataset, hasDataset]);
  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };
 const handleApplyStrategy = (id) => {
  const names = {
    reweighting: 'Reweighting',
    thresholds: 'Threshold Adjustment',
    'feature-removal': 'Feature Removal',
  };

  setAppliedStrategy(names[id]);

  let updated = { ...metrics };

  if (id === 'reweighting') {
    updated.genderGap = Math.max(0, metrics.genderGap - 8);
    updated.raceGap = Math.max(0, metrics.raceGap - 6);
  }

  if (id === 'thresholds') {
    updated.score = Math.min(100, metrics.score + 10);
  }

  if (id === 'feature-removal') {
    updated.genderGap = Math.max(0, metrics.genderGap - 4);
    updated.raceGap = Math.max(0, metrics.raceGap - 4);
    updated.score = Math.min(100, metrics.score + 6);
  }
const calculateFairnessScore = (genderGap, raceGap) => {
  const avgGap = (genderGap + raceGap) / 2;
  const score = Math.max(0, 100 - avgGap * 3);
  return Math.round(score);
};
  updated.risk = calculateRiskStatus(updated.score);

  setAdjustedMetrics(updated);

  showToast(`${names[id]} applied successfully`);
};

 const handleFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setLoading(true);
  setFileName(file.name);

  try {
    const formData = new FormData();
    formData.append("file", file);

    // 1. Upload dataset
    const uploadRes = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadRes.json();
    console.log("UPLOAD:", uploadData);

    // 2. Run audit
    const auditRes = await fetch(
  "http://127.0.0.1:8000/audit?use_cache=true&dataset=uploaded_file",
  {
    method: "POST",
  }
);
    const auditData = await auditRes.json();
    console.log("AUDIT:", auditData);

    // 3. Save data to UI
    setDataset(uploadData.rows || [{}]);

    setAdjustedMetrics({
  genderGap:
    Math.abs(auditData.metrics?.demographic_parity_difference ?? 0) * 100,

  raceGap:
    Math.abs(auditData.metrics?.equalized_odds_difference ?? 0) * 100,

  score:
    Math.max(
      0,
      100 -
        (
          Math.abs(auditData.metrics?.demographic_parity_difference ?? 0) * 50 +
          Math.abs(auditData.metrics?.equalized_odds_difference ?? 0) * 50
        )
    ),

  risk: auditData.risk_level ?? "Analyzed",
});

    onDataChange?.(true);
    showToast("Dataset uploaded and analyzed");

  } catch (error) {
    console.error(error);
    showToast("Backend connection failed");
  } finally {
    setLoading(false);
  }
};
  

  const handleUploadClick = () => fileInputRef.current?.click();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-12">
      <motion.section
        id="dashboard"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid gap-6 lg:grid-cols-[1fr_0.85fr]"
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">System Health</p>
          <h1 className="text-5xl font-bold text-white tracking-tight">Monitoring uploaded dataset and model fairness.</h1>
          <p className="max-w-2xl text-slate-400 leading-8">
            Analyze your dataset for demographic parity, bias signals, and fairness drift with enterprise-grade intelligence.
          </p>
        </div>
        

        <div className="rounded-3xl border border-slate-700/60 bg-slate-950/80 p-6 overflow hidden shadow-glow-lg shadow-cyan-500/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Global Health Metric</p>
              <p className="mt-3 text-5xl font-bold text-white">
  {hasDataset ? `${displayMetrics.score}%` : '--'}
</p>
            </div>
            <div className="rounded-3xl bg-slate-900/70 px-4 overflow hidden py-3 text-sm text-slate-300 border border-slate-700/50">
              <p className="text-slate-400 text-xs uppercase tracking-[0.3em]">Current Status</p>
              <p className="mt-2 text-lg font-semibold text-white">
  {hasDataset ? metrics.risk : 'No dataset loaded'}
</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
              <span>Bias Sensitivity</span>
              <span className="text-slate-200">Confidence 38%</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white">
  {hasDataset ? metrics.risk : 'No dataset loaded'}
</p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <StatusBadge label="Data drift" status="warning" />
            <StatusBadge label="Parity issues" status="critical" />
            <StatusBadge label="Audit ready" status="info" />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="grid gap-6">
          <SectionCard title="Upload dataset" subtitle={fileName || 'No file selected'}>
            <div id="datasets" className="space-y-6">
              <div className="rounded-3xl border border-slate-700/30 bg-slate-950/70 p-6 overflow hidden text-center">
                <Upload className="mx-auto h-10 w-10 text-cyan-400" />
                <p className="mt-4 text-lg font-semibold text-white">Drag & drop or browse CSV / JSON</p>
                <p className="mt-2 text-sm text-slate-400">
                  The dataset is analyzed locally and all metrics update live.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 overflow-hidden text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all"
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDataset(null);
                    setFileName('');
                    onDataChange?.(false);
                    showToast('Dataset reset');
                  }}
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/70 px-5 py-3 overflow-hidden text-sm font-semibold text-slate-200 hover:border-slate-500 transition-colors"
                >
                  Reset Dataset
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Dataset Integrity" subtitle="Issue summary and quality checks">
              <div className="space-y-5">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Missing Labels</span>
                    <p>{hasDataset ? `${dataStats.missingLabels}%` : "--"}</p>
                  </div>
                
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Correlated Proxy</span>
                    <p>{hasDataset ? `${dataStats.correlatedProxy}%` : "--"}</p>
                  </div>
                  
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
  <span>Sample Size</span>
  <span className="shrink-0 font-medium">
    {hasDataset ? dataStats.sampleSize : "--"}
  </span>
</div>
                  </div>
                  <ProgressBar value={hasDataset ? 100 : 0} color="emerald" size="sm" />
                </div>
                <button className="w-full rounded-2xl border border-cyan-500/30 px-4 py-3 overflow-hidden text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10 transition-colors">
                  View Datasheet
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Detection Timeline" subtitle="Audit events over time">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hasDataset ? timelineData : []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                    <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 12 }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="fairness" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#22d3ee' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="space-y-6">
          {hasDataset ? (
  <div className="space-y-4">
    <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-red-300">Critical Risk</p>
          <p className="mt-2 text-xl font-semibold text-white">Gender Bias</p>
        </div>
        <span className="truncate text-right max-w-[120px]">
  {displayMetrics.genderGap}%
</span>
      </div>
    </div>
  </div>
) : (
  <div className="rounded-3xl border border-slate-700/40 bg-slate-900/70 p-6 overflow-hidden text-center text-slate-400">
    Upload a dataset to view alerts
  </div>
)}

          <SectionCard title="Model Comparison" subtitle="Approval rate distribution">
            <div id="models" className="h-[320px]">
              {hasDataset ? (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={batchData}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
      <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 12 }} />
      <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
      <Tooltip
        contentStyle={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 12,
        }}
        itemStyle={{ color: '#fff' }}
      />
      <Bar dataKey="value" fill="#22d3ee" radius={[10, 10, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
) : (
  <div className="flex h-full items-center justify-center text-slate-500">
    No chart data available
  </div>
)}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 md: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SectionCard title="Fairness Metrics" subtitle="Live operational indicators">
          <div id="reports" className="space-y-4">
            <MetricCard
              title="Gender Bias Gap"
              value={hasDataset ? `+${Number(displayMetrics?.genderGap || 0).toFixed(2)}%` : '—'}
              helper="Trending divergence across protected gender groups."
              accent="from-rose-500 to-pink-500"
              trend="up"
            />
            <MetricCard
              title="Race Bias Gap"
              value={hasDataset ? `+${Number(displayMetrics?.raceGap || 0).toFixed(2)}%` : '—'}
              helper="Difference between White and Non-White outcomes."
              accent="from-violet-500 to-indigo-500"
              trend="up"
            />
            <MetricCard
              title="Fairness Score"
              value={hasDataset ? `+${displayMetrics.score}%` : '—'}
              helper="Calculated from demographic disparity metrics."
              accent="from-cyan-500 to-blue-600"
              trend={displayMetrics.score >= 70 ? 'down' : 'up'}
            />
          </div>
          <div className="mt-8">
  
</div>
         

        </SectionCard>

        <SectionCard title="Latest Risk Actions" subtitle="Recommended remediation next steps">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-700/40 bg-slate-900/80 p-4 overflow-hidden">
              <p className="text-sm text-slate-400">1. Remove sensitive proxy features</p>
              <p className="mt-2 font-semibold text-white">Feature: zip_code</p>
            </div>
            <div className="rounded-3xl border border-slate-700/40 bg-slate-900/80 p-4 overflow-hidden">
              <p className="text-sm text-slate-400">2. Calibrate decision thresholds</p>
              <p className="mt-2 font-semibold text-white">Model threshold adjustment recommended</p>
            </div>
            <button className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 overflow-hidden text-sm font-semibold text-white hover:shadow-xl hover:shadow-cyan-500/20 transition-all">
              Review Remediation
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Dataset Snapshot" subtitle="Live summary from upload">
          <div className="space-y-4 text-slate-300">
            <div className="flex items-center justify-between">
              <span>Records analyzed</span>
              <span>{dataset?.length ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Protected groups</span>
              <span>{hasDataset ? 'income' : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Target column</span>
              <span>{hasDataset ? 'income' : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Parsed file</span>
              <span>{fileName || 'none'}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-1/2 bottom-6 z-50 w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-5 py-4 overflow-hidden text-sm text-slate-100 shadow-2xl shadow-slate-950/25"
        >
          {toast}
        </motion.div>
      )}
      <div className="mt-8 w-full">
  <DebiasSection
    strategies={strategies}
    onApply={handleApplyStrategy}
    appliedStrategy={appliedStrategy}
    hasFile={hasDataset}
    metrics={[
      { id: 'gender', value: `${displayMetrics.genderGap}%` },
      { id: 'race', value: `${displayMetrics.raceGap}%` },
      { id: 'fairness', value: `${displayMetrics.score}/100` },
    ]}
  />
</div>
    </div>
  );
}
export default Dashboard;