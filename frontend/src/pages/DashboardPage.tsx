import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, AppWindow, FlaskConical, CheckCircle2, TrendingUp } from 'lucide-react';
import { useApplications, useCreateApplication } from '../hooks/useApplications';
import { useDashboardStats } from '../hooks/useTestExecutions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function DashboardPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');

  const { data, isLoading } = useApplications({ search: search || undefined });
  const { data: stats } = useDashboardStats();
  const createApp = useCreateApplication();

  const apps = data?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    await createApp.mutateAsync({ name: newAppName, description: newAppDesc || undefined });
    setNewAppName('');
    setNewAppDesc('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Applications', value: stats.totalApps, icon: AppWindow, color: 'text-blue-600 bg-blue-50' },
            { label: 'Test Scripts', value: stats.totalScripts, icon: FlaskConical, color: 'text-purple-600 bg-purple-50' },
            { label: 'Pass Rate', value: `${stats.passRate}%`, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
            { label: 'Last 24h Runs', value: stats.recentExecutions, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Applications</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-1.5" />
          New Application
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applications..."
          className="input pl-9"
        />
      </div>

      {/* App grid */}
      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Create your first application to start testing."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-1.5" /> Create Application
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app: { id: string; name: string; description: string | null; created_at: string }) => (
            <Link key={app.id} to={`/apps/${app.id}`} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary-50 p-2">
                  <AppWindow className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{app.name}</h3>
              {app.description && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{app.description}</p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                Created {new Date(app.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleCreate} className="card p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Create Application</h2>
            <div>
              <label className="label">Name</label>
              <input
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                className="input"
                placeholder="My Web App"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                value={newAppDesc}
                onChange={(e) => setNewAppDesc(e.target.value)}
                className="input"
                rows={3}
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={createApp.isPending} className="btn-primary">
                {createApp.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
