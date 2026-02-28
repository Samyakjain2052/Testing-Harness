import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAppExecutions } from '../hooks/useTestExecutions';
import { useApplication } from '../hooks/useApplications';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function ExecutionHistoryPage() {
  const { appId } = useParams<{ appId: string }>();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: app } = useApplication(appId!);
  const { data, isLoading } = useAppExecutions(appId!, {
    page,
    limit: 25,
    status: statusFilter || undefined,
  });

  const executions = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={`/apps/${appId}`} className="hover:text-gray-700 flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> {app?.name || 'Back'}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Execution History</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Execution History</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-40"
        >
          <option value="">All statuses</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
          <option value="queued">Queued</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : executions.length === 0 ? (
        <EmptyState title="No executions found" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executions.map((exec: { id: string; status: string; duration_ms: number | null; started_at: string | null; completed_at: string | null }) => (
                  <tr key={exec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status as 'passed'} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/executions/${exec.id}`} className="text-primary-600 hover:underline font-mono text-xs">
                        {exec.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : '--'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {exec.started_at ? new Date(exec.started_at).toLocaleString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {exec.completed_at ? new Date(exec.completed_at).toLocaleString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
