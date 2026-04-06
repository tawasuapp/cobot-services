import { useState, useEffect } from 'react';
import { MapPin, Clock, User, Truck, Bot, FileText, Calendar, Flag } from 'lucide-react';
import api from '../../services/api';
import Modal from './Modal';
import AlertBadge from './AlertBadge';
import LoadingSpinner from './LoadingSpinner';
import { formatDate, formatTime, formatCurrency, timeAgo } from '../../utils/helpers';

export default function JobDetailModal({ isOpen, onClose, jobId }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;
    setLoading(true);
    api.get(`/jobs/${jobId}`)
      .then(({ data }) => setJob(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, jobId]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={job?.job_number || 'Job Details'} size="lg">
      {loading || !job ? (
        <LoadingSpinner size="sm" />
      ) : (
        <div className="space-y-5">
          {/* Status + Priority row */}
          <div className="flex items-center gap-3 flex-wrap">
            <AlertBadge status={job.status} />
            <AlertBadge status={job.priority} />
            {job.is_recurring && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Recurring</span>
            )}
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Customer</h4>
            <p className="text-base font-semibold text-gray-900">{job.Customer?.company_name || '—'}</p>
            {job.Customer?.address && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <MapPin size={13} className="text-gray-400" /> {job.Customer.address}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={FileText} label="Service" value={job.service_type} />
            <InfoItem icon={Calendar} label="Scheduled" value={`${formatDate(job.scheduled_date)} at ${formatTime(job.scheduled_time)}`} />
            <InfoItem icon={Clock} label="Duration" value={job.estimated_duration_minutes ? `${job.estimated_duration_minutes} min` : '—'} />
            <InfoItem icon={Flag} label="Priority" value={job.priority} />
          </div>

          {/* Assignments */}
          <div className="bg-blue-50/50 rounded-xl p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Assignments</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-400">Operator</p>
                  <p className="text-sm font-medium text-gray-900">
                    {job.operator ? `${job.operator.first_name} ${job.operator.last_name}` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-400">Vehicle</p>
                  <p className="text-sm font-medium text-gray-900">
                    {job.vehicle ? `${job.vehicle.name} (${job.vehicle.plate_number})` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-600" />
                <div>
                  <p className="text-xs text-gray-400">Robot</p>
                  <p className="text-sm font-medium text-gray-900">
                    {job.robot ? `${job.robot.name} (${job.robot.serial_number})` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timing */}
          {(job.arrival_time || job.start_time || job.completion_time) && (
            <div className="grid grid-cols-3 gap-3 text-center">
              {job.arrival_time && (
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-purple-600 font-medium">Arrived</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{timeAgo(job.arrival_time)}</p>
                </div>
              )}
              {job.start_time && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-orange-600 font-medium">Started</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{timeAgo(job.start_time)}</p>
                </div>
              )}
              {job.completion_time && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-green-600 font-medium">Completed</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{timeAgo(job.completion_time)}</p>
                </div>
              )}
            </div>
          )}

          {/* Cost */}
          {(job.hourly_rate || job.total_cost) && (
            <div className="flex items-center gap-6 text-sm">
              {job.hourly_rate && <span className="text-gray-600">Rate: <strong>{formatCurrency(job.hourly_rate)}/hr</strong></span>}
              {job.total_cost && <span className="text-gray-600">Total: <strong>{formatCurrency(job.total_cost)}</strong></span>}
            </div>
          )}

          {/* Description / Notes */}
          {job.description && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Description</h4>
              <p className="text-sm text-gray-700">{job.description}</p>
            </div>
          )}
          {job.notes && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</h4>
              <p className="text-sm text-gray-700">{job.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-gray-400 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 capitalize">{value || '—'}</p>
      </div>
    </div>
  );
}
