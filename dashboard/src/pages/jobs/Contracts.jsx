import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  FileText,
  DollarSign,
  AlertTriangle,
  RefreshCw as Repeat,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Header from '../../components/common/Header';
import KPICard from '../../components/common/KPICard';
import DataTable from '../../components/common/DataTable';
import AlertBadge from '../../components/common/AlertBadge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/helpers';

const CONTRACT_TYPE_OPTIONS = [
  { value: 'one_time', label: 'One Time' },
  { value: 'recurring', label: 'Recurring' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const INITIAL_FORM = {
  customer_id: '',
  contract_type: 'one_time',
  frequency: '',
  start_date: '',
  end_date: '',
  total_value: '',
  auto_renew: false,
  terms: '',
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // View modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewContract, setViewContract] = useState(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);

  const fetchContracts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/contracts', { params: { page, limit: 20 } });
      const data = res.data;
      setContracts(data.data || data);
      setPagination({
        page: data.page || page,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      });
    } catch (err) {
      console.error('Failed to load contracts', err);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts(1);
  }, [fetchContracts]);

  // Derive KPIs from contracts list
  const kpis = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const active = contracts.filter((c) => c.status === 'active');
    const totalAnnualValue = active.reduce(
      (sum, c) => sum + (parseFloat(c.total_value) || 0),
      0
    );
    const expiringSoon = contracts.filter((c) => {
      if (c.status !== 'active' || !c.end_date) return false;
      const endDate = new Date(c.end_date);
      return endDate >= now && endDate <= thirtyDaysFromNow;
    });
    const autoRenewals = contracts.filter((c) => c.auto_renew).length;

    return {
      activeContracts: active.length,
      totalAnnualValue,
      expiringSoon: expiringSoon.length,
      autoRenewals,
    };
  }, [contracts]);

  const kpiCards = [
    {
      title: 'Active Contracts',
      value: kpis.activeContracts,
      icon: FileText,
      color: 'blue',
    },
    {
      title: 'Total Annual Value',
      value: formatCurrency(kpis.totalAnnualValue),
      icon: DollarSign,
      color: 'green',
    },
    {
      title: 'Expiring in 30 Days',
      value: kpis.expiringSoon,
      icon: AlertTriangle,
      color: 'orange',
    },
    {
      title: 'Auto-Renewals',
      value: kpis.autoRenewals,
      icon: Repeat,
      color: 'purple',
    },
  ];

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  }, []);

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    fetchCustomers();
    setShowCreateModal(true);
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (payload.contract_type !== 'recurring') {
        delete payload.frequency;
      }
      await api.post('/contracts', payload);
      toast.success('Contract created successfully');
      setShowCreateModal(false);
      fetchContracts(1);
    } catch (err) {
      console.error('Failed to create contract', err);
      toast.error(err.response?.data?.message || 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'contract_number', label: 'Contract Number' },
    {
      key: 'customer',
      label: 'Customer',
      render: (_val, row) => row.Customer?.company_name || '-',
    },
    {
      key: 'contract_type',
      label: 'Type',
      render: (val) => (
        <span className="capitalize">{val?.replace('_', ' ') || '-'}</span>
      ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (val) => (
        <span className="capitalize">{val || '-'}</span>
      ),
    },
    {
      key: 'date_range',
      label: 'Date Range',
      render: (_val, row) =>
        row.start_date && row.end_date
          ? `${formatDate(row.start_date)} - ${formatDate(row.end_date)}`
          : '-',
    },
    {
      key: 'total_value',
      label: 'Total Value',
      render: (val) => formatCurrency(val),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_val, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setViewContract(row);
            setShowViewModal(true);
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  if (loading && contracts.length === 0) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Contracts" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
            />
          ))}
        </div>

        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            All Contracts ({contracts.length})
          </h3>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Create Contract
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={contracts}
          pagination={pagination}
          onPageChange={(page) => fetchContracts(page)}
          onRowClick={(row) => { setViewContract(row); setShowViewModal(true); }}
        />
      </div>

      {/* View Contract Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Contract Details"
        size="lg"
      >
        {viewContract && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Contract Number:</span>
                <p className="font-medium text-gray-900">{viewContract.contract_number}</p>
              </div>
              <div>
                <span className="text-gray-400">Customer:</span>
                <p className="font-medium text-gray-900">{viewContract.Customer?.company_name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <p className="font-medium text-gray-900 capitalize">{viewContract.contract_type?.replace('_', ' ') || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Frequency:</span>
                <p className="font-medium text-gray-900 capitalize">{viewContract.frequency || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Start Date:</span>
                <p className="font-medium text-gray-900">{viewContract.start_date ? formatDate(viewContract.start_date) : '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">End Date:</span>
                <p className="font-medium text-gray-900">{viewContract.end_date ? formatDate(viewContract.end_date) : '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Total Value:</span>
                <p className="font-medium text-gray-900">{formatCurrency(viewContract.total_value)}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <div className="mt-0.5"><AlertBadge status={viewContract.status} /></div>
              </div>
              <div>
                <span className="text-gray-400">Auto-Renew:</span>
                <p className="font-medium text-gray-900">{viewContract.auto_renew ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {viewContract.terms && (
              <div className="text-sm">
                <span className="text-gray-400">Terms:</span>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{viewContract.terms}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Contract Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Contract"
        size="lg"
      >
        <form onSubmit={handleCreateContract} className="space-y-4">
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

            {/* Contract Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Type
              </label>
              <select
                value={form.contract_type}
                onChange={(e) => handleFormChange('contract_type', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CONTRACT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency (conditional) */}
            {form.contract_type === 'recurring' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) => handleFormChange('frequency', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select frequency...</option>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => handleFormChange('start_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => handleFormChange('end_date', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Value
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.total_value}
                onChange={(e) => handleFormChange('total_value', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auto Renew */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_renew"
              checked={form.auto_renew}
              onChange={(e) => handleFormChange('auto_renew', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto_renew" className="text-sm font-medium text-gray-700">
              Auto-renew contract
            </label>
          </div>

          {/* Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms
            </label>
            <textarea
              value={form.terms}
              onChange={(e) => handleFormChange('terms', e.target.value)}
              rows={4}
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
              {submitting ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
