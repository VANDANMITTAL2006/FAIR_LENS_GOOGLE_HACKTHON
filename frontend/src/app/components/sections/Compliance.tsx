import { SectionHeader } from './SectionHeader';
import { CheckCircle2, AlertTriangle, XCircle, FileDown, Shield, FileWarning, ListChecks } from 'lucide-react';
import { useFairLensState } from '../../state/FairLensContext';

type Status = 'pass' | 'warn' | 'fail' | 'idle';

const CHECKLIST: { framework: string; control: string; status: Status }[] = [
  { framework: 'EU AI Act', control: 'Art. 10 — Data and data governance', status: 'idle' },
  { framework: 'EU AI Act', control: 'Art. 13 — Transparency to users', status: 'idle' },
  { framework: 'EU AI Act', control: 'Art. 15 — Accuracy & robustness', status: 'idle' },
  { framework: 'NIST AI RMF', control: 'MEASURE 2.11 — Fairness & bias', status: 'idle' },
  { framework: 'NIST AI RMF', control: 'GOVERN 5.1 — Documentation', status: 'idle' },
  { framework: 'ISO/IEC 42001', control: 'A.6.2 — AI risk assessment', status: 'idle' },
  { framework: 'US EEOC', control: 'Four-fifths rule (selection rate)', status: 'idle' },
];

const ICONS: Record<Status, React.ReactNode> = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  fail: <XCircle className="h-4 w-4 text-rose-400" />,
  idle: <span className="h-2 w-2 rounded-full bg-zinc-600" />,
};

function deriveStatusFromMetrics(metrics: any, warnings: any[], flags: any[]): Status {
  if (!metrics) return 'idle';
  const dp = Math.abs(Number(metrics.demographic_parity_difference || 0));
  const eo = Math.abs(Number(metrics.equalized_odds_difference || 0));
  const di = Number(metrics.disparate_impact_ratio || 0);
  const hasHardFailure = di < 0.8 || dp > 0.2 || eo > 0.2 || flags.length > 0;
  if (hasHardFailure) return 'fail';
  const hasWarning = di < 0.9 || dp > 0.1 || eo > 0.1 || warnings.length > 0;
  if (hasWarning) return 'warn';
  return 'pass';
}

