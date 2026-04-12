import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, ExternalLink, Clock, Calendar, User, Paperclip, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function formatDuration(mins) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function formatTime(t) {
  if (!t) return null;
  try {
    const d = typeof t === 'string' && t.length <= 8 ? new Date(`1970-01-01T${t}`) : new Date(t);
    return format(d, 'h:mm a');
  } catch {
    return null;
  }
}

const statusColors = {
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  en_route: 'bg-indigo-100 text-indigo-700',
  arrived: 'bg-indigo-100 text-indigo-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

function JobCard({ job, expandedDefault }) {
  const [tab, setTab] = useState('summary');
  const [open, setOpen] = useState(expandedDefault);
  const reports = job.reports || [];
  const attachments = reports.filter(r => r.file_url);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4 text-left">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">{job.job_number}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                {job.status?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{job.service_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar size={14} />
            {job.scheduled_date ? format(parseISO(job.scheduled_date), 'MMM d, yyyy') : '—'}
          </div>
          {attachments.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Paperclip size={14} /> {attachments.length}
            </div>
          )}
          {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab('summary')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${tab === 'summary' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Work Summary
            </button>
            <button
              onClick={() => setTab('attachments')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${tab === 'attachments' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Attachments
              {attachments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{attachments.length}</span>
              )}
            </button>
          </div>

          {tab === 'summary' && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Scheduled</p>
                <p className="text-sm text-gray-900 flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  {job.scheduled_date ? format(parseISO(job.scheduled_date), 'EEE, MMM d, yyyy') : '—'}
                  {job.scheduled_time && <span className="text-gray-500">· {formatTime(job.scheduled_time)}</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Operator</p>
                <p className="text-sm text-gray-900 flex items-center gap-1.5">
                  <User size={14} className="text-gray-400" />
                  {job.operator ? `${job.operator.first_name || ''} ${job.operator.last_name || ''}`.trim() || '—' : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Cleaning Window</p>
                <p className="text-sm text-gray-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  {job.start_time ? format(new Date(job.start_time), 'MMM d, h:mm a') : '—'}
                  <span className="text-gray-400">→</span>
                  {job.completion_time ? format(new Date(job.completion_time), 'h:mm a') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Duration</p>
                <p className="text-sm text-gray-900">
                  {formatDuration(job.actual_duration_minutes)}
                  {job.estimated_duration_minutes ? (
                    <span className="text-gray-400 text-xs ml-2">(est. {formatDuration(job.estimated_duration_minutes)})</span>
                  ) : null}
                </p>
              </div>
              {job.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase mb-1">Description</p>
                  <p className="text-sm text-gray-700">{job.description}</p>
                </div>
              )}
              {job.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{job.notes}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'attachments' && (
            <div className="p-5">
              {attachments.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-6">
                  <Paperclip className="mx-auto text-gray-300 mb-2" size={28} />
                  No attachments uploaded by operator yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {attachments.map(att => {
                    const isImg = att.file_type?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.file_url);
                    return (
                      <li key={att.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                            {isImg ? <ImageIcon size={18} className="text-gray-500" /> : <FileText size={18} className="text-gray-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {att.report_type?.replace('_', ' ') || 'Attachment'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {att.uploader ? `${att.uploader.first_name || ''} ${att.uploader.last_name || ''}`.trim() : 'Operator'}
                              {att.uploaded_at && ` · ${format(new Date(att.uploaded_at), 'MMM d, yyyy h:mm a')}`}
                            </p>
                            {att.description && <p className="text-xs text-gray-600 mt-0.5">{att.description}</p>}
                          </div>
                        </div>
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium shrink-0"
                        >
                          <ExternalLink size={14} />
                          View
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { customer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const focusJob = searchParams.get('job');
  const statusParam = searchParams.get('status');

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await api.get(`/customers/${customer.id}/reports`, { params });
        setJobs(res.data?.data || res.data || []);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [customer.id, dateFrom, dateTo]);

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (statusParam === 'active') {
      list = list.filter(j => ['in_progress', 'scheduled', 'assigned', 'en_route', 'arrived'].includes(j.status));
    } else if (statusParam === 'pending') {
      list = list.filter(j => ['scheduled', 'assigned'].includes(j.status));
    } else if (statusParam === 'completed') {
      list = list.filter(j => j.status === 'completed');
    }
    return list;
  }, [jobs, statusParam]);

  const updateStatus = (s) => {
    const next = new URLSearchParams(searchParams);
    if (!s || s === 'all') next.delete('status'); else next.set('status', s);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Work Reports</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {[
              { v: 'all', label: 'All' },
              { v: 'pending', label: 'Pending' },
              { v: 'active', label: 'Active' },
              { v: 'completed', label: 'Completed' },
            ].map(s => (
              <button key={s.v} onClick={() => updateStatus(s.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${(statusParam || 'all') === s.v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No work reports found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              expandedDefault={focusJob ? job.job_number === focusJob : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
