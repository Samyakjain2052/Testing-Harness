import { clsx } from 'clsx';

type Status = 'queued' | 'running' | 'passed' | 'failed' | 'error' | 'cancelled' | 'skipped';

const statusConfig: Record<Status, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-gray-100 text-gray-700' },
  running: { label: 'Running', className: 'bg-blue-100 text-blue-700 animate-pulse' },
  passed: { label: 'Passed', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  error: { label: 'Error', className: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
  skipped: { label: 'Skipped', className: 'bg-yellow-100 text-yellow-700' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.error;

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {status === 'running' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
      )}
      {config.label}
    </span>
  );
}
