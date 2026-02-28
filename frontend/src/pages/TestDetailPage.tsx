import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Play, Code } from 'lucide-react';
import { useTestScript, useTestScriptContent } from '../hooks/useTestScripts';
import { useScriptExecutions, useTriggerExecution } from '../hooks/useTestExecutions';
import { useEnvironments } from '../hooks/useEnvironments';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function TestDetailPage() {
  const { appId, scriptId } = useParams<{ appId: string; scriptId: string }>();
  const [selectedEnv, setSelectedEnv] = useState('');

  const { data: script, isLoading } = useTestScript(scriptId!);
  const { data: content, isLoading: loadingContent } = useTestScriptContent(scriptId!);
  const { data: execsData } = useScriptExecutions(scriptId!);
  const { data: envs } = useEnvironments(appId!);
  const triggerExec = useTriggerExecution();

  const executions = execsData?.data || [];

  if (isLoading) return <LoadingSpinner className="py-20" />;
  if (!script) return <p className="text-gray-500">Script not found</p>;

  const handleRun = async () => {
    if (!selectedEnv) {
      alert('Please select an environment');
      return;
    }
    await triggerExec.mutateAsync({ scriptId: scriptId!, environmentId: selectedEnv });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={`/apps/${appId}`} className="hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{script.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{script.name}</h1>
          {script.description && <p className="text-sm text-gray-500 mt-1">{script.description}</p>}
          <div className="flex gap-1 mt-2">
            {script.tags?.map((tag) => (
              <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="input w-48"
          >
            <option value="">Select environment</option>
            {envs?.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button onClick={handleRun} disabled={!selectedEnv || triggerExec.isPending} className="btn-primary">
            <Play className="h-4 w-4 mr-1.5" />
            {triggerExec.isPending ? 'Starting...' : 'Run Test'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Script content */}
        <div className="col-span-2 card">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <Code className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">test.spec.ts</span>
          </div>
          <div className="p-4 overflow-auto max-h-[600px]">
            {loadingContent ? (
              <LoadingSpinner />
            ) : (
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                {content || 'No content available'}
              </pre>
            )}
          </div>
        </div>

        {/* Execution history */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-sm font-medium text-gray-700">Recent Executions</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-auto">
            {executions.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">No executions yet</p>
            ) : (
              executions.map((exec: { id: string; status: string; duration_ms: number | null; created_at: string }) => (
                <Link
                  key={exec.id}
                  to={`/executions/${exec.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={exec.status as 'passed'} />
                    <span className="text-xs text-gray-400">
                      {exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : '--'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(exec.created_at).toLocaleString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
