import { SectionHeader } from "./SectionHeader";
import { Inbox, History as HistoryIcon } from "lucide-react";
import { useFairLensState } from "../../state/FairLensContext";

export function History() {
  const { uploadData, uploadId, auditResult } = useFairLensState();
  const hasRun = Boolean(uploadId || auditResult);

  return (
    <section id="history" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Audit History"
          title="Every run, versioned and comparable."
          description="Audit jobs are persisted with their dataset hash, model fingerprint, and full metric set so any two runs can be compared diff-style."
        />

        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-zinc-100">
              <HistoryIcon className="h-4 w-4 text-violet-300" />
              Previous runs
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 text-zinc-300">All</button>
              <button className="rounded border border-white/10 px-2.5 py-1 text-zinc-500">Failed</button>
              <button className="rounded border border-white/10 px-2.5 py-1 text-zinc-500">High risk</button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 text-left">Run ID</th>
                <th className="px-5 py-3 text-left">Dataset</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Risk</th>
                <th className="px-5 py-3 text-left">Timestamp</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!hasRun && (
                <tr>
                <td colSpan={6} className="px-5 py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                      <Inbox className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="mt-4 text-sm text-zinc-200">No audits yet</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Your first audit will appear here once a job completes.
                    </div>
                    <a
                      href="#upload"
                      className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-3.5 py-1.5 text-xs text-zinc-100 ring-1 ring-white/10 hover:bg-white/[0.1]"
                    >
                      Upload a dataset
                    </a>
                  </div>
                </td>
                </tr>
              )}

              {hasRun && (
                <tr className="text-zinc-300">
                  <td className="px-5 py-4">{uploadId ? `RUN-${uploadId.slice(0, 8)}` : 'RUN-LIVE'}</td>
                  <td className="px-5 py-4">{uploadData?.filename || 'uploaded_file.csv'}</td>
                  <td className="px-5 py-4">{auditResult?.status || 'processing'}</td>
                  <td className="px-5 py-4">{auditResult?.risk_level || '—'}</td>
                  <td className="px-5 py-4">{new Date().toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <a href="#report" className="text-zinc-200 hover:text-white">View</a>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
