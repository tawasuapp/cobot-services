import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  Wrench,
  CreditCard,
  Monitor,
  MapPin,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { timeAgo } from '../utils/helpers';

const TYPE_ICONS = {
  late_arrival: Clock,
  job_delay: AlertTriangle,
  maintenance_due: Wrench,
  payment_overdue: CreditCard,
  system: Monitor,
  arrival_notification: MapPin,
};

const SEVERITY_STYLES = {
  info: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    icon: 'text-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  critical: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700',
  },
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'job_delay', label: 'Job Delay' },
  { value: 'maintenance_due', label: 'Maintenance Due' },
  { value: 'payment_overdue', label: 'Payment Overdue' },
  { value: 'system', label: 'System' },
  { value: 'arrival_notification', label: 'Arrival Notification' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await api.get('/alerts', { params });
      setAlerts(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMarkRead = async (alert) => {
    try {
      await api.put(`/alerts/${alert.id}/read`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, read: true, is_read: true } : a))
      );
    } catch (err) {
      toast.error('Failed to mark alert as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = alerts.filter((a) => !a.read && !a.is_read);
      await Promise.all(unread.map((a) => api.put(`/alerts/${a.id}/read`)));
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true, is_read: true })));
      toast.success('All alerts marked as read');
    } catch (err) {
      toast.error('Failed to mark all alerts as read');
    }
  };

  const filteredAlerts = alerts;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Alerts" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>
        </div>

        {/* Alert Cards */}
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p>No alerts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const isUnread = !alert.read && !alert.is_read;
              const severity = alert.severity || 'info';
              const styles = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;
              const IconComponent = TYPE_ICONS[alert.type] || Bell;

              return (
                <div
                  key={alert.id}
                  onClick={() => isUnread && handleMarkRead(alert)}
                  className={`border-l-4 rounded-xl p-4 transition-colors ${styles.border} ${
                    isUnread ? 'bg-blue-50 cursor-pointer hover:bg-blue-100/60' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${styles.bg}`}>
                      <IconComponent size={18} className={styles.icon} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {alert.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                          {severity}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{timeAgo(alert.created_at)}</span>
                        <span className="capitalize">{(alert.type || '').replace(/_/g, ' ')}</span>
                        {alert.related_entity_type && (
                          <span className="text-blue-500">
                            {alert.related_entity_type} #{alert.related_entity_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
