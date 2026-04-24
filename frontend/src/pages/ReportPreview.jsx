import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { getRuns, classNames } from '../api/fairlens';

function getStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'success') return 'green';
  if (s === 'running') return 'amber';
  if (s === 'failed' || s === 'error') return 'red';
  return 'slate';
}

function getStatusPillClass(status) {
  const tone = getStatusTone(status);
  const map = {
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    amber: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-error-container/20 text-error border-error/30',
    slate: 'bg-white/5 text-slate-400 border-white/10',
  };
  return map[tone] || map.slate;
}

export default function ReportPreview() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const fetchRuns = async () => {
      try {
        const res = await getRuns(100);
        if (!alive) return;
        const payload = res?.data || res;
        const list = Array.isArray(payload?.runs) ? payload.runs : [];
        setRuns(list);
        setLoading(false);
        setError('');
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'Failed to load jobs');
        setLoading(false);
      }
    };

    fetchRuns();
    const interval = setInterval(fetchRuns, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-primary font-semibold">Loading audit history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <section className="px-8 pt-24 pb-12 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display-lg text-display-lg text-primary">Audit History</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              Persisted run ledger from the backend (`GET /runs`). Exportable, traceable, review-ready.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-background font-bold py-2.5 px-4 rounded-lg text-sm hover:opacity-90 active:scale-95 transition-all shadow-glow"
          >
            <Icon icon="material-symbols:add" className="inline mr-1" />
            New audit
          </button>
        </div>

        {error && (
          <div className="glass-card rounded-xl border-error/30 bg-error-container/10 p-4 mb-6">
            <div className="flex items-center gap-2 text-error mb-1">
              <Icon icon="material-symbols:error" />
              <span className="font-semibold text-sm">Error loading jobs</span>
            </div>
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {runs.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto mb-4">
              <Icon icon="material-symbols:history" className="text-3xl text-primary/40" />
            </div>
            <h3 className="font-title-sm text-title-sm text-primary mb-2">No runs yet</h3>
            <p className="text-on-surface-variant text-sm mb-6">Start an audit to create a traceable run record.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-background font-bold py-2.5 px-6 rounded-lg text-sm hover:opacity-90 active:scale-95 transition-all"
            >
              Start audit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run, i) => {
              const status = run.status || 'queued';
              const stage = run.stage || 'waiting';
              const progress = Number(run.progress ?? 0);
              const createdAt = run.created_at ? new Date(run.created_at * 1000) : null;
              return (
                <motion.div
                  key={run.run_id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-5 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer"
                  onClick={() => run.job_id && navigate(`/audit/${run.job_id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={classNames(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        getStatusTone(status) === 'green'
                          ? 'bg-green-500/10'
                          : getStatusTone(status) === 'red'
                          ? 'bg-error-container/20'
                          : 'bg-surface-container-high'
                      )}
                    >
                      <Icon
                        icon={
                          getStatusTone(status) === 'green'
                            ? 'material-symbols:check'
                            : getStatusTone(status) === 'red'
                            ? 'material-symbols:error'
                            : 'material-symbols:hourglass-empty'
                        }
                        className={
                          getStatusTone(status) === 'green'
                            ? 'text-green-400'
                            : getStatusTone(status) === 'red'
                            ? 'text-error'
                            : 'text-slate-500'
                        }
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary">{run.run_id || 'AUD-—'}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span>Dataset: {run.dataset_id || 'DS-—'}</span>
                        <span>Model: {run.model_version || 'unassigned'}</span>
                        <span>Policy: {run.policy_version || '—'}</span>
                        <span>{createdAt ? createdAt.toLocaleString() : ''}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span>Stage: {stage}</span>
                        <span>Progress: {Number.isFinite(progress) ? `${progress}%` : '—'}</span>
                        {run.duration_ms != null ? <span>Duration: {Math.round(run.duration_ms / 1000)}s</span> : null}
                        {run.risk_level ? <span>Risk: {run.risk_level}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusPillClass(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                    <Icon icon="material-symbols:chevron-right" className="text-slate-500" />
                  </div>
                </motion.div>
              );
            })}

            <div className="mt-6 text-xs text-slate-500">
              Runs are persisted server-side for auditability (run IDs, timestamps, status, traceable context).
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
