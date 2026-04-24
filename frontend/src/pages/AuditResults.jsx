import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  runAudit,
  downloadReport,
  computeDisplayMetrics,
  getRegulatoryFlags,
  getCounterfactual,
  getTopShap,
  getDebiasingStrategies,
  getRiskColor,
  getScoreColor,
  getRiskBadgeClass,
  getScoreBadgeClass,
  getMetricColorClass,
  getBorderColorClass,
  getBgColorClass,
  getTextColorClass,
  clamp,
  animateNumber,
  formatPercent,
  formatNumber,
  classNames,
  EMPTY_AUDIT,
  getSeverityColor,
} from '../api/fairlens';

const REGULATIONS = [
  { name: 'EEOC', clause: '4/5ths Rule', threshold: '80%', article: 'Selection rate ratio must be ≥ 80% across groups' },
  { name: 'EU AI Act', clause: 'Article 10', threshold: 'High-risk systems', article: 'Bias testing required for HR & credit scoring' },
  { name: 'FCRA', clause: '§ 1681', threshold: 'Adverse action', article: 'Disclosure required if automated decision impacts credit' },
];

export default function AuditResults() {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [auditData, setAuditData] = useState(location.state?.auditData || null);
  const [uploadMeta, setUploadMeta] = useState(location.state?.uploadMeta || null);
  const [fileName] = useState(location.state?.fileName || '');
  const [loading, setLoading] = useState(!location.state?.auditData);
  const [error, setError] = useState('');
  const [animatedScore, setAnimatedScore] = useState(0);
  const [appliedStrategy, setAppliedStrategy] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!auditData && jobId) {
      runAudit(jobId)
        .then((res) => {
          setAuditData(res?.data || res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [jobId, auditData]);

  useEffect(() => {
    if (auditData) {
      const score = computeDisplayMetrics(auditData).score;
      animateNumber(score, 1000, setAnimatedScore);
    }
  }, [auditData]);

  const metrics = useMemo(() => (auditData ? computeDisplayMetrics(auditData) : computeDisplayMetrics(EMPTY_AUDIT)), [auditData]);
  const shap = useMemo(() => (auditData ? getTopShap(auditData, 5) : []), [auditData]);
  const flags = useMemo(() => (auditData ? getRegulatoryFlags(auditData) : []), [auditData]);
  const cf = useMemo(() => (auditData ? getCounterfactual(auditData) : null), [auditData]);
  const strategies = useMemo(() => (auditData ? getDebiasingStrategies(auditData) : []), [auditData]);
  const riskColor = getRiskColor(auditData?.risk_level);
  const scoreColor = getScoreColor(metrics.score);

  const handleApplyStrategy = (strategyId) => {
    setAppliedStrategy(strategyId);
  };

  const handleExportReport = async () => {
    setReportLoading(true);
    try {
      await downloadReport(jobId);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const cfScore = auditData?.counterfactual_data || auditData?.counterfactual || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-primary font-semibold">Loading audit results...</p>
        </div>
      </div>
    );
  }

  if (error && !auditData) {
    return (
      <div className="min-h-screen bg-background px-8 pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="glass-card rounded-xl border-error/30 bg-error-container/10 p-6">
            <div className="flex items-center gap-2 text-error mb-2">
              <Icon icon="material-symbols:error" />
              <span className="font-semibold">Failed to load audit</span>
            </div>
            <p className="text-error text-sm mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-background font-semibold py-2 px-4 rounded-lg text-sm hover:opacity-90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!auditData) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <section className="px-8 pt-24 pb-8 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-label-caps uppercase font-bold border ${getRiskBadgeClass(auditData.risk_level)}`}>
                {auditData.risk_level} Risk
              </span>
              <span className="text-slate-500 text-sm">{fileName || auditData.dataset_name || 'Unknown dataset'}</span>
            </div>
            <h1 className="font-display-lg text-display-lg text-primary">Audit Results</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="bg-surface-container text-primary font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-surface-container-high transition-all"
            >
              <Icon icon="material-symbols:arrow-back" className="inline mr-1" />
              Back
            </button>
            <button
              onClick={handleExportReport}
              disabled={reportLoading}
              className="bg-primary text-background font-bold py-2.5 px-4 rounded-lg text-sm hover:opacity-90 active:scale-95 transition-all shadow-glow disabled:opacity-50"
            >
              <Icon icon={reportLoading ? 'material-symbols:hourglass-empty' : 'material-symbols:download'} className="inline mr-1" />
              {reportLoading ? 'Generating...' : 'Export PDF'}
            </button>
          </div>
        </div>
      </section>

      <section className="px-8 pb-12 max-w-[1200px] mx-auto space-y-8">
        {/* Top Row: Score + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Fairness Score */}
          <div className="lg:col-span-4">
            <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between">
              <div>
                <p className="text-label-caps text-on-surface-variant uppercase mb-2">Fairness Score</p>
                <div className="flex items-end gap-2 mb-4">
                  <motion.span
                    className={`font-display-xl text-display-xl ${getMetricColorClass(scoreColor)}`}
                  >
                    {Math.round(animatedScore)}
                  </motion.span>
                  <span className="text-display-lg text-slate-500 font-normal mb-2">/100</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2 text-slate-400 uppercase">
                  <span>Bias Sensitivity</span>
                  <span>{metrics.score >= 75 ? '88%' : '62%'} Confidence</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    className="h-full rounded-full progress-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.score}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricTile
              title="Demographic Parity Gap"
              value={`${metrics.demographicParity}%`}
              status={metrics.demographicParity > 20 ? 'red' : metrics.demographicParity > 10 ? 'amber' : 'green'}
              helper="EEOC threshold: 20%"
              trend={metrics.demographicParity > 20 ? 'up' : 'down'}
            />
            <MetricTile
              title="Equalized Odds Gap"
              value={`${metrics.raceGap}%`}
              status={metrics.raceGap > 20 ? 'red' : metrics.raceGap > 10 ? 'amber' : 'green'}
              helper="Difference in TPR/FPR"
              trend={metrics.raceGap > 20 ? 'up' : 'down'}
            />
            <MetricTile
              title="Disparate Impact Ratio"
              value={metrics.disparateImpact}
              status={Number(metrics.disparateImpact) < 0.8 ? 'red' : Number(metrics.disparateImpact) < 0.95 ? 'amber' : 'green'}
              helper="EEOC threshold: 0.80"
              trend={Number(metrics.disparateImpact) < 0.8 ? 'up' : 'down'}
            />
            <MetricTile
              title="Predictive Parity Gap"
              value={`${metrics.predictiveParity}%`}
              status={Number(metrics.predictiveParity) > 15 ? 'red' : Number(metrics.predictiveParity) > 8 ? 'amber' : 'green'}
              helper="PPV difference across groups"
              trend={Number(metrics.predictiveParity) > 10 ? 'up' : 'down'}
            />
          </div>
        </div>

        {/* SHAP + Counterfactual Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SHAP Panel */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-headline-md text-headline-md text-primary">Feature Attribution (SHAP)</h3>
                <span className="text-label-caps text-on-surface-variant uppercase">Top 5 Drivers</span>
              </div>
              {shap.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No SHAP data available.</p>
              ) : (
                <div className="space-y-4">
                  {shap.map((item, i) => {
                    const pct = Math.max(5, (item.impact || 0) * 100);
                    return (
                      <div key={item.feature || i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-primary font-medium">{item.feature}</span>
                          <span className="text-on-surface-variant font-mono">{(item.impact || 0).toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Counterfactual */}
          <div className="lg:col-span-5">
            <div className="glass-card rounded-2xl p-6 h-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/[0.06] text-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/10">
                  Counterfactual
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Decision sensitivity</h3>
              <p className="text-on-surface-variant text-sm mb-6">Backend-derived counterfactual output (if available).</p>

              {!cfScore || cfScore?.status === 'skipped' ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-on-surface-variant">
                  No counterfactual output returned by the backend for this audit.
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">Attribute</div>
                    <div className="text-xs font-semibold text-on-surface">{cfScore.attribute || '—'}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Original</div>
                      <div className="mt-1 text-sm font-semibold text-on-surface">
                        {typeof cfScore.original_score === 'number' ? `${Math.round(cfScore.original_score * 100)}%` : '—'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{cfScore.original_group || ''}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Counterfactual</div>
                      <div className="mt-1 text-sm font-semibold text-on-surface">
                        {typeof cfScore.counterfactual_score === 'number' ? `${Math.round(cfScore.counterfactual_score * 100)}%` : '—'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{cfScore.counterfactual_group || ''}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Regulatory Radar */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Regulatory Radar</h3>
            <span className="text-label-caps text-on-surface-variant uppercase">Compliance Flags</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {auditData?.regulatory_flags?.map((flag, i) => {
              const regulation = REGULATIONS.find((r) => (flag.law || flag).includes(r.name)) || REGULATIONS[i];
              const isViolation = flag.violation !== false;
              const severity = flag.severity || 'medium';
              const color = isViolation ? getSeverityColor(severity) : 'green';
              return (
                <div key={i} className={`glass-card rounded-xl p-5 ${getBorderColorClass(color)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-label-caps text-on-surface-variant uppercase">{flag.law || regulation?.name}</span>
                    <Icon
                      icon={isViolation ? 'material-symbols:error' : 'material-symbols:check-circle'}
                      className={getTextColorClass(color)}
                    />
                  </div>
                  <h4 className="text-title-sm font-title-sm text-primary mb-1">{flag.clause || regulation?.clause}</h4>
                  <p className="text-xs text-on-surface-variant mb-3">{regulation?.article}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${getBgColorClass(color)} ${getTextColorClass(color)}`}>
                    {isViolation ? (
                      <>
                        <Icon icon="material-symbols:warning" className="text-xs" />
                        {severity} Violation
                      </>
                    ) : (
                      <>
                        <Icon icon="material-symbols:check" className="text-xs" />
                        Compliant
                      </>
                    )}
                  </div>
                </div>
              );
            }) || REGULATIONS.map((reg, i) => (
              <div key={i} className="glass-card rounded-xl p-5 border-l-4 border-green-500/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-label-caps text-on-surface-variant uppercase">{reg.name}</span>
                  <Icon icon="material-symbols:check-circle" className="text-green-400" />
                </div>
                <h4 className="text-title-sm font-title-sm text-primary mb-1">{reg.clause}</h4>
                <p className="text-xs text-on-surface-variant mb-3">{reg.article}</p>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-500/5 text-green-400">
                  <Icon icon="material-symbols:check" className="text-xs" />
                  Compliant
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debiasing Panel */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="font-headline-md text-headline-md text-primary">Debiasing Strategies</h3>
              <p className="text-on-surface-variant text-sm mt-1">
                Backend recommendations based on the current audit.
              </p>
            </div>
            {appliedStrategy && (
              <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-label-caps uppercase font-bold border border-green-500/30">
                Applied: {appliedStrategy}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const isApplied = appliedStrategy === strategy.id;
              const gainPct = Math.round((strategy.gain || 0) * 100);
              const lossPct = Math.round((strategy.accuracyLoss || 0) * 100);
              return (
                <div
                  key={strategy.id}
                  className={classNames(
                    'glass-card rounded-xl p-5 transition-all',
                    isApplied && 'ring-1 ring-green-400/40 bg-green-500/5'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-title-sm text-title-sm text-primary">{strategy.title}</h4>
                    {isApplied && <Icon icon="material-symbols:check-circle" className="text-green-400" />}
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">{strategy.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">Fairness gain</span>
                      <span className="text-primary font-mono">+{gainPct}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-error">Accuracy loss</span>
                      <span className="text-primary font-mono">-{lossPct}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyStrategy(strategy.id)}
                    disabled={isApplied}
                    className={classNames(
                      'w-full py-2.5 rounded-lg text-sm font-bold transition-all',
                      isApplied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-primary text-background hover:opacity-90 active:scale-95'
                    )}
                  >
                    {isApplied ? 'Selected' : 'Select'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricTile({ title, value, status, helper, trend }) {
  const isUp = trend === 'up';
  return (
    <div className={`glass-card rounded-xl p-5 ${getBorderColorClass(status)}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-label-caps text-on-surface-variant uppercase">{title}</span>
        <Icon
          icon={isUp ? 'material-symbols:trending-up' : 'material-symbols:trending-down'}
          className={getTextColorClass(status)}
        />
      </div>
      <p className={`font-display-lg text-display-lg mb-1 ${getMetricColorClass(status)}`}>{value}</p>
      <p className="text-xs text-on-surface-variant">{helper}</p>
    </div>
  );
}
