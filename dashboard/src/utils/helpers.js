import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date) {
  if (!date) return '-';
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatDateTime(date) {
  if (!date) return '-';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatTime(time) {
  if (!time) return '-';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function timeAgo(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount, currency = 'QAR') {
  if (amount == null) return '-';
  return `${currency} ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export const statusColors = {
  // Job statuses
  scheduled: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  en_route: 'bg-yellow-100 text-yellow-800',
  arrived: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  failed: 'bg-red-100 text-red-800',
  // Robot/Vehicle statuses
  available: 'bg-green-100 text-green-800',
  deployed: 'bg-blue-100 text-blue-800',
  cleaning: 'bg-cyan-100 text-cyan-800',
  returning: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  // Invoice statuses
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  // Priority
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
  // Health
  good: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
  // Partner tier
  standard: 'bg-gray-100 text-gray-800',
  silver: 'bg-slate-100 text-slate-800',
  gold: 'bg-amber-100 text-amber-800',
  platinum: 'bg-violet-100 text-violet-800',
};

export function getStatusColor(status) {
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}
