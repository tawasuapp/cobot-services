import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function Reports() {
  const { customer } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        const res = await api.get(`/customers/${customer.id}/reports`, { params });
        setReports(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [customer.id, dateFrom, dateTo]);

  const reportTypeBadge = (type) => {
    const colors = {
      inspection: 'bg-blue-100 text-blue-700',
      completion: 'bg-green-100 text-green-700',
      incident: 'bg-red-100 text-red-700',
      progress: 'bg-yellow-100 text-yellow-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
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
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="mt-5 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No reports found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {report.job_number || 'Job'} - {report.service_type || 'Service'}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${reportTypeBadge(
                        report.report_type
                      )}`}
                    >
                      {report.report_type}
                    </span>
                  </div>
                  {report.scheduled_date && (
                    <p className="text-sm text-gray-500 mb-1">
                      Job Date: {format(new Date(report.scheduled_date), 'MMM d, yyyy')}
                    </p>
                  )}
                  {report.description && (
                    <p className="text-sm text-gray-600 mt-2">{report.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Uploaded: {format(new Date(report.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {report.file_url && (
                  <a
                    href={report.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium shrink-0"
                  >
                    <ExternalLink size={16} />
                    View File
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
