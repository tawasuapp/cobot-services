import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CreditCard,
  Plus,
  Eye,
  CheckCircle,
  Download,
  Pencil,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import DataTable from '../components/common/DataTable';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/helpers';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    customer_id: '',
    job_id: '',
    amount: '',
    tax_amount: '',
    due_date: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [invoicesRes, revenueRes, customersRes, jobsRes] = await Promise.all([
        api.get('/invoices', { params: { page, limit: 10 } }),
        api.get('/analytics/revenue'),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/jobs', { params: { limit: 100 } }),
      ]);

      const invoiceData = invoicesRes.data.data || invoicesRes.data;
      setInvoices(invoiceData);
      setPagination(invoicesRes.data.pagination || null);
      setRevenue(revenueRes.data);
      setCustomers(customersRes.data.data || customersRes.data);
      setJobs(jobsRes.data.data || jobsRes.data);
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute KPIs from invoices
  const allInvoices = invoices;
  const paidInvoices = allInvoices.filter((inv) => inv.status === 'paid');
  const pendingInvoices = allInvoices.filter((inv) => inv.status === 'pending');
  const overdueInvoices = allInvoices.filter((inv) => inv.status === 'overdue');

  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const avgPaymentDays = paidInvoices.length > 0
    ? Math.round(
        paidInvoices.reduce((sum, inv) => {
          const issued = new Date(inv.issue_date || inv.created_at);
          const paid = new Date(inv.paid_at || inv.updated_at);
          return sum + (paid - issued) / (1000 * 60 * 60 * 24);
        }, 0) / paidInvoices.length
      )
    : 0;

  // Revenue by service type from invoices
  const serviceTypeMap = {};
  allInvoices.forEach((inv) => {
    const type = inv.Job?.service_type || inv.service_type || 'Other';
    serviceTypeMap[type] = (serviceTypeMap[type] || 0) + Number(inv.total_amount || 0);
  });
  const revenueByService = Object.entries(serviceTypeMap).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const kpiCards = [
    {
      title: 'Total Revenue YTD',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'green',
    },
    {
      title: 'Pending Payments',
      value: `${pendingInvoices.length} (${formatCurrency(pendingAmount)})`,
      icon: CreditCard,
      color: 'orange',
    },
    {
      title: 'Overdue',
      value: `${overdueInvoices.length} (${formatCurrency(overdueAmount)})`,
      icon: AlertTriangle,
      color: 'red',
    },
    {
      title: 'Avg Payment Time',
      value: `${avgPaymentDays} days`,
      icon: Clock,
      color: 'blue',
    },
  ];

  const handleMarkPaid = async (invoice) => {
    try {
      await api.put(`/invoices/${invoice.id}/status`, { status: 'paid' });
      toast.success(`Invoice ${invoice.invoice_number} marked as paid`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update invoice status');
    }
  };

  const openEditModal = (invoice) => {
    setCreateForm({
      customer_id: invoice.customer_id || invoice.Customer?.id || '',
      job_id: invoice.job_id || '',
      amount: invoice.amount ?? '',
      tax_amount: invoice.tax_amount ?? '',
      due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
      notes: invoice.notes || '',
    });
    setEditingInvoice(invoice);
    setShowCreateModal(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const amount = parseFloat(createForm.amount) || 0;
      const taxAmount = parseFloat(createForm.tax_amount) || 0;
      const payload = {
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || undefined,
        amount,
        tax_amount: taxAmount,
        total_amount: amount + taxAmount,
        due_date: createForm.due_date,
        notes: createForm.notes,
      };
      if (editingInvoice) {
        await api.put(`/invoices/${editingInvoice.id}`, payload);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/invoices', payload);
        toast.success('Invoice created successfully');
      }
      setShowCreateModal(false);
      setEditingInvoice(null);
      setCreateForm({ customer_id: '', job_id: '', amount: '', tax_amount: '', due_date: '', notes: '' });
      fetchData();
    } catch (err) {
      toast.error(editingInvoice ? 'Failed to update invoice' : 'Failed to create invoice');
    }
  };

  const invoiceColumns = [
    { key: 'invoice_number', label: 'Invoice #' },
    {
      key: 'customer',
      label: 'Customer',
      render: (_val, row) => row.Customer?.company_name || '-',
    },
    {
      key: 'issue_date',
      label: 'Issue Date',
      render: (val) => formatDate(val),
    },
    {
      key: 'total_amount',
      label: 'Amount',
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
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setViewInvoice(row); setShowViewModal(true); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          {row.status !== 'paid' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleMarkPaid(row); }}
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Mark Paid"
            >
              <CheckCircle size={16} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toast('PDF generation coming soon'); }}
            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
        </div>
      ),
    },
  ];

  const totalAmount = parseFloat(createForm.amount || 0) + parseFloat(createForm.tax_amount || 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Finance" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((kpi) => (
            <KPICard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} color={kpi.color} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Over Time */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Service Type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Revenue by Service Type</h3>
            {revenueByService.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={revenueByService}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {revenueByService.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Recent Invoices</h3>
            <button
              onClick={() => {
                setEditingInvoice(null);
                setCreateForm({ customer_id: '', job_id: '', amount: '', tax_amount: '', due_date: '', notes: '' });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Invoice
            </button>
          </div>
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            pagination={pagination}
            onPageChange={setPage}
            emptyMessage="No invoices found"
          />
        </div>
      </div>

      {/* View Invoice Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Invoice Details" size="md">
        {viewInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Invoice Number:</span>
                <p className="font-medium text-gray-900">{viewInvoice.invoice_number}</p>
              </div>
              <div>
                <span className="text-gray-400">Customer:</span>
                <p className="font-medium text-gray-900">{viewInvoice.Customer?.company_name || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Amount:</span>
                <p className="font-medium text-gray-900">{formatCurrency(viewInvoice.amount)}</p>
              </div>
              <div>
                <span className="text-gray-400">Tax:</span>
                <p className="font-medium text-gray-900">{formatCurrency(viewInvoice.tax_amount)}</p>
              </div>
              <div>
                <span className="text-gray-400">Total:</span>
                <p className="font-medium text-gray-900">{formatCurrency(viewInvoice.total_amount)}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <div className="mt-0.5"><AlertBadge status={viewInvoice.status} /></div>
              </div>
              <div>
                <span className="text-gray-400">Issue Date:</span>
                <p className="font-medium text-gray-900">{viewInvoice.issue_date ? formatDate(viewInvoice.issue_date) : '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Due Date:</span>
                <p className="font-medium text-gray-900">{viewInvoice.due_date ? formatDate(viewInvoice.due_date) : '-'}</p>
              </div>
              <div>
                <span className="text-gray-400">Payment Method:</span>
                <p className="font-medium text-gray-900 capitalize">{viewInvoice.payment_method || '-'}</p>
              </div>
              {viewInvoice.paid_at && (
                <div>
                  <span className="text-gray-400">Paid At:</span>
                  <p className="font-medium text-gray-900">{formatDate(viewInvoice.paid_at)}</p>
                </div>
              )}
            </div>
            {viewInvoice.notes && (
              <div className="text-sm">
                <span className="text-gray-400">Notes:</span>
                <p className="text-gray-700 mt-1">{viewInvoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create / Edit Invoice Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setEditingInvoice(null); }} title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'} size="md">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={createForm.customer_id}
              onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job (optional)</label>
            <select
              value={createForm.job_id}
              onChange={(e) => setCreateForm({ ...createForm, job_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title || `Job #${j.id}`}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={createForm.tax_amount}
                onChange={(e) => setCreateForm({ ...createForm, tax_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-600">Total Amount: </span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={createForm.due_date}
              onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreateModal(false); setEditingInvoice(null); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
