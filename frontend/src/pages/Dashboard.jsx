import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import {
  uploadFile,
  streamAudit,
  extractJobId,
  getJobs,
  getHealth,
  getStageLabel,
  getIconForStage,
  animateNumber,
  formatNumber,
  classNames,
} from '../api/fairlens';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import KpiCard from '../components/dashboard/KpiCard';
import AlertCard from '../components/dashboard/AlertCard';
// ChartCard intentionally unused: dashboard metrics are backend-driven.

const STAGE_ORDER = ['ingestion', 'profiling', 'metrics', 'shap', 'counterfactuals', 'regulatory', 'done'];

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [backend, setBackend] = useState({ ok: false, checked: false, error: '' });
  const [jobsState, setJobsState] = useState({ activeJobs: 0, jobs: [], loading: true, error: '' });
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadMeta, setUploadMeta] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [streamEvents, setStreamEvents] = useState([]);
  const [currentStage, setCurrentStage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [animatedHero, setAnimatedHero] = useState(0);

  useEffect(() => {
    animateNumber(0.0, 600, setAnimatedHero);
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchOnce = async () => {
      try {
        const health = await getHealth();
        if (!alive) return;
        const ok = (health?.data?.status || health?.status) === 'ok';
        setBackend({ ok: Boolean(ok), checked: true, error: '' });
      } catch (e) {
        if (!alive) return;
        setBackend({ ok: false, checked: true, error: e.message || 'Backend unreachable' });
      }

      try {
        const res = await getJobs();
        if (!alive) return;
        const data = res?.data || res;
        const jobs = Array.isArray(data?.jobs) ? data.jobs : Array.isArray(res?.jobs) ? res.jobs : [];
        setJobsState({
          activeJobs: Number(data?.active_jobs ?? jobs.length ?? 0),
          jobs,
          loading: false,
          error: '',
        });
      } catch (e) {
        if (!alive) return;
        setJobsState((prev) => ({ ...prev, loading: false, error: e.message || 'Failed to load jobs' }));
      }
    };

    fetchOnce();
    const interval = setInterval(fetchOnce, 5000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    setFile(nextFile);
    setFileName(nextFile.name);
    setError('');
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
      setFileName(dropped.name);
      setError('');
    } else {
      setError('Please drop a CSV file.');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const runUploadAndStream = async () => {
    if (!file) {
      setError('Select a CSV file before running audit.');
      return;
    }

    setIsStreaming(true);
    setError('');
    setStreamEvents([]);
    setCurrentStage('ingestion');
    setProgress(0);

    try {
      const uploadRes = await uploadFile(file);
      const meta = uploadRes?.data || uploadRes;
      setUploadMeta(meta);

      const jid = extractJobId(uploadRes);
      if (!jid) throw new Error('Upload succeeded but job_id is missing.');
      setJobId(jid);

      streamAudit(jid, (event) => {
        setStreamEvents((prev) => [...prev, event]);
        if (event.stage) setCurrentStage(event.stage);
        if (typeof event.progress === 'number') setProgress(event.progress);

        if (event.done && event.result) {
          setIsStreaming(false);
          navigate(`/audit/${jid}`, { state: { auditData: event.result, uploadMeta: meta, fileName } });
        }
        if (event.error) {
          setIsStreaming(false);
          setError(event.error);
        }
      });
    } catch (err) {
      setIsStreaming(false);
      setError(err.message || 'Upload failed');
    }
  };

  const resetState = () => {
    setFile(null);
    setFileName('');
    setUploadMeta(null);
    setJobId(null);
    setStreamEvents([]);
    setCurrentStage(null);
    setProgress(0);
    setIsStreaming(false);
    setError('');
  };

  const stageIndex = STAGE_ORDER.indexOf((currentStage || '').toLowerCase());
  const completedStages = stageIndex >= 0 ? stageIndex : 0;

  const jobStats = useMemo(() => {
    const jobs = jobsState.jobs || [];
    const running = jobs.filter((j) => (j.status || '').toLowerCase() === 'running').length;
    const failed = jobs.filter((j) => (j.status || '').toLowerCase() === 'failed').length;
    const byStage = jobs.reduce((acc, j) => {
      const stage = String(j.stage || 'waiting').toLowerCase();
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    const avgProgress =
      jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + Number(j.progress || 0), 0) / jobs.length) : 0;

    return { running, failed, byStage, avgProgress };
  }, [jobsState.jobs]);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <section className="relative px-6 lg:px-8 pt-10 pb-6 max-w-[1320px] mx-auto">
        <div className="absolute -top-24 right-0 w-[520px] h-[520px] bg-hero-glow rounded-full blur-3xl pointer-events-none opacity-70" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Bias + fairness audit</span>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="text-[11px] text-slate-400">Enterprise</span>
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
                Reduce model risk with measurable bias controls.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-on-surface-variant max-w-2xl">
                Audit datasets and ML outputs for disparate impact, instability, and leakage—then export policy-ready reports.
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                  <Icon icon="material-symbols:balance" className="text-base text-slate-300" />
                  <span>Backend: <span className={`font-semibold ${backend.ok ? 'text-green-400' : 'text-error'}`}>{backend.checked ? (backend.ok ? 'Connected' : 'Offline') : 'Checking…'}</span></span>
                </div>
                <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                  <Icon icon="material-symbols:receipt-long" className="text-base text-slate-300" />
                  <span>Export: PDF • JSON</span>
                </div>
              </div>
            </div>

            <div className="hidden xl:block w-[360px]">
              <Card className="p-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Audit status</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-on-surface">{isStreaming ? getStageLabel(currentStage) : 'Ready'}</div>
                  <div className="text-xs text-slate-500">{isStreaming ? `${progress}%` : `${jobStats.running} running`}</div>
                </div>
                <div className="mt-3 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full progress-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${isStreaming ? progress : jobStats.avgProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="primary" onClick={() => !isStreaming && fileInputRef.current?.click()} disabled={isStreaming}>
                    <Icon icon="material-symbols:upload-file" className="text-base" />
                    Upload
                  </Button>
                  <Button variant="secondary" onClick={() => file && runUploadAndStream()} disabled={!file || isStreaming}>
                    <Icon icon="material-symbols:play-arrow" className="text-base" />
                    Run
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Bento Dashboard */}
      <section className="px-6 lg:px-8 pb-12 max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* KPIs */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <KpiCard
              label="Active audits"
              value={String(jobsState.activeJobs)}
              delta={backend.ok ? 'API healthy' : backend.error ? backend.error : 'API status unknown'}
              icon="material-symbols:track-changes"
            />
            <KpiCard
              label="Running now"
              value={String(jobStats.running)}
              delta="Live SSE pipeline"
              icon="material-symbols:hourglass-top"
            />
            <KpiCard
              label="Average progress"
              value={`${jobStats.avgProgress}%`}
              delta="Across active jobs"
              icon="material-symbols:group"
            />
            <KpiCard
              label="Failed"
              value={String(jobStats.failed)}
              delta="Requires review"
              icon="material-symbols:error"
              tone={jobStats.failed > 0 ? 'bad' : 'neutral'}
            />
          </div>

          {/* Left column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upload / Run */}
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">New audit</div>
                  <div className="mt-2 text-sm font-semibold text-on-surface">Dataset → model slice metrics → export</div>
                  <div className="mt-1 text-xs text-on-surface-variant">CSV input. Protected-attribute mapping supported.</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => !isStreaming && fileInputRef.current?.click()} disabled={isStreaming}>
                    <Icon icon="material-symbols:upload-file" className="text-base" />
                    Upload
                  </Button>
                  <Button variant="primary" onClick={runUploadAndStream} disabled={!file || isStreaming}>
                    <Icon icon="material-symbols:play-arrow" className="text-base" />
                    Run
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={classNames(
                    'rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition cursor-pointer',
                    dragOver && 'border-white/20 bg-white/[0.04]'
                  )}
                  onClick={() => !isStreaming && fileInputRef.current?.click()}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                        <Icon icon={file ? 'material-symbols:description' : 'material-symbols:upload'} className="text-xl text-slate-200" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-on-surface truncate">
                          {file ? fileName : 'Drop CSV or click to select'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Max 50MB • Secure API'}
                        </div>
                      </div>
                    </div>
                    {file && !isStreaming ? (
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetState();
                        }}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  {isStreaming ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{getStageLabel(currentStage)}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full progress-gradient"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.25 }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-7 gap-2">
                        {STAGE_ORDER.map((stage) => {
                          const isDone = STAGE_ORDER.indexOf(stage) < completedStages;
                          const isCurrent = STAGE_ORDER.indexOf(stage) === completedStages;
                          return (
                            <div
                              key={stage}
                              className={classNames(
                                'h-8 rounded-xl border flex items-center justify-center',
                                isDone && 'bg-white/[0.06] border-white/10 text-slate-200',
                                isCurrent && 'bg-white/[0.08] border-white/20 text-white',
                                !isDone && !isCurrent && 'bg-white/[0.02] border-white/10 text-slate-600'
                              )}
                              title={getStageLabel(stage)}
                            >
                              <Icon icon={isDone ? 'material-symbols:check' : getIconForStage(stage)} className="text-base" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pipeline</div>
                  <div className="mt-2 text-sm font-semibold text-on-surface">Stage distribution</div>
                  <div className="mt-1 text-xs text-on-surface-variant">Real-time from `GET /jobs`.</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/report')}>
                  Open audit log
                  <Icon icon="material-symbols:arrow-forward" className="text-base" />
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(jobStats.byStage).length === 0 ? (
                  <div className="col-span-2 sm:col-span-4 text-xs text-slate-500 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    No active jobs.
                  </div>
                ) : (
                  Object.entries(jobStats.byStage)
                    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                    .map(([stage, count]) => (
                      <div key={stage} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{getStageLabel(stage)}</div>
                        <div className="mt-2 text-2xl font-bold tracking-tight text-on-surface">{count}</div>
                      </div>
                    ))
                )}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 space-y-6">
            {!backend.ok ? (
              <AlertCard
                severity="danger"
                title="Backend unavailable"
                detail={backend.error || 'Check backend server on port 8000.'}
                right={<span className="text-xs font-semibold text-error">Fix</span>}
              />
            ) : (
              <AlertCard
                severity="success"
                title="Backend connected"
                detail="Live audits, SSE progress, and report export enabled."
                right={<span className="text-xs font-semibold text-[#4ade80]">OK</span>}
              />
            )}

            {jobStats.failed > 0 ? (
              <AlertCard
                severity="warning"
                title="Some jobs failed"
                detail="Review job stages and retry the audit."
                right={<span className="text-xs font-semibold text-[#fbbf24]">Review</span>}
              />
            ) : null}

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dataset snapshot</div>
                  <div className="mt-2 text-sm font-semibold text-on-surface">{uploadMeta ? 'Loaded' : '—'}</div>
                </div>
                {jobId ? (
                  <div className="text-xs text-slate-500 font-mono">{jobId.slice(0, 12)}…</div>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Rows</div>
                  <div className="mt-1 text-sm font-semibold text-on-surface">
                    {uploadMeta?.rows ? formatNumber(uploadMeta.rows) : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Columns</div>
                  <div className="mt-1 text-sm font-semibold text-on-surface">
                    {uploadMeta?.columns?.length || uploadMeta?.cols || '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Protected attributes</div>
                  <div className="mt-1 text-sm font-semibold text-on-surface truncate">
                    {(uploadMeta?.protected_attributes || uploadMeta?.protectedAttributes || []).join(', ') || '—'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="px-6 lg:px-8 pb-8 max-w-[1320px] mx-auto">
          <div className="glass rounded-xl border-error/30 bg-error-container/10 p-4">
            <div className="flex items-center gap-2 text-error mb-2">
              <Icon icon="material-symbols:error" />
              <span className="font-semibold text-sm">Error</span>
            </div>
            <p className="text-error text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

