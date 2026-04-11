import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Header from '../../components/common/Header';
import DataTable from '../../components/common/DataTable';
import AlertBadge from '../../components/common/AlertBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, formatTime } from '../../utils/helpers';
import JobDetailModal from '../../components/common/JobDetailModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'en_route', label: 'En Route' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

const EMPTY_FORM = {
  customer_id: '',
  template_id: '',
  service_type: '',
  scheduled_date: '',
  scheduled_time: '',
  estimated_duration_minutes: '',
  assigned_operator_id: '',
  assigned_vehicle_id: '',
  assigned_robot_id: '',
  priority: 'normal',
  hourly_rate: '',
  description: '',
  notes: '',
};

export default function AllJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [robots, setRobots] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [viewJobId, setViewJobId] = useState(null);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/jobs', { params });
      const data = res.data;
      setJobs(data.data || data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchJobs(1); }, [fetchJobs]);

  const STATUS_SORT_ORDER = {
    in_progress: 0,
    en_route: 1,
    arrived: 2,
    assigned: 3,
    scheduled: 4,
    completed: 5,
    cancelled: 6,
  };

  const displayJobs = useMemo(() => {
    let sorted = [...jobs].sort((a, b) => {
      const orderA = STATUS_SORT_ORDER[a.status] ?? 4;
      const orderB = STATUS_SORT_ORDER[b.status] ?? 4;
      return orderA - orderB;
    });
    if (customerSearch.trim()) {
      const q = customerSearch.trim().toLowerCase();
      sorted = sorted.filter((j) =>
        (j.Customer?.company_name || '').toLowerCase().includes(q)
      );
    }
    return sorted;
  }, [jobs, customerSearch]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [custRes, opRes, vehRes, robRes, tplRes] = await Promise.all([
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/users/operators'),
        api.get('/vehicles'),
        api.get('/robots/available'),
        api.get('/templates'),
      ]);
      setCustomers(custRes.data.data || custRes.data || []);
      setOperators(opRes.data.data || opRes.data || []);
      setVehicles(vehRes.data.data || vehRes.data || []);
      setRobots(robRes.data.data || robRes.data || []);
      setTemplates(tplRes.data.data || tplRes.data || []);
    } catch {}
  }, []);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setEditingId(null);
    fetchDropdowns();
    setModalOpen(true);
  };

  const openEditModal = (job) => {
    setForm({
      customer_id: job.customer_id || '',
      template_id: job.template_id || '',
      service_type: job.service_type || '',
      scheduled_date: job.scheduled_date || '',
      scheduled_time: job.scheduled_time || '',
      estimated_duration_minutes: job.estimated_duration_minutes || '',
      assigned_operator_id: job.assigned_operator_id || '',
      assigned_vehicle_id: job.assigned_vehicle_id || '',
      assigned_robot_id: job.assigned_robot_id || '',
      priority: job.priority || 'normal',
      hourly_rate: job.hourly_rate || '',
      description: job.description || '',
      notes: job.notes || '',
    });
    setEditing(true);
    setEditingId(job.id);
    fetchDropdowns();
    setModalOpen(true);
  };

  const handleTemplateSelect = (templateId) => {
    setForm(prev => ({ ...prev, template_id: templateId }));
    if (templateId) {
      const tpl = templates.find(t => t.id === templateId);
      if (tpl) {
        setForm(prev => ({
          ...prev,
          template_id: templateId,
          service_type: tpl.service_type,
          estimated_duration_minutes: tpl.estimated_duration_minutes || '',
          hourly_rate: tpl.base_price || '',
          description: prev.description || tpl.description || '',
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/jobs/${editingId}`, form);
        toast.success('Job updated');
      } else {
        await api.post('/jobs', form);
        toast.success('Job created');
      }
      setModalOpen(false);
      fetchJobs(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job?')) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success('Job deleted');
      fetchJobs(pagination.page);
    } catch {
      toast.error('Failed to delete job');
    }
  };

  const columns = [
    { key: 'job_number', label: 'Job ID' },
    { key: 'customer', label: 'Customer', render: (_, row) => row.Customer?.company_name || '-' },
    { key: 'service_type', label: 'Service' },
    { key: 'scheduled', label: 'Scheduled', render: (_, row) => row.scheduled_date ? `${formatDate(row.scheduled_date)} ${formatTime(row.scheduled_time)}` : '-' },
    { key: 'assigned', label: 'Assigned', render: (_, row) => {
      const parts = [];
      if (row.operator?.first_name) parts.push(row.operator.first_name);
      if (row.robot?.name) parts.push(row.robot.name);
      return parts.length ? parts.join(' / ') : '-';
    }},
    { key: 'status', label: 'Status', render: (val) => <AlertBadge status={val} /> },
    { key: 'priority', label: 'Priority', render: (val) => <AlertBadge status={val} /> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEditModal(row); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Edit">
          <Pencil size={15} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    )},
  ];

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading && jobs.length === 0) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="All Jobs" actions={
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Plus size={16} /> New Job
        </button>
      } />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm w-48"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <button onClick={() => fetchJobs(1)} className="p-2 text-gray-400 hover:text-gray-700"><RefreshCw size={16} /></button>
        </div>

        <DataTable columns={columns} data={displayJobs} pagination={pagination} onPageChange={(p) => fetchJobs(p)} onRowClick={(row) => setViewJobId(row.id)} />
      </div>

      {/* Create / Edit Job Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Job' : 'Create Job'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Template</label>
              <select value={form.template_id} onChange={(e) => handleTemplateSelect(e.target.value)} className={inputClass}>
                <option value="">Select a template (auto-fills service details)...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.service_type} ({t.estimated_duration_minutes}min, {t.base_price} QAR)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select value={form.customer_id} onChange={(e) => setForm({...form, customer_id: e.target.value})} required className={inputClass}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <input type="text" value={form.service_type} onChange={(e) => setForm({...form, service_type: e.target.value})} required placeholder="Auto-filled from template" className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
              <input type="date" value={form.scheduled_date} onChange={(e) => setForm({...form, scheduled_date: e.target.value})} required className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time *</label>
              <input type="time" value={form.scheduled_time} onChange={(e) => setForm({...form, scheduled_time: e.target.value})} required className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (min)</label>
              <input type="number" value={form.estimated_duration_minutes} onChange={(e) => setForm({...form, estimated_duration_minutes: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (QAR)</label>
              <input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({...form, hourly_rate: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select value={form.assigned_operator_id} onChange={(e) => setForm({...form, assigned_operator_id: e.target.value})} className={inputClass}>
                <option value="">Select operator...</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
              <select value={form.assigned_vehicle_id} onChange={(e) => setForm({...form, assigned_vehicle_id: e.target.value})} className={inputClass}>
                <option value="">Select vehicle...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Robot</label>
              <select value={form.assigned_robot_id} onChange={(e) => setForm({...form, assigned_robot_id: e.target.value})} className={inputClass}>
                <option value="">Select robot...</option>
                {robots.map(r => <option key={r.id} value={r.id}>{r.name} ({r.serial_number})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})} className={inputClass}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Saving...' : editing ? 'Update Job' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>

      <JobDetailModal
        isOpen={!!viewJobId}
        onClose={() => setViewJobId(null)}
        jobId={viewJobId}
      />
    </div>
  );
}
