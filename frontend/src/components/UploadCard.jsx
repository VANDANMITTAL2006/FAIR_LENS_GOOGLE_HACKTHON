import { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

const UploadCard = ({
  fileName,
  hasFile,
  progress,
  analyzing,
  onFileSelect,
  onAnalyze,
  onClear,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#0a1020] p-8 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Dataset Upload
          </p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            Audit Your Dataset Instantly
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Upload CSV or JSON files to detect hidden bias, compare outcomes,
            and generate fairness insights in seconds.
          </p>
        </div>

        <button
          onClick={openPicker}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-600"
        >
          <UploadCloud size={16} />
          Choose File
        </button>
      </div>

      {/* Dropzone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-12 text-center transition ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10'
            : 'border-slate-700 bg-slate-900/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-300">
          <FileText size={24} />
        </div>

        <h3 className="mt-5 text-xl font-semibold text-white">
          Drag & Drop Your Dataset
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Supports CSV and JSON files for fairness analysis
        </p>

        {hasFile && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    File Ready
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {fileName}
                  </p>
                </div>
              </div>

              <button
                onClick={onClear}
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-white"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onAnalyze}
          disabled={!hasFile || analyzing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUpRight size={16} />
          {analyzing ? 'Analyzing...' : 'Analyze Dataset'}
        </button>

        <button
          onClick={onClear}
          className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Clear
        </button>
      </div>

      {/* Progress */}
      {analyzing && (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Running fairness audit...</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default UploadCard;