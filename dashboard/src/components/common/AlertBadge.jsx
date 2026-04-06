import { getStatusColor } from '../../utils/helpers';

export default function AlertBadge({ status, className = '' }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${getStatusColor(status)} ${className}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
