const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.error || `Request failed (HTTP ${response.status})`;
    throw new Error(String(detail));
  }
  if (payload?.success === false) {
    throw new Error(payload?.error || payload?.detail || 'Request failed');
  }
  return payload;
}

export async function uploadFile(file) {
  if (!file || !(file instanceof Blob)) {
    throw new Error('No valid file provided');
  }
  const formData = new FormData();
  formData.append('file', file, file.name || 'upload.csv');
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await parseResponse(response);
  // Normalize response: backend may return { data: {...} } or raw {...}
  const result = data?.data || data;
  return result;
}

export function streamAudit(jobId, onEvent) {
  const url = `${API_BASE}/audit/stream/${jobId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
      if (data.done || data.error) {
        eventSource.close();
      }
    } catch {
      onEvent({ stage: 'parse_error', message: event.data, progress: -1 });
    }
  };

  eventSource.onerror = () => {
    onEvent({ stage: 'error', message: 'SSE connection error', progress: -1, done: true });
    eventSource.close();
  };

  return () => eventSource.close();
}

export async function runAudit(jobId) {
  const response = await fetch(`${API_BASE}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  });
  return parseResponse(response);
}

export async function getHealth() {
  const response = await fetch(`${API_BASE}/health`);
  return parseResponse(response);
}

export async function getJobs() {
  const response = await fetch(`${API_BASE}/jobs`);
  return parseResponse(response);
}

export async function getRuns(limit = 50) {
  const response = await fetch(`${API_BASE}/runs?limit=${encodeURIComponent(String(limit))}`);
  return parseResponse(response);
}

export async function getRun(runId) {
  const response = await fetch(`${API_BASE}/runs/${encodeURIComponent(String(runId))}`);
  return parseResponse(response);
}

