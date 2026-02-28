import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Eye, ChevronLeft, Settings, Circle, Square, Video } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useApplication } from '../hooks/useApplications';
import { useEnvironments, useCreateEnvironment } from '../hooks/useEnvironments';
import { useTestScripts } from '../hooks/useTestScripts';
import { useTriggerExecution, useAppExecutions } from '../hooks/useTestExecutions';
import { recordingsApi } from '../api/recordings.api';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function AppWorkspacePage() {
  const { appId } = useParams<{ appId: string }>();
  const [selectedEnv, setSelectedEnv] = useState('');
  const [tab, setTab] = useState<'scripts' | 'history'>('scripts');
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [showRecord, setShowRecord] = useState(false);

  const { data: app, isLoading: loadingApp } = useApplication(appId!);
  const { data: envs } = useEnvironments(appId!);
  const { data: scriptsData, isLoading: loadingScripts } = useTestScripts(appId!);
  const { data: execsData } = useAppExecutions(appId!, { limit: 20 });
  const triggerExec = useTriggerExecution();

  const scripts = scriptsData?.data || [];
  const executions = execsData?.data || [];

  // Auto-select first environment if only one exists
  useEffect(() => {
    if (!selectedEnv && envs && envs.length > 0) {
      setSelectedEnv(envs[0].id);
    }
  }, [envs, selectedEnv]);

  if (loadingApp) return <LoadingSpinner className="py-20" />;
  if (!app) return <p className="text-gray-500">Application not found</p>;

  const selectedEnvData = envs?.find((e) => e.id === selectedEnv);

  const handleRunTest = async (scriptId: string) => {
    if (!selectedEnv) {
      alert('Please select an environment first');
      return;
    }
    await triggerExec.mutateAsync({ scriptId, environmentId: selectedEnv });
  };

  const handleWatchTest = async (scriptId: string) => {
    if (!selectedEnv) {
      alert('Please select an environment first');
      return;
    }
    await triggerExec.mutateAsync({
      scriptId,
      environmentId: selectedEnv,
      options: { headless: false, slowMo: 500, captureScreenshots: 'always', captureTrace: 'always' },
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{app.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{app.name}</h1>
          {app.description && <p className="text-sm text-gray-500 mt-1">{app.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Environment selector */}
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="input w-48"
          >
            <option value="">Select environment</option>
            {envs?.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
          <button onClick={() => setShowEnvForm(true)} className="btn-ghost btn-sm" title="Add Environment">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['scripts', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'scripts' ? 'Test Scripts' : 'Execution History'}
            </button>
          ))}
        </nav>
      </div>

      {/* Scripts Tab */}
      {tab === 'scripts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{scripts.length} script{scripts.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowRecord(true)} className="btn-primary btn-sm">
              <Circle className="h-3.5 w-3.5 mr-1.5 text-red-300" /> Record New Test
            </button>
          </div>

          {loadingScripts ? (
            <LoadingSpinner />
          ) : scripts.length === 0 ? (
            <EmptyState
              title="No test scripts yet"
              description="Record your first test — Playwright opens a browser and captures every action as code."
              action={
                <button onClick={() => setShowRecord(true)} className="btn-primary">
                  <Video className="h-4 w-4 mr-1.5" /> Record a Test
                </button>
              }
            />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scripts.map((script: { id: string; name: string; description: string | null; tags: string[]; created_at: string }) => (
                    <tr key={script.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/apps/${appId}/scripts/${script.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {script.name}
                        </Link>
                        {script.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                            {script.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {script.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(script.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRunTest(script.id)}
                            disabled={!selectedEnv || triggerExec.isPending}
                            className="btn-primary btn-sm"
                            title={!selectedEnv ? 'Select an environment first' : 'Run headless'}
                          >
                            <Play className="h-3.5 w-3.5 mr-1" /> Run
                          </button>
                          <button
                            onClick={() => handleWatchTest(script.id)}
                            disabled={!selectedEnv || triggerExec.isPending}
                            className="btn-secondary btn-sm"
                            title={!selectedEnv ? 'Select an environment first' : 'Run with visible browser'}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Watch
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {executions.length === 0 ? (
            <EmptyState title="No executions yet" description="Run a test to see results here." />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Execution ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {executions.map((exec: { id: string; status: string; duration_ms: number | null; created_at: string }) => (
                    <tr key={exec.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <StatusBadge status={exec.status as 'passed'} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/executions/${exec.id}`}
                          className="text-primary-600 hover:underline font-mono text-xs"
                        >
                          {exec.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(exec.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Dialog */}
      {showRecord && (
        <RecordDialog
          appId={appId!}
          defaultUrl={selectedEnvData?.base_url}
          onClose={() => setShowRecord(false)}
        />
      )}

      {/* Add Environment Dialog */}
      {showEnvForm && <EnvFormDialog appId={appId!} onClose={() => setShowEnvForm(false)} />}
    </div>
  );
}

function EnvFormDialog({ appId, onClose }: { appId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const create = useCreateEnvironment(appId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({ name, base_url: baseUrl });
    onClose();
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md space-y-4">
        <h2 className="text-base font-semibold">Add Environment</h2>
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Development" required />
        </div>
        <div>
          <label className="label">Base URL</label>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="input" placeholder="https://dev.myapp.com" required />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

type RecordStep = 'setup' | 'recording' | 'saving' | 'saved';

function RecordDialog({
  appId,
  defaultUrl,
  onClose,
}: {
  appId: string;
  defaultUrl?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<RecordStep>('setup');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState(defaultUrl ?? '');
  const [sessionId, setSessionId] = useState('');
  const [sessionStatus, setSessionStatus] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll session status while recording
  useEffect(() => {
    if (step !== 'recording' || !sessionId) return;

    const poll = async () => {
      try {
        const s = await recordingsApi.getStatus(sessionId);
        setSessionStatus(s.status);
        if (s.error) setError(s.error);
        if (s.status === 'completed' || s.status === 'failed' || s.status === 'error') {
          stopPolling();
        }
      } catch {
        // Transient poll errors are fine
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);

    return stopPolling;
  }, [step, sessionId, stopPolling]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      const session = await recordingsApi.start(appId, { target_url: targetUrl, name });
      setSessionId(session.sessionId);
      setSessionStatus(session.status);
      setStep('recording');
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(apiMsg || `Failed to start recording: ${msg}`);
    } finally {
      setStarting(false);
    }
  };

  const handleSave = async () => {
    setStep('saving');
    setError('');
    stopPolling();
    try {
      await recordingsApi.save(sessionId, { name, description: description || undefined });
      await queryClient.invalidateQueries({ queryKey: ['test-scripts', appId] });
      setStep('saved');
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(apiMsg || 'Failed to save recording. Check the backend logs for details.');
      setStep('recording');
    }
  };

  const handleStop = async () => {
    setStopping(true);
    setError('');
    try {
      const result = await recordingsApi.stop(sessionId);
      setSessionStatus(result.status);
      stopPolling();
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(apiMsg || 'Failed to stop recording');
    } finally {
      setStopping(false);
    }
  };

  const handleDiscard = () => {
    stopPolling();
    onClose();
  };

  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card p-6 w-full max-w-lg space-y-4">

        {/* Step 1: Setup */}
        {step === 'setup' && (
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Video className="h-5 w-5 text-red-500" /> Record a Test
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Playwright opens a Chromium browser. Click through your app — every action is captured as a reusable test script.
              </p>
            </div>
            <div>
              <label className="label">Test Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Login Flow"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={2}
                placeholder="What does this test verify?"
              />
            </div>
            <div>
              <label className="label">Target URL</label>
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="input"
                placeholder="https://dev.myapp.com"
                type="url"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Base URL will be stripped so the script can run against any environment.
              </p>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={starting} className="btn-primary">
                {starting ? 'Opening browser…' : (
                  <>
                    <Circle className="h-3.5 w-3.5 mr-1.5 text-red-300" /> Start Recording
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Recording */}
        {step === 'recording' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Recording: {name}</h2>

            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
              sessionStatus === 'completed'
                ? 'bg-green-50 border border-green-200'
                : sessionStatus === 'failed' || sessionStatus === 'error'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {sessionStatus === 'completed' ? (
                <>
                  <span className="inline-flex rounded-full h-3 w-3 bg-green-500" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Browser closed — ready to save</p>
                    <p className="text-xs text-green-600 mt-0.5">Your recorded actions have been captured.</p>
                  </div>
                </>
              ) : sessionStatus === 'failed' || sessionStatus === 'error' ? (
                <>
                  <span className="inline-flex rounded-full h-3 w-3 bg-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Recording {sessionStatus}</p>
                    <p className="text-xs text-yellow-600 mt-0.5">{error || 'Something went wrong.'}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-red-800">Playwright browser is open</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Interact with your app. Close the browser when done.
                    </p>
                  </div>
                </>
              )}
            </div>

            {sessionStatus === 'recording' && (
              <>
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg px-4 py-3">
                  <p className="font-medium text-gray-700">Tips:</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li>Click, type, and navigate as a normal user would</li>
                    <li>The Playwright Inspector shows generated code in real-time</li>
                    <li>When finished, click "Done Recording" below</li>
                  </ul>
                </div>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="w-full py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  {stopping ? 'Stopping…' : 'Done Recording'}
                </button>
              </>
            )}

            {error && sessionStatus !== 'failed' && sessionStatus !== 'error' && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={handleDiscard} className="btn-secondary">
                <Square className="h-3.5 w-3.5 mr-1.5" /> Discard
              </button>
              <button
                onClick={handleSave}
                disabled={sessionStatus === 'recording'}
                className="btn-primary"
                title={sessionStatus === 'recording' ? 'Close the Playwright browser first' : 'Save the recorded script'}
              >
                Save Recording
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Saving */}
        {step === 'saving' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <LoadingSpinner />
            <p className="text-sm text-gray-600">Parameterizing URLs and saving script…</p>
            <p className="text-xs text-gray-400">Uploading to Azure Blob Storage</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'saved' && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Test recorded successfully!</p>
              <p className="text-xs text-gray-500 mt-1">"{name}" is now in your scripts list, ready to run.</p>
            </div>
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        )}

      </div>
    </dialog>
  );
}
