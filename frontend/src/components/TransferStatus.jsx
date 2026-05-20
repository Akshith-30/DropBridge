import { cn } from '../lib/cn';

const statusStyles = {
  PENDING: 'bg-accent-gold/15 text-accent-gold',
  CONNECTING: 'bg-accent-blue/15 text-accent-blue',
  TRANSFERRING: 'bg-accent-purple/15 text-accent-purple',
  READY: 'bg-accent-blue/15 text-blue-400',
  COMPLETED: 'bg-accent-green/15 text-accent-green',
  FAILED: 'bg-red-500/15 text-red-400',
  EXPIRED: 'bg-gray-500/15 text-gray-400',
};

const labels = {
  READY: 'Ready',
  TRANSFERRING: 'Downloading',
  COMPLETED: 'Completed',
  CONNECTING: 'Connecting',
};

export default function TransferStatusBadge({ status }) {
  return (
    <span
      className={cn(
        'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide',
        statusStyles[status] || statusStyles.PENDING
      )}
      id="transfer-status-badge"
    >
      {labels[status] || status}
    </span>
  );
}
