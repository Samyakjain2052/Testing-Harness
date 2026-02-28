import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, RotateCcw, Eye, Clock, AlertCircle, CheckCircle2, XCircle,
  MinusCircle, ChevronDown, ChevronRight, Terminal, Ban, Image,
  Download, Layers, Info,
} from 'lucide-react';
import {
  useTestExecution, useExecutionResults, useTriggerExecution,
  useCancelExecution, useExecutionLogs,
} from '../hooks/useTestExecutions';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { TestResult } from '../api/test-executions.api';
import apiClient from '../api/client';

// Strip ANSI escape codes from error strings so they render cleanly
const stripAnsi = (s: string) => s.replace(/\x1B\[[\d;]*m/g, '');

// Fetches a screenshot through the authenticated API client, then turns
// the response into a local object URL so the browser can display it.
function ScreenshotImage({ executionId, blobPath, stepNumber }: {
  executionId: string;
  blobPath: string;
  stepNumber: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    apiClient
      .get(`/executions/${executionId}/screenshot`, { params: { path: blobPath }, responseType: 'blob' })
      .then(({ data }) => { url = URL.createObjectURL(data); setSrc(url); })
      .catch(() => setFailed(true));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [executionId, blobPath]);

  if (failed) return <p className="text-xs text-gray-400 italic">Screenshot unavailable</p>;
  if (!src) return <div className="h-32 rounded-lg bg-gray-100 animate-pulse" />;
  return (
    <img
      src={src}
      alt={`Screenshot step ${stepNumber}`}
      className="rounded-lg border border-gray-200 max-h-64 object-contain w-full cursor-pointer"
      onClick={() => window.open(src, '_blank')}
    />
  );
}

// ── icons & colours per status ───────────────────────────────────────────────
const STEP_ICON: Record<string, typeof CheckCircle2> = {
  passed: CheckCircle2, failed: XCircle, error: AlertCircle, skipped: MinusCircle,
};
const STEP_TEXT: Record<string, string> = {
  passed: 'text-green-500', failed: 'text-red-500',
  error: 'text-orange-500', skipped: 'text-gray-400',
};
const STEP_DOT: Record<string, string> = {
  passed: 'bg-green-500', failed: 'bg-red-500',
  error: 'bg-orange-500', skipped: 'bg-gray-300',
};
const EXEC_BG: Record<string, string> = {
  passed: 'bg-green-50 border-green-200',
  failed: 'bg-red-50 border-red-200',
  error: 'bg-orange-50 border-orange-200',
  cancelled: 'bg-gray-50 border-gray-200',
  running: 'bg-blue-50 border-blue-200',
  queued: 'bg-gray-50 border-gray-200',
};
const EXEC_ICON_BG: Record<string, string> = {
  passed: 'bg-green-100 text-green-600',
  failed: 'bg-red-100 text-red-600',
  error: 'bg-orange-100 text-orange-600',
  cancelled: 'bg-gray-100 text-gray-500',
  running: 'bg-blue-100 text-blue-600',
  queued: 'bg-gray-100 text-gray-500',
};
const EXEC_ICON: Record<string, typeof CheckCircle2> = {
  passed: CheckCircle2, failed: XCircle, error: AlertCircle,
  cancelled: Ban, running: Clock, queued: Clock,
};

function fmt(ms: number | null) {
  if (!ms) return '--';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}
function fmtDate(s: string | null) {
  return s ? new Date(s).toLocaleString() : '--';
}

// ── Logs panel ────────────────────────────────────────────────────────────────
function LogsPanel({ executionId }: { executionId: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'stdout' | 'stderr'>('stdout');
  const { data, isLoading, isError } = useExecutionLogs(executionId, tab, open);

  return (
    <div className="card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-t-lg"
      >
        <span className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-400" /> Execution Logs
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(['stdout', 'stderr'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-1">
            {isLoading ? (
              <LoadingSpinner className="py-6" />
            ) : isError || !data ? (
              <p className="text-xs text-gray-400 text-center py-6">No {tab} logs available.</p>
            ) : (
              <pre className="bg-gray-900 text-gray-100 text-xs font-mono p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap leading-5">
                {data.content || `(empty ${tab})`}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single step row (accordion) ───────────────────────────────────────────────
function StepRow({ step, index, defaultOpen }: { step: TestResult; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = STEP_ICON[step.status] || AlertCircle;
  const hasDetails = !!(step.error_details || step.expected_value || step.actual_value || step.screenshot_blob_path);

  return (
    <div className="relative">
      {/* Timeline dot */}
      <div className={`absolute left-5 top-4 h-3 w-3 rounded-full border-2 border-white ${STEP_DOT[step.status] ?? 'bg-gray-300'} z-10`} />

      <div className={`ml-12 mr-4 mb-3 rounded-lg border ${open && hasDetails ? 'border-gray-200' : 'border-transparent'}`}>
        {/* Header row */}
        <button
          onClick={() => hasDetails && setOpen((v) => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            hasDetails ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
          }`}
        >
          {/* Step number */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-mono flex items-center justify-center">
            {String(index + 1).padStart(2, '0')}
          </span>

          <Icon className={`h-4 w-4 flex-shrink-0 ${STEP_TEXT[step.status] ?? 'text-gray-400'}`} />

          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{step.step_name}</span>

          <span className="text-xs text-gray-400 flex-shrink-0">{fmt(step.duration_ms)}</span>
          <StatusBadge status={step.status as 'passed'} />
          {hasDetails && (
            open
              ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {/* Expanded details */}
        {open && hasDetails && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">

            {/* Error details — terminal style (ANSI codes stripped) */}
            {step.error_details && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Error Details</p>
                <pre className="bg-gray-900 text-red-300 text-xs font-mono p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap leading-5">
                  {stripAnsi(step.error_details)}
                </pre>
              </div>
            )}

            {/* Expected vs Actual diff */}
            {(step.expected_value || step.actual_value) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">Expected</p>
                  <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                    <code className="text-xs text-green-800 font-mono">{step.expected_value ?? '—'}</code>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Actual</p>
                  <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                    <code className="text-xs text-red-800 font-mono">{step.actual_value ?? '—'}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Screenshot — fetched via authenticated API client */}
            {step.screenshot_blob_path && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" /> Screenshot
                </p>
                <ScreenshotImage
                  executionId={step.execution_id}
                  blobPath={step.screenshot_blob_path}
                  stepNumber={step.step_number}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExecutionDetailPage() {
  const { executionId } = useParams<{ executionId: string }>();
  const { data: execution, isLoading } = useTestExecution(executionId!);
  const isActive = execution?.status === 'queued' || execution?.status === 'running';
  const { data: results = [] } = useExecutionResults(executionId!, isActive);
  const triggerExec = useTriggerExecution();
  const cancelExec = useCancelExecution();

  // Auto-expand failed/error steps
  const [expandedIds] = useState(() => new Set<string>());
  useEffect(() => {
    if (results.length) {
      results.forEach((r) => {
        if (r.status === 'failed' || r.status === 'error') expandedIds.add(r.id);
      });
    }
  }, [results, expandedIds]);

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!execution) return <p className="text-gray-500">Execution not found</p>;

  // Compute stats
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const errored = results.filter((r) => r.status === 'error').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const total = results.length;

  const StatusIcon = EXEC_ICON[execution.status] ?? AlertCircle;
  const meta = execution.metadata as Record<string, unknown>;

  const handleRerun = () =>
    triggerExec.mutateAsync({ scriptId: execution.script_id, environmentId: execution.environment_id });

  const handleWatchRerun = () =>
    triggerExec.mutateAsync({
      scriptId: execution.script_id,
      environmentId: execution.environment_id,
      options: { headless: false, slowMo: 500, captureScreenshots: 'always', captureTrace: 'always' },
    });

  const handleCancel = () => cancelExec.mutate(executionId!);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => window.history.back()} className="hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <span>/</span>
        {execution.app_id && execution.script_id && (
          <>
            <Link to={`/apps/${execution.app_id}/scripts/${execution.script_id}`} className="hover:text-gray-700">
              {execution.script_name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-mono text-xs">Execution {executionId?.slice(0, 8)}</span>
      </div>

      {/* ── Header card ── */}
      <div className={`card p-5 border ${EXEC_BG[execution.status] ?? 'border-gray-200'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Big status icon */}
            <div className={`rounded-xl p-3 flex-shrink-0 ${EXEC_ICON_BG[execution.status] ?? 'bg-gray-100 text-gray-500'}`}>
              <StatusIcon className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={execution.status as 'passed'} className="text-sm px-3 py-1" />
                <p className="font-mono text-xs text-gray-400">{execution.id}</p>
              </div>
              <p className="text-base font-semibold text-gray-900 mt-1">{execution.script_name}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {execution.duration_ms ? fmt(execution.duration_ms) : (isActive ? 'Running…' : '--')}
                </span>
                <span>Started: {fmtDate(execution.started_at)}</span>
                <span>Completed: {fmtDate(execution.completed_at)}</span>
                <span className="inline-flex items-center gap-1 bg-white/70 rounded px-2 py-0.5 border border-gray-200">
                  {execution.environment_name}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isActive && (
              <button
                onClick={handleCancel}
                disabled={cancelExec.isPending}
                className="btn-danger btn-sm"
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                {cancelExec.isPending ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            <button
              onClick={handleWatchRerun}
              disabled={triggerExec.isPending}
              className="btn-secondary btn-sm"
              title="Run with visible Chromium browser (slowMo 500ms)"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Watch
            </button>
            <button
              onClick={handleRerun}
              disabled={triggerExec.isPending}
              className="btn-secondary btn-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {triggerExec.isPending ? 'Starting…' : 'Re-run'}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {execution.error_message && (
          <div className="mt-4 rounded-lg bg-red-900/10 border border-red-200 px-4 py-3">
            <p className="text-xs font-semibold text-red-700 mb-1">Error</p>
            <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap">{execution.error_message}</pre>
          </div>
        )}
      </div>

      {/* ── Summary stats ── */}
      {total > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Steps', value: total, color: 'bg-blue-50 text-blue-600', icon: Layers },
              { label: 'Passed', value: passed, color: 'bg-green-50 text-green-600', icon: CheckCircle2 },
              { label: 'Failed', value: failed + errored, color: 'bg-red-50 text-red-600', icon: XCircle },
              { label: 'Skipped', value: skipped, color: 'bg-gray-50 text-gray-500', icon: MinusCircle },
            ].map((s) => (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="card px-4 py-3 space-y-1.5">
            <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-gray-100">
              {passed > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(passed / total) * 100}%` }} />}
              {failed > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />}
              {errored > 0 && <div className="bg-orange-500 transition-all" style={{ width: `${(errored / total) * 100}%` }} />}
              {skipped > 0 && <div className="bg-gray-300 transition-all" style={{ width: `${(skipped / total) * 100}%` }} />}
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              {passed > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{passed} passed</span>}
              {failed > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{failed} failed</span>}
              {errored > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />{errored} error</span>}
              {skipped > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />{skipped} skipped</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Body: steps (left) + metadata (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Step timeline */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Step Results</h3>
              {total > 0 && (
                <span className="text-xs text-gray-400">{total} step{total !== 1 ? 's' : ''}</span>
              )}
            </div>

            {total === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">
                {isActive ? (
                  <span className="flex flex-col items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Waiting for results…
                  </span>
                ) : 'No step results recorded'}
              </div>
            ) : (
              <div className="py-4 relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200" />

                {results.map((step, i) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    index={i}
                    defaultOpen={step.status === 'failed' || step.status === 'error'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Logs — only for terminal statuses */}
          {!isActive && <LogsPanel executionId={executionId!} />}
        </div>

        {/* RIGHT: Metadata sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Execution Details</h3>
            </div>

            <dl className="divide-y divide-gray-100 text-sm">
              {[
                { label: 'Environment', value: execution.environment_name },
                { label: 'Base URL', value: execution.environment_base_url || '--' },
                {
                  label: 'Script',
                  value: execution.app_id ? (
                    <Link
                      to={`/apps/${execution.app_id}/scripts/${execution.script_id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {execution.script_name}
                    </Link>
                  ) : execution.script_name,
                },
                { label: 'Retry Count', value: String(execution.retry_count) },
                { label: 'Browser', value: (meta?.browser as string) ?? 'chromium' },
                { label: 'Headless', value: meta?.headless === false ? 'No' : 'Yes' },
                { label: 'Timeout', value: meta?.timeout ? `${Number(meta.timeout) / 1000}s` : '60s' },
                { label: 'Screenshots', value: (meta?.captureScreenshots as string) ?? 'only-on-failure' },
                { label: 'Trace', value: (meta?.captureTrace as string) ?? 'retain-on-failure' },
                {
                  label: 'Job ID',
                  value: execution.queue_job_id
                    ? <span className="font-mono text-xs">{execution.queue_job_id}</span>
                    : '--',
                },
              ].map(({ label, value }) => (
                <div key={label} className="px-4 py-2.5 flex justify-between items-start gap-3">
                  <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
                  <dd className="text-xs text-gray-900 text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Tags */}
            {execution.script_tags?.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {execution.script_tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download trace if available */}
          <a
            href={`/api/v1/executions/${executionId}/trace`}
            className="card flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4 text-gray-400" />
            Download Playwright Trace
          </a>
        </div>
      </div>
    </div>
  );
}
