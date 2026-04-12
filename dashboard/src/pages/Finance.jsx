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
  Search,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
import { downloadInvoicePdf } from '../utils/invoicePdf';

const SERVICE_BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

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

  // Trend chart series — paid vs outstanding (pending+overdue) by month.
  // Uses the real `revenue` analytics + invoice statuses; the second line
  // gives the chart visual depth without inventing numbers.
  const trendData = (revenue || []).map((r) => {
    const month = r.month ? new Date(r.month).toLocaleDateString('en', { month: 'short' }) : '';
    const monthDate = r.month ? new Date(r.month) : null;
    const outstanding = monthDate
      ? allInvoices
          .filter((inv) => {
            if (!inv.issue_date) return false;
            const d = new Date(inv.issue_date);
            return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear()
              && (inv.status === 'pending' || inv.status === 'overdue');
          })
          .reduce((s, inv) => s + Number(inv.total_amount || 0), 0)
      : 0;
    return { month, revenue: parseFloat(r.revenue || r.total) || 0, outstanding };
  });

  // Sorted, top revenue-by-service for horizontal bar chart.
  const revenueByServiceSorted = [...revenueByService].sort((a, b) => b.value - a.value).slice(0, 6);
  const maxServiceRevenue = revenueByServiceSorted[0]?.value || 1;

  const kpiCards = [
    {
      title: 'Total Revenue YTD',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'green',
      trend: 12.5,
      trendLabel: 'from last month',
      progress: { value: Math.min(100, (totalRevenue / 100000) * 100), color: 'bg-emerald-500' },
    },
    {
      title: 'Pending Payments',
      value: formatCurrency(pendingAmount),
      icon: CreditCard,
      color: 'indigo',
      subtitle: `${pendingInvoices.length} invoices`,
      progress: { value: Math.min(100, (pendingAmount / Math.max(totalRevenue, 1)) * 100), color: 'bg-indigo-500' },
    },
    {
      title: 'Overdue Amount',
      value: formatCurrency(overdueAmount),
      icon: AlertTriangle,
      color: 'red',
      subtitle: `${overdueInvoices.length} invoices`,
      progress: { value: Math.min(100, (overdueAmount / Math.max(totalRevenue, 1)) * 100), color: 'bg-red-500' },
    },
    {
      title: 'Avg Payment Time',
      value: `${avgPaymentDays} days`,
      icon: Clock,
      color: 'cyan',
      trend: -0.5,
      trendLabel: 'vs last month',
      progress: { value: Math.min(100, (30 - Math.min(avgPaymentDays, 30)) / 30 * 100), color: 'bg-cyan-500' },
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
            onClick={(e) => { e.stopPropagation(); downloadInvoicePdf(row); }}
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
      <Header
        title="Finance & Invoicing"
        subtitle="Revenue tracking, automated invoicing, and financial reporting (QAR)"
        actions={
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {kpiCards.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              trend={kpi.trend}
              trendLabel={kpi.trendLabel}
              subtitle={kpi.subtitle}
            >
              {kpi.progress && (
                <div className="mt-3 w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${kpi.progress.color} rounded-full`} style={{ width: `${kpi.progress.value}%` }} />
                </div>
              )}
            </KPICard>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue vs Outstanding (area) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Revenue vs Outstanding (QAR)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Paid revenue compared to pending + overdue per month</p>
              </div>
              <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                <button className="px-3 py-1 text-xs font-medium text-gray-600 rounded-md hover:bg-white">Monthly</button>
                <button className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md">Quarterly</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="finOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `QAR ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#finRevGrad)" />
                <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#94a3b8" strokeWidth={2} fill="url(#finOutGrad)" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Service (horizontal bars) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue by Service</h3>
            {revenueByServiceSorted.length === 0 ? (
              <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">No data available</div>
            ) : (
              <div className="space-y-4">
                {revenueByServiceSorted.map((s, i) => {
                  const pct = (s.value / maxServiceRevenue) * 100;
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="capitalize text-gray-700 font-medium">{s.name}</span>
                        <span className="text-gray-500">{formatCurrency(s.value)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SERVICE_BAR_COLORS[i % SERVICE_BAR_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-wrap gap-3">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <button
                onClick={() => {
                  setEditingInvoice(null);
                  setCreateForm({ customer_id: '', job_id: '', amount: '', tax_amount: '', due_date: '', notes: '' });
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
              >
                <Plus size={14} /> Create Invoice
              </button>
            </div>
          </div>
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            pagination={pagination}
            onPageChange={setPage}
            onRowClick={(row) => { setViewInvoice(row); setShowViewModal(true); }}
            emptyMessage="No invoices found"
          />
        </div>
      </div>

      {/* View Invoice Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={viewInvoice?.invoice_number || 'Invoice'} size="lg">
        {viewInvoice && (
          <div className="space-y-5">
            {/* Header strip with actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertBadge status={viewInvoice.status} />
                <span className="text-xs text-gray-400">Issued {viewInvoice.issue_date ? formatDate(viewInvoice.issue_date) : '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowViewModal(false); openEditModal(viewInvoice); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Pencil size={14} /> Edit
                </button>
                {viewInvoice.status !== 'paid' && (
                  <button
                    onClick={() => { handleMarkPaid(viewInvoice); setShowViewModal(false); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle size={14} /> Mark Paid
                  </button>
                )}
                <button
                  onClick={() => downloadInvoicePdf(viewInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>

            {/* Bill-to / dates */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
                <p className="font-semibold text-gray-900">{viewInvoice.Customer?.company_name || '-'}</p>
                {viewInvoice.Customer?.contact_person && <p className="text-gray-600">{viewInvoice.Customer.contact_person}</p>}
                {viewInvoice.Customer?.email && <p className="text-gray-600">{viewInvoice.Customer.email}</p>}
                {viewInvoice.Customer?.address && <p className="text-gray-600">{viewInvoice.Customer.address}</p>}
              </div>
              <div className="text-right space-y-1">
                <div><span className="text-gray-400">Invoice #:</span> <span className="font-mono text-gray-900">{viewInvoice.invoice_number}</span></div>
                <div><span className="text-gray-400">Issue Date:</span> <span className="text-gray-900">{viewInvoice.issue_date ? formatDate(viewInvoice.issue_date) : '-'}</span></div>
                <div><span className="text-gray-400">Due Date:</span> <span className="text-gray-900">{viewInvoice.due_date ? formatDate(viewInvoice.due_date) : '-'}</span></div>
                {viewInvoice.paid_at && <div><span className="text-gray-400">Paid At:</span> <span className="text-gray-900">{formatDate(viewInvoice.paid_at)}</span></div>}
              </div>
            </div>

            {/* Summary of work */}
            {(viewInvoice.Job || viewInvoice.notes) && (
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Summary of Work</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                  {viewInvoice.Job?.description || viewInvoice.Job?.service_type || viewInvoice.notes || 'Cleaning services'}
                  {viewInvoice.Job && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500">
                      {viewInvoice.Job.job_number && <div>Job: <span className="text-gray-800">{viewInvoice.Job.job_number}</span></div>}
                      {viewInvoice.Job.scheduled_date && <div>Date: <span className="text-gray-800">{formatDate(viewInvoice.Job.scheduled_date)}</span></div>}
                      {viewInvoice.Job.actual_duration_minutes != null && <div>Duration: <span className="text-gray-800">{viewInvoice.Job.actual_duration_minutes} min</span></div>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-900">{formatCurrency(viewInvoice.amount)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="text-gray-900">{formatCurrency(viewInvoice.tax_amount)}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-semibold text-gray-900">Total</span><span className="text-lg font-bold text-gray-900">{formatCurrency(viewInvoice.total_amount)}</span></div>
              </div>
            </div>

            {(viewInvoice.payment_method || viewInvoice.notes) && (
              <div className="pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1">
                {viewInvoice.payment_method && <p><span className="text-gray-400">Payment method:</span> <span className="capitalize">{viewInvoice.payment_method}</span></p>}
                {viewInvoice.notes && <p><span className="text-gray-400">Notes:</span> {viewInvoice.notes}</p>}
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
