import { SectionHeader } from "./SectionHeader";
import { UploadCloud, FileSpreadsheet, ShieldCheck, Database } from "lucide-react";
import { useFairLensState } from "../../state/FairLensContext";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-lg tracking-tight text-zinc-100">{value}</div>
    </div>
  );
}

interface UploadProps {
  fileName?: string;
  status?: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
  statusMessage?: string;
  progress?: number;
  uploadMeta?: any;
  error?: string;
  onFileSelect: (file: File) => void;
  onRunPipeline: () => void;
}

export function Upload({
  fileName,
  status,
  statusMessage,
  progress,
  uploadMeta,
  error,
  onFileSelect,
  onRunPipeline,
}: UploadProps) {
  const { file, uploadData, pipeline } = useFairLensState();
  const resolvedFileName = fileName || file?.name || '';
  const resolvedStatus = status || pipeline.status;
  const resolvedStatusMessage = statusMessage || pipeline.message;
  const resolvedProgress = typeof progress === 'number' ? progress : pipeline.progress;
  const resolvedUploadMeta = uploadMeta || uploadData;
  const detected = resolvedUploadMeta?.protected_attributes || [];

  return (
    <section id="upload" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Dataset Upload"
          title="Bring your data — we handle PII detection and schema inference."
          description="Streamed multipart upload to /upload, schema validated server-side. Protected attributes are auto-detected and confirmed before any audit job is dispatched."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <label
              htmlFor="dropzone"
              className="group relative flex h-[340px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-gradient-to-b from-white/[0.03] to-transparent text-center transition hover:border-violet-400/40 hover:bg-violet-500/[0.04]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 50% 100%, rgba(139,92,246,0.18), transparent 60%)",
                }}
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <UploadCloud className="h-5 w-5 text-zinc-200" />
              </div>
              <div className="relative mt-4 text-[15px] text-zinc-100">Drop your dataset to begin</div>
              <div className="relative mt-1 text-xs text-zinc-500">
                or <span className="text-violet-300 underline underline-offset-2">browse files</span> from your machine
              </div>
              <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-500">
                {[".csv", ".parquet", ".json", ".xlsx"].map((t) => (
                  <span key={t} className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-zinc-300">
                    {t}
                  </span>
                ))}
                <span>· up to 2 GB · streamed · encrypted in transit</span>
              </div>
              <input
                id="dropzone"
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                accept=".csv,.json"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) {
                    onFileSelect(selected);
                  }
                }}
              />
            </label>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                <div>
                  <div className="text-sm text-zinc-300">{resolvedFileName || 'No file selected'}</div>
                  <div className="text-[11px] text-zinc-500">Upload progress will display here in real time</div>
                </div>
              </div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">{resolvedStatus}</div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, resolvedProgress))}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-400">{resolvedStatusMessage}</div>
            {error && (
              <div className="mt-2 rounded-md border border-rose-500/30 bg-rose-500/[0.1] px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-zinc-100">Dataset metadata</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${uploadMeta ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  {resolvedUploadMeta ? 'loaded' : 'not loaded'}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Auto-populated from /upload response.</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat label="Rows" value={resolvedUploadMeta?.rows?.toLocaleString?.() || '—'} />
                <Stat label="Columns" value={String(resolvedUploadMeta?.columns?.length || '—')} />
                <Stat label="Protected attrs" value={String(detected.length || '—')} />
                <Stat label="Target column" value={resolvedUploadMeta?.columns?.[resolvedUploadMeta?.columns?.length - 1] || '—'} />
              </div>

              <div className="mt-5 rounded-lg border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  PII scan & protected attribute detection runs server-side
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-300">
                  <Database className="h-4 w-4 text-indigo-300" />
                  Dataset cached for 24h, then purged automatically
                </div>
              </div>

              <button
                disabled={!resolvedFileName || resolvedStatus === 'uploading' || resolvedStatus === 'analyzing'}
                onClick={onRunPipeline}
                className="mt-5 w-full rounded-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-100 disabled:text-zinc-500"
              >
                {resolvedStatus === 'uploading' || resolvedStatus === 'analyzing' ? 'Running pipeline...' : 'Run Audit Pipeline'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
