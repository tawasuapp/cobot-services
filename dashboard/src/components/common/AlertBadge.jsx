import { getStatusColor } from '../../utils/helpers';

export default function AlertBadge({ status, className = '' }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