export async function downloadReport(jobId) {
  const response = await fetch(`${API_BASE}/report/${jobId}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || body?.error || `Report failed (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fairlens-report-${jobId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export async function runDebias({ file, labelCol, protectedCol, privilegedGroup }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('label_col', labelCol);
  formData.append('protected_col', protectedCol);
  formData.append('privileged_group', privilegedGroup);

  const response = await fetch(`${API_BASE}/api/debias`, {
    method: 'POST',
    body: formData,
  });
  return parseResponse(response);
}

export function extractJobId(uploadRes) {
  return uploadRes?.job_id || uploadRes?.upload_id || null;
}

export const EMPTY_AUDIT = {
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

export function computeDisplayMetrics(auditData) {
  const m = auditData?.metrics || EMPTY_AUDIT.metrics;
  const dp = Math.abs(Number(m.demographic_parity_difference || 0)) * 100;
  const eo = Math.abs(Number(m.equalized_odds_difference || 0)) * 100;
  const fairnessScore = Math.max(0, Math.round(100 - (dp + eo) / 2));
  return {
    genderGap: dp.toFixed(1),
    raceGap: eo.toFixed(1),
    score: fairnessScore,
    risk: auditData?.risk_level || 'Unknown',
    predictiveParity: (Math.abs(Number(m.predictive_parity_diff || 0)) * 100).toFixed(1),
    disparateImpact: Number(m.disparate_impact_ratio || 1).toFixed(2),
    demographicParity: (Math.abs(Number(m.demographic_parity_difference || 0)) * 100).toFixed(1),
  };
}

export function getRegulatoryFlags(auditData) {
  const flags = auditData?.regulatory_flags || [];
  if (flags.length === 0 && auditData?.regulatory_violations) {
    return auditData.regulatory_violations.map((v) => v.clause || v.law || String(v));
  }
  return flags.map((f) => (typeof f === 'string' ? f : f.clause || f.law || JSON.stringify(f)));
}

export function getCounterfactual(auditData) {
  const cf = auditData?.counterfactual_data || auditData?.counterfactual || {};
  if (cf.status === 'ok' || cf.original || cf.flipped) {
    return cf;
  }
  return null;
}

export function getTopShap(auditData, n = 5) {
  const shap = auditData?.top_shap_features || [];
  if (shap.length > 0) return shap.slice(0, n);
  const shapData = auditData?.shap_data;
  if (shapData?.top_features) return shapData.top_features.slice(0, n);
  return [];
}

export function getDebiasingStrategies(auditData) {
  const raw = auditData?.debiasing_strategies || [];
  if (raw.length > 0) {
    return raw.map((s, i) => ({
      id: s.name?.toLowerCase().replace(/\s+/g, '-') || `strategy-${i}`,
      title: s.name || 'Strategy',
      description: s.description || 'Fairness improvement strategy',
      gain: s.fairness_gain || 0,
      accuracyLoss: s.accuracy_loss || 0,
    }));
  }
  return [
    { id: 'reweighting', title: 'Reweighting', description: 'Assigns higher training weights to under-represented groups.', gain: 0.19, accuracyLoss: 0.012 },
    { id: 'threshold-adjustment', title: 'Threshold Adjustment', description: 'Uses different decision thresholds per group to equalize outcomes.', gain: 0.15, accuracyLoss: 0.008 },
    { id: 'feature-removal', title: 'Feature Removal', description: 'Removes proxy features correlated with protected attributes.', gain: 0.11, accuracyLoss: 0.023 },
  ];
}

export function getRiskColor(risk) {
  const r = (risk || '').toLowerCase();
  if (r.includes('high') || r.includes('critical')) return 'red';
  if (r.includes('medium') || r.includes('warning')) return 'amber';
  if (r.includes('low') || r.includes('ok')) return 'green';
  return 'slate';
}

export function getSeverityColor(severity) {
  const s = (severity || '').toLowerCase();
  if (s.includes('high') || s.includes('critical')) return 'red';
  if (s.includes('medium') || s.includes('warning')) return 'amber';
  return 'green';
}

export function getScoreColor(score) {
  if (score < 50) return 'red';
  if (score < 75) return 'amber';
  return 'green';
}

export function getMetricStatus(value, threshold, higherIsBetter = true) {
  const good = higherIsBetter ? value >= threshold : value <= threshold;
  const warning = higherIsBetter ? value >= threshold * 0.8 : value <= threshold * 1.25;
  if (good) return 'green';
  if (warning) return 'amber';
  return 'red';
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function animateNumber(target, duration = 800, onUpdate) {
  const start = performance.now();
  const from = 0;
  const diff = target - from;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + diff * eased;
    onUpdate(current);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

export function formatPercent(value, decimals = 0) {
  return `${Number(value || 0).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getEEOCThreshold() {
  return 0.8;
}

export function getEEOCThresholdPercent() {
  return 80;
}

export function getStageProgress(stageName) {
  const s = (stageName || '').toLowerCase();
  const map = {
    waiting: 0,
    ingestion: 10,
    profiling: 25,
    metrics: 40,
    shap: 60,
    counterfactuals: 75,
    regulatory: 90,
    done: 100,
    error: 100,
  };
  return map[s] ?? 0;
}

export function getStageLabel(stageName) {
  const s = (stageName || '').toLowerCase();
  const map = {
    waiting: 'Waiting',
    ingestion: 'Ingestion',
    profiling: 'Profiling',
    metrics: 'Metrics',
    shap: 'SHAP',
    counterfactuals: 'Counterfactuals',
    regulatory: 'Regulatory',
    done: 'Complete',
    error: 'Error',
  };
  return map[s] || stageName || 'Processing';
}

export function getRiskBadgeClass(risk) {
  const color = getRiskColor(risk);
  const map = {
    red: 'bg-error-container/20 text-error border-error/30',
    amber: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    slate: 'bg-white/5 text-slate-400 border-white/10',
  };
  return map[color] || map.slate;
}

export function getScoreBadgeClass(score) {
  const color = getScoreColor(score);
  const map = {
    red: 'bg-error-container/20 text-error border-error/30',
    amber: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return map[color] || map.slate;
}

export function getMetricColorClass(color) {
  const map = {
    red: 'text-error bias-glow-red',
    amber: 'text-yellow-400',
    green: 'text-green-400 bias-glow-green',
    slate: 'text-slate-400',
  };
  return map[color] || map.slate;
}

export function getBorderColorClass(color) {
  const map = {
    red: 'border-l-4 border-error/50',
    amber: 'border-l-4 border-yellow-500/50',
    green: 'border-l-4 border-green-500/50',
    slate: 'border-l-4 border-white/10',
  };
  return map[color] || map.slate;
}

export function getBgColorClass(color) {
  const map = {
    red: 'bg-error-container/5',
    amber: 'bg-yellow-500/5',
    green: 'bg-green-500/5',
    slate: 'bg-white/5',
  };
  return map[color] || map.slate;
}

export function getTextColorClass(color) {
  const map = {
    red: 'text-error',
    amber: 'text-yellow-400',
    green: 'text-green-400',
    slate: 'text-slate-400',
  };
  return map[color] || map.slate;
}

export function getIconForStage(stage) {
  const map = {
    ingestion: 'upload_file',
    profiling: 'analytics',
    metrics: 'monitoring',
    shap: 'psychology',
    counterfactuals: 'swap_horiz',
    regulatory: 'policy',
    done: 'check_circle',
  };
  return map[stage?.toLowerCase()] || 'hourglass_empty';
}

export function getIconForDataset(id) {
  const map = {
    uci_adult: 'work',
    hud_hmda: 'real_estate',
    compas: 'gavel',
  };
  return map[id] || 'dataset';
}

export default {
  uploadFile,
  streamAudit,
  runAudit,
  getHealth,
  getJobs,
  getRuns,
  getRun,
  downloadReport,
  runDebias,
  extractJobId,
  EMPTY_AUDIT,
  computeDisplayMetrics,
  getRegulatoryFlags,
  getCounterfactual,
  getTopShap,
  getDebiasingStrategies,
  getRiskColor,
  getSeverityColor,
  getScoreColor,
  getMetricStatus,
  clamp,
  animateNumber,
  formatPercent,
  formatNumber,
  classNames,
  getEEOCThreshold,
  getEEOCThresholdPercent,
  getStageProgress,
  getStageLabel,
  getRiskBadgeClass,
  getScoreBadgeClass,
  getMetricColorClass,
  getBorderColorClass,
  getBgColorClass,
  getTextColorClass,
  getIconForStage,
  getIconForDataset,
};
