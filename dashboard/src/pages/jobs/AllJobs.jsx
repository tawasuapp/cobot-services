import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Header from '../../components/common/Header';
import DataTable from '../../components/common/DataTable';
import AlertBadge from '../../components/common/AlertBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

const INITIAL_FORM = {
  customer_id: '',
  service_type: '',
  scheduled_date: '',
  scheduled_time: '',
  assigned_operator_id: '',
  assigned_vehicle_id: '',
  assigned_robot_id: '',
  priority: 'normal',
  description: '',
  notes: '',
};

export default function AllJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [robots, setRobots] = useState([]);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (customerSearch) params.customer = customerSearch;

      const res = await api.get('/jobs', { params });
      const data = res.data;
      setJobs(data.data || data);
      setPagination({
        page: data.page || page,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Failed to load jobs', err);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, customerSearch]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [custRes, opRes, vehRes, robRes] = await Promise.all([
        api.get('/customers'),
        api.get('/users/operators'),
        api.get('/vehicles'),
        api.get('/robots/available'),
      ]);
      setCustomers(custRes.data.data || custRes.data || []);
      setOperators(opRes.data.data || opRes.data || []);
      setVehicles(vehRes.data.data || vehRes.data || []);
      setRobots(robRes.data.data || robRes.data || []);
    } catch (err) {
      console.error('Failed to load dropdown data', err);
    }
  }, []);

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    fetchDropdownData();
    setShowCreateModal(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/jobs', form);
      toast.success('Job created successfully');
      setShowCreateModal(false);
      fetchJobs(1);
    } catch (err) {
      console.error('Failed to create job', err);
      toast.error(err.response?.data?.message || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      toast.success('Job deleted');
      fetchJobs(pagination.page);
    } catch (err) {
      console.error('Failed to delete job', err);
      toast.error('Failed to delete job');
    }
  };

  const columns = [
    { key: 'job_number', label: 'Job ID' },
    {
      key: 'customer',
      label: 'Customer',
      render: (_val, row) => row.Customer?.company_name || '-',
    },
    { key: 'service_type', label: 'Service Type' },
    {
      key: 'scheduled_date',
      label: 'Scheduled Date/Time',
      render: (_val, row) =>
        row.scheduled_date
          ? `${formatDate(row.scheduled_date)} ${formatTime(row.scheduled_time)}`
          : '-',
    },
    {
      key: 'assigned',
      label: 'Assigned',
      render: (_val, row) => {
        const parts = [];
        if (row.Operator?.first_name) parts.push(row.Operator.first_name);
        if (row.Robot?.serial_number) parts.push(row.Robot.serial_number);
        return parts.length > 0 ? parts.join(' / ') : '-';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'is_recurring',
      label: 'Recurring',
      render: (val) =>
        val ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Recurring
          </span>
        ) : null,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast('Edit functionality coming soon');
            }}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteJob(row.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading && jobs.length === 0) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="All Jobs" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => fetchJobs(1)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <div className="ml-auto">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Job
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={jobs}
          pagination={pagination}
          onPageChange={(page) => fetchJobs(page)}
          onRowClick={(row) => toast(`Job ${row.job_number} selected`)}
        />
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Job"
        size="lg"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <select
                value={form.customer_id}
                onChange={(e) => handleFormChange('customer_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <input
                type="text"
                value={form.service_type}
                onChange={(e) => handleFormChange('service_type', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => handleFormChange('scheduled_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Time
              </label>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => handleFormChange('scheduled_time', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Assigned Operator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Operator
              </label>
              <select
                value={form.assigned_operator_id}
                onChange={(e) => handleFormChange('assigned_operator_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select operator...</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.first_name} {o.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Vehicle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Vehicle
              </label>
              <select
                value={form.assigned_vehicle_id}
                onChange={(e) => handleFormChange('assigned_vehicle_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number || v.name || `Vehicle #${v.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Robot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Robot
              </label>
              <select
                value={form.assigned_robot_id}
                onChange={(e) => handleFormChange('assigned_robot_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select robot...</option>
                {robots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.serial_number} ({r.model || 'Robot'})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => handleFormChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
