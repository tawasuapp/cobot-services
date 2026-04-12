import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera, MapPin, Clock, User, FileText, Briefcase, Filter, Search,
  CheckCircle, Navigation, ExternalLink, Image as ImageIcon, QrCode,
  Activity, ChevronRight, X, Calendar
} from 'lucide-react';
import api from '../services/api';
import Header from '../components/common/Header';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import GoogleMapView, { MarkerF, PolylineF, pinIcon } from '../components/maps/GoogleMapView';
import { formatDate, formatDateTime, timeAgo } from '../utils/helpers';

const KIND_META = {
  activity: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Activity' },
  scan: { icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50', label: 'QR Scan' },
  report: { icon: Camera, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Report' },
};

function resolveFileUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://admin.cobot.qa${url}`;
}

export default function Reports() {
  const [jobs, setJobs] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ operator_id: '', date_from: '', date_to: '', status: '', q: '' });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.operator_id) params.operator_id = filters.operator_id;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/activity/operator-report', { params });
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to load operator activity', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    api.get('/users/operators').then(r => setOperators(r.data || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(j =>
      (j.job_number || '').toLowerCase().includes(q) ||
      (j.Customer?.company_name || '').toLowerCase().includes(q) ||
      (j.operator ? `${j.operator.first_name} ${j.operator.last_name}` : '').toLowerCase().includes(q)
    );
  }, [jobs, filters.q]);

  if (loading && !selected) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Operator Activity Report" subtitle={`${filtered.length} jobs · click a row to view full timeline`} />

      <div className="flex-1 overflow-hidden flex">
        {/* List */}
        <div className={`${selected ? 'hidden xl:flex' : 'flex'} flex-col flex-1 min-w-0 border-r border-gray-200 bg-white`}>
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by job #, customer or operator…"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Operator</label>
                <select
                  value={filters.operator_id}
                  onChange={(e) => setFilters({ ...filters, operator_id: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All operators</option>
                  {operators.map(o => (
                    <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                >
                  <option value="">All</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {(filters.operator_id || filters.date_from || filters.date_to || filters.status || filters.q) && (
                <button
                  onClick={() => setFilters({ operator_id: '', date_from: '', date_to: '', status: '', q: '' })}
                  className="text-sm text-blue-600 hover:text-blue-800 px-2 py-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Filter size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No activity found</p>
                <p className="text-sm">Try adjusting the filters above.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Job ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Operator</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Steps</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => setSelected(job)}
                      className={`cursor-pointer transition-colors ${selected?.id === job.id ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'}`}
                    >
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          {formatDate(job.scheduled_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{job.job_number}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{job.Customer?.company_name || '—'}</div>
                        {job.Customer?.address && (
                          <div className="text-xs text-gray-400 truncate max-w-[260px]">{job.Customer.address}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {job.operator ? `${job.operator.first_name} ${job.operator.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3"><AlertBadge status={job.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-0.5"><Activity size={11} /> {job.activity_count}</span>
                          <span className="inline-flex items-center gap-0.5"><QrCode size={11} /> {job.scan_count}</span>
                          <span className="inline-flex items-center gap-0.5"><Camera size={11} /> {job.report_count}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3"><ChevronRight size={14} className="text-gray-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <JobTimelinePanel job={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}

function JobTimelinePanel({ job, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoOpen, setPhotoOpen] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/activity/job/${job.id}/timeline`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [job.id]);

  const gpsPath = useMemo(() => {
    return (data?.gps_track || [])
      .filter(p => p.latitude && p.longitude)
      .map(p => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));
  }, [data]);

  const customer = data?.job?.Customer || job.Customer;
  const operator = data?.job?.operator || job.operator;

  const mapCenter = customer?.latitude && customer?.longitude
    ? { lat: Number(customer.latitude), lng: Number(customer.longitude) }
    : (gpsPath[0] || { lat: 25.2854, lng: 51.531 });

  return (
    <div className="w-full xl:w-[520px] 2xl:w-[600px] bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-white">
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold">Job Timeline</p>
          <h3 className="text-base font-bold text-gray-900 mt-0.5">
            {job.job_number} · {customer?.company_name || '—'}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <Calendar size={12} /> {formatDate(job.scheduled_date)}
            {operator && <><User size={12} className="ml-2" /> {operator.first_name} {operator.last_name}</>}
            <AlertBadge status={job.status} />
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* GPS Map */}
        {(gpsPath.length > 0 || customer?.latitude) && (
          <div className="h-56 border-b border-gray-200">
            <GoogleMapView
              center={mapCenter}
              zoom={gpsPath.length > 1 ? 14 : 16}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              {customer?.latitude && customer?.longitude && (
                <MarkerF
                  position={{ lat: Number(customer.latitude), lng: Number(customer.longitude) }}
                  icon={pinIcon('#f59e0b')}
                />
              )}
              {gpsPath.length > 1 && (
                <PolylineF
                  path={gpsPath}
                  options={{ strokeColor: '#3b82f6', strokeWeight: 3, strokeOpacity: 0.85 }}
                />
              )}
              {gpsPath.length > 0 && (
                <MarkerF position={gpsPath[gpsPath.length - 1]} icon={pinIcon('#22c55e')} />
              )}
            </GoogleMapView>
          </div>
        )}

        {/* Job summary */}
        <div className="p-4 bg-white border-b border-gray-200 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Service" value={job.service_type} />
          <Stat label="Customer ID" value={customer?.customer_code} mono />
          <Stat label="Started" value={data?.job?.start_time ? formatDateTime(data.job.start_time) : '—'} />
          <Stat label="Completed" value={data?.job?.completion_time ? formatDateTime(data.job.completion_time) : '—'} />
          <Stat label="Duration" value={data?.job?.actual_duration_minutes ? `${data.job.actual_duration_minutes} min` : '—'} />
          <Stat label="Address" value={customer?.address} />
        </div>

        {/* Timeline */}
        <div className="p-4">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Activity Timeline</p>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading timeline…</div>
          ) : !data || data.timeline.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No activity recorded for this job.</div>
          ) : (
            <ol className="relative border-l-2 border-gray-200 ml-2 space-y-4">
              {data.timeline.map((evt, i) => {
                const meta = KIND_META[evt.kind] || KIND_META.activity;
                const Icon = meta.icon;
                return (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ${meta.bg} ring-4 ring-gray-50`}>
                      <Icon size={11} className={meta.color} />
                    </span>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {(evt.action || '').replace(/_/g, ' ')}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(evt.timestamp)}</span>
                      </div>
                      {evt.description && <p className="text-sm text-gray-600 mt-0.5">{evt.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                        {evt.actor && <span className="inline-flex items-center gap-1"><User size={11} /> {evt.actor}</span>}
                        {evt.latitude && evt.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${evt.latitude},${evt.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Navigation size={11} /> {Number(evt.latitude).toFixed(5)}, {Number(evt.longitude).toFixed(5)}
                          </a>
                        )}
                      </div>
                      {evt.kind === 'report' && evt.file_url && (
                        <button
                          onClick={() => setPhotoOpen(evt)}
                          className="mt-2 flex items-center gap-2 w-full"
                        >
                          {(evt.file_type?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(evt.file_url)) ? (
                            <img
                              src={resolveFileUrl(evt.file_url)}
                              alt="Report"
                              className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg">
                              <FileText size={12} /> View attachment
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {photoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoOpen(null)}>
          <button className="absolute top-4 right-4 p-2 text-white" onClick={() => setPhotoOpen(null)}>
            <X size={24} />
          </button>
          <img
            src={resolveFileUrl(photoOpen.file_url)}
            alt="Report"
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div>
      <p className="text-gray-400 uppercase tracking-wider text-[10px] font-semibold">{label}</p>
      <p className={`text-gray-900 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}
