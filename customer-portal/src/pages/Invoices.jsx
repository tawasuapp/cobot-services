import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, X, Printer, Download } from 'lucide-react';

function formatDuration(mins) {
  if (!mins && mins !== 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function Invoices() {
  const { customer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const statusFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    api.get(`/customers/${customer.id}/invoices`)
      .then(res => setInvoices(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer.id]);

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(inv => inv.status === statusFilter);

  const setStatus = (s) => {
    const next = new URLSearchParams(searchParams);
    if (s === 'all') next.delete('status'); else next.set('status', s);
    setSearchParams(next, { replace: true });
  };

  const statusBadge = (status) => {
    const colors = { paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', overdue: 'bg-red-100 text-red-700', draft: 'bg-gray-100 text-gray-600' };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const fmt = (amount, currency = 'QAR') => `${currency} ${Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {['all', 'pending', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(inv => (
                <tr key={inv.id} onClick={() => setSelected(inv)} className="hover:bg-blue-50 cursor-pointer transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(inv.issue_date)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{fmt(inv.total_amount, inv.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(inv.status)}`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{fmtDate(inv.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <InvoiceModal
          invoice={selected}
          customer={customer}
          fmt={fmt}
          fmtDate={fmtDate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function InvoiceModal({ invoice, customer, fmt, fmtDate, onClose }) {
  const job = invoice.Job || invoice.job;
  const subtotal = Number(invoice.amount || 0);
  const tax = Number(invoice.tax_amount || 0);
  const total = Number(invoice.total_amount || 0);
  const summary = job?.description || job?.service_type || invoice.notes || 'Cleaning services';

  const statusBadge = {
    paid: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
  }[invoice.status] || 'bg-gray-100 text-gray-700 border-gray-200';

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0">
      <div className="absolute inset-0 bg-black/40 print:hidden" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto print:rounded-none print:shadow-none print:max-h-none print:max-w-none">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden">
          <span className="text-sm text-gray-500">Invoice Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-8 print:p-12">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 border-b border-gray-200">
            <div className="flex items-start gap-3">
              <img src="/logo-dark.png" alt="Cobot Services" className="h-10" />
              <div>
                <p className="text-xs text-gray-500 mt-1">Doha, Qatar</p>
                <p className="text-xs text-gray-500">www.cobot.qa</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h2>
              <p className="text-sm text-gray-500 mt-1">#{invoice.invoice_number}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${statusBadge}`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Bill to + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</p>
              <p className="text-sm font-semibold text-gray-900">{customer?.company_name}</p>
              {customer?.contact_person && <p className="text-sm text-gray-600">{customer.contact_person}</p>}
              {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
              {customer?.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
              {customer?.address && <p className="text-sm text-gray-600">{customer.address}</p>}
            </div>
            <div className="sm:text-right space-y-1">
              <div className="flex sm:justify-end gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Issue Date</span>
                <span className="text-sm text-gray-900">{fmtDate(invoice.issue_date)}</span>
              </div>
              <div className="flex sm:justify-end gap-3">
                <span className="text-xs font-semibold text-gray-400 uppercase">Due Date</span>
                <span className="text-sm text-gray-900">{fmtDate(invoice.due_date)}</span>
              </div>
              {invoice.paid_date && (
                <div className="flex sm:justify-end gap-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Paid Date</span>
                  <span className="text-sm text-gray-900">{fmtDate(invoice.paid_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary of work */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Summary of Work</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-800">{summary}</p>
              {job && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {job.job_number && (
                    <div>
                      <p className="text-gray-400">Job #</p>
                      <p className="text-gray-800 font-medium">{job.job_number}</p>
                    </div>
                  )}
                  {job.scheduled_date && (
                    <div>
                      <p className="text-gray-400">Service Date</p>
                      <p className="text-gray-800 font-medium">{fmtDate(job.scheduled_date)}</p>
                    </div>
                  )}
                  {job.actual_duration_minutes != null && (
                    <div>
                      <p className="text-gray-400">Duration</p>
                      <p className="text-gray-800 font-medium">{formatDuration(job.actual_duration_minutes)}</p>
                    </div>
                  )}
                  {job.service_type && (
                    <div>
                      <p className="text-gray-400">Service</p>
                      <p className="text-gray-800 font-medium">{job.service_type}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="mt-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-800">
                    {job?.service_type || 'Cleaning Services'}
                    {job?.job_number && <span className="text-gray-400"> · {job.job_number}</span>}
                  </td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">{fmt(subtotal, invoice.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{fmt(subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">{fmt(tax, invoice.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{fmt(total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes / payment */}
          {(invoice.notes || invoice.payment_method) && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600 space-y-2">
              {invoice.payment_method && (
                <p><span className="font-medium text-gray-800">Payment method:</span> <span className="capitalize">{invoice.payment_method}</span></p>
              )}
              {invoice.notes && (
                <div>
                  <p className="font-medium text-gray-800">Notes</p>
                  <p>{invoice.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400">Thank you for your business.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