export function Compliance({ onDownload, auditData }: { onDownload: () => void; auditData?: any }) {
  const { auditResult, debiasResult } = useFairLensState();
  const liveAudit = auditData ?? auditResult;
  const warnings = Array.isArray(liveAudit?.warnings) ? liveAudit.warnings : [];
  const flags = Array.isArray(liveAudit?.regulatory_flags) ? liveAudit.regulatory_flags : [];
  const statusFromMetrics = deriveStatusFromMetrics(liveAudit?.metrics, warnings, flags);

  const sections = CHECKLIST.map((entry) => {
    if (!liveAudit) {
      return { ...entry, status: 'idle' as Status };
    }
    if (entry.framework === 'US EEOC') {
      const di = Number(liveAudit?.metrics?.disparate_impact_ratio || 0);
      return { ...entry, status: di >= 0.8 ? 'pass' as Status : di >= 0.7 ? 'warn' as Status : 'fail' as Status };
    }
    if (entry.framework === 'NIST AI RMF' && warnings.length > 0) {
      return { ...entry, status: 'warn' as Status };
    }
    return { ...entry, status: statusFromMetrics };
  });

  const passCount = sections.filter((section) => section.status === 'pass').length;
  const warnCount = sections.filter((section) => section.status === 'warn').length;
  const failCount = sections.filter((section) => section.status === 'fail').length;
  const score = sections.length > 0 ? Math.round(((passCount + warnCount * 0.5) / sections.length) * 100) : null;

  const findings = flags.map((entry: any) => ({
    text: typeof entry === 'string' ? entry : (entry?.clause || JSON.stringify(entry)),
  }));

  const recommendations = [
    ...(warnings.slice(0, 3).map((warning: any) => `Review warning: ${String(warning)}`)),
    ...(debiasResult?.recommended ? [`Apply recommended debias strategy: ${debiasResult.recommended}`] : []),
    'Re-run audit after mitigation and compare fairness deltas in Analysis.',
  ];

  return (
    <section id="report" className="relative border-b border-white/[0.06]">
      <div className="mx-auto max-w-[1400px] px-6 py-24">
        <SectionHeader
          eyebrow="Compliance Report"
          title="Regulator-grade documentation, generated automatically."
          description="Every audit produces an immutable, signed report mapped to the major AI fairness frameworks. Export as PDF or attach to your model card."
          action={
            <button type="button" onClick={onDownload} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.08]">
              <FileDown className="h-4 w-4" />
              Export Report
            </button>
          }
        />

        {!liveAudit && (
          <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            Report is generated directly from audit results after pipeline completion.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6">
            <div className="flex items-center gap-2 text-sm text-zinc-100">
              <Shield className="h-4 w-4 text-emerald-300" />
              Overall compliance
            </div>
            <div className="mt-6 flex items-end gap-3">
              <span className="text-6xl tracking-tight text-zinc-50">{score ?? '—'}</span>
              <span className="mb-2 text-sm text-zinc-500">/ 100</span>
            </div>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400" style={{ width: `${score ?? 0}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
              <span>fail</span><span>warn</span><span>pass</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Pass', value: passCount || '—', color: 'text-emerald-300' },
                { label: 'Warn', value: warnCount || '—', color: 'text-amber-300' },
                { label: 'Fail', value: failCount || '—', color: 'text-rose-300' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">{item.label}</div>
                  <div className={`mt-1 text-lg ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] lg:col-span-2">
            <div className="border-b border-white/[0.06] px-5 py-3 text-sm text-zinc-100">Control checklist</div>
            <ul>
              {sections.map((entry, i) => {
                const mappedStatus: Status = entry.status;

                return (
                  <li
                    key={entry.control}
                    className={`flex items-center justify-between px-5 py-3 text-sm ${i !== CHECKLIST.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {ICONS[mappedStatus]}
                      <div>
                        <div className="text-zinc-200">{entry.control}</div>
                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{entry.framework}</div>
                      </div>
                    </div>
                    <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400">
                      {liveAudit ? mappedStatus : 'awaiting audit'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-zinc-100">
                <FileWarning className="h-4 w-4 text-rose-300" />
                Compliance Findings
              </div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">framework-mapped</span>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {(findings.length > 0 ? findings : [{ text: 'No findings yet' }]).map((finding: any, idx: number) => (
                <li key={`finding-${idx}`} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-zinc-600 ring-4 ring-white/[0.04]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-300">{finding.text}</span>
                      <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Will populate after audit run.
                    </div>
                  </div>
                  <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                    {findings.length > 0 ? 'live' : 'awaiting audit'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-xs">
              <span className="text-zinc-500">Findings populate from /audit + /report</span>
              <a href="#analysis" className="text-zinc-300 hover:text-white">View evidence →</a>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-zinc-100">
                <ListChecks className="h-4 w-4 text-emerald-300" />
                Recommended Actions
              </div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">prioritized</span>
            </div>
            <ol className="divide-y divide-white/[0.04]">
              {(liveAudit ? recommendations : ['Pending analysis']).map((rec: string, idx: number) => (
                <li key={`rec-${idx}`} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[11px] tracking-wide text-zinc-400">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm text-zinc-300">{rec}</div>
                    <div className="mt-1 text-xs leading-relaxed text-zinc-500">
                      Recommended actions populate after the audit pipeline returns findings.
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolves: —
                    </div>
                  </div>
                  <button disabled className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-500">
                    {liveAudit ? 'Tracked' : 'Apply'}
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3 text-xs">
              <span className="text-zinc-500">Tied to Debias strategies & framework controls</span>
              <a href="#debias" className="text-zinc-300 hover:text-white">Open Debias Lab →</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
