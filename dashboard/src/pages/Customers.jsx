import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  CheckCircle,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import DataTable from '../components/common/DataTable';
import AlertBadge from '../components/common/AlertBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/helpers';
import QRCodeModal from '../components/common/QRCodeModal';

const EMPTY_FORM = {
  customer_code: '',
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
  partner_tier: 'standard',
  portal_password: '',
  robots_required: 1,
  robot_map: '',
  non_robot_activities: '',
  notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [customerJobs, setCustomerJobs] = useState([]);
  const [jobsPagination, setJobsPagination] = useState(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      const list = res.data.data || res.data;
      setCustomers(list);
      setFiltered(list);
    } catch (err) {
      console.error('Failed to load customers', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      customers.filter(
        (c) =>
          c.company_name?.toLowerCase().includes(q) ||
          c.customer_code?.toLowerCase().includes(q) ||
          c.contact_person?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      )
    );
  }, [search, customers]);

  const fetchCustomerJobs = useCallback(async (customerId, page = 1) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/jobs`, {
        params: { page, limit: 10 },
      });
      setCustomerJobs(res.data.data || res.data);
      if (res.data.pagination) setJobsPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load customer jobs', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const selectCustomer = (customer) => {
    setSelected(customer);
    setJobsPage(1);
    fetchCustomerJobs(customer.id, 1);
  };

  const handleJobsPageChange = (page) => {
    setJobsPage(page);
    if (selected) fetchCustomerJobs(selected.id, page);
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selected) return;
    setForm({
      customer_code: selected.customer_code || '',
      company_name: selected.company_name || '',
      contact_person: selected.contact_person || '',
      email: selected.email || '',
      phone: selected.phone || '',
      address: selected.address || '',
      latitude: selected.latitude || '',
      longitude: selected.longitude || '',
      partner_tier: selected.partner_tier || 'standard',
      portal_password: '',
      robots_required: selected.robots_required ?? 1,
      robot_map: selected.robot_map || '',
      non_robot_activities: selected.non_robot_activities || '',
      notes: selected.notes || '',
    });
    setEditing(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editing && !payload.portal_password) delete payload.portal_password;

      if (editing) {
        await api.put(`/customers/${selected.id}`, payload);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer created');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    }
  };

  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleGenerateQR = () => {
    if (!selected) return;
    setQrModalOpen(true);
  };

  const activeJobs = customerJobs.filter((j) => j.status === 'in_progress' || j.status === 'assigned');
  const completedJobs = customerJobs.filter((j) => j.status === 'completed');

  const jobColumns = [
    { key: 'job_number', label: 'Job #' },
    { key: 'service_type', label: 'Service' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'scheduled_date',
      label: 'Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (val) => formatCurrency(val),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Customers" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Customer list */}
        <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={openAddModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus size={16} /> Add Customer
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                onClick={() => selectCustomer(customer)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selected?.id === customer.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{customer.company_name}</p>
                {customer.customer_code && (
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">{customer.customer_code}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <AlertBadge status={customer.partner_tier} />
                  <AlertBadge status={customer.status} />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No customers found</p>
            )}
          </div>
        </div>

        {/* Right panel - Customer details */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a customer to view details
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.company_name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selected.customer_code && (
                        <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {selected.customer_code}
                        </span>
                      )}
                      <AlertBadge status={selected.partner_tier} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openEditModal}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toast.success('Navigating to create job...')}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"
                    >
                      <Briefcase size={14} /> Create Job
                    </button>
                    <button
                      onClick={handleGenerateQR}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-1"
                    >
                      <QrCode size={14} /> Generate QR
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    {selected.email || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {selected.phone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    {selected.address || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="text-gray-400">Contact:</span>{' '}
                    {selected.contact_person || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Robot & Activity details */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  <span className="text-gray-400">Robots Required:</span>{' '}
                  {selected.robots_required ?? 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="text-gray-400">Robot Map:</span>{' '}
                  {selected.robot_map || 'N/A'}
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  <span className="text-gray-400">Non-Robot Activities:</span>{' '}
                  {selected.non_robot_activities || 'N/A'}
                </div>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <KPICard
                  title="Total Revenue"
                  value={formatCurrency(
                    customerJobs.reduce((sum, j) => sum + (j.total_amount || 0), 0)
                  )}
                  icon={DollarSign}
                  color="green"
                />
                <KPICard
                  title="Active Jobs"
                  value={activeJobs.length}
                  icon={Briefcase}
                  color="blue"
                />
                <KPICard
                  title="Completed Jobs"
                  value={completedJobs.length}
                  icon={CheckCircle}
                  color="purple"
                />
              </div>

              {/* Service history table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service History</h3>
                {detailLoading ? (
                  <LoadingSpinner />
                ) : (
                  <DataTable
                    columns={jobColumns}
                    data={customerJobs}
                    pagination={jobsPagination}
                    onPageChange={handleJobsPageChange}
                    emptyMessage="No service history found"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
              <input
                type="text"
                value={form.customer_code}
                onChange={(e) => setForm({ ...form, customer_code: e.target.value.toUpperCase() })}
                placeholder="Auto-generated (e.g. CUST-0001)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Used to generate the customer's QR code. Leave blank to auto-assign.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner Tier</label>
              <select
                value={form.partner_tier}
                onChange={(e) => setForm({ ...form, partner_tier: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal Password</label>
                <input
                  type="password"
                  value={form.portal_password}
                  onChange={(e) => setForm({ ...form, portal_password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Robots Required</label>
            <input
              type="number"
              min={0}
              value={form.robots_required}
              onChange={(e) => setForm({ ...form, robots_required: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Robot Map / Floor Plan Notes</label>
            <textarea
              rows={2}
              value={form.robot_map}
              onChange={(e) => setForm({ ...form, robot_map: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Non-Robot Activities Required</label>
            <textarea
              rows={2}
              value={form.non_robot_activities}
              onChange={(e) => setForm({ ...form, non_robot_activities: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        entityType="customer"
        entityId={selected?.id}
        entityName={selected?.company_name}
      />
    </div>
  );
}
