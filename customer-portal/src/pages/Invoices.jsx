import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, X } from 'lucide-react';

export default function Invoices() {
  const { customer } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get(`/customers/${customer.id}/invoices`)
      .then(res => setInvoices(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customer.id]);

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(inv => inv.status === statusFilter);

  const statusBadge = (status) => {
    const colors = { paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', overdue: 'bg-red-100 text-red-700', draft: 'bg-gray-100 text-gray-600' };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const fmt = (amount) => `QAR ${Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Status:</span>
          {['all', 'pending', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
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
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{fmt(inv.total_amount)}</td>
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

      {/* Invoice Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{selected.invoice_number}</h3>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(selected.status)}`}>{selected.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-sm font-medium">{fmt(selected.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Tax</span>
                <span className="text-sm font-medium">{fmt(selected.tax_amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-sm font-bold">{fmt(selected.total_amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Issue Date</span>
                <span className="text-sm">{fmtDate(selected.issue_date)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className="text-sm">{fmtDate(selected.due_date)}</span>
              </div>
              {selected.paid_date && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Paid Date</span>
                  <span className="text-sm">{fmtDate(selected.paid_date)}</span>
                </div>
              )}
              {selected.payment_method && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Payment Method</span>
                  <span className="text-sm capitalize">{selected.payment_method}</span>
                </div>
              )}
              {selected.notes && (
                <div className="pt-2">
                  <span className="text-sm text-gray-500">Notes</span>
                  <p className="text-sm text-gray-700 mt-1">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
