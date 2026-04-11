import { useState, useEffect, useCallback } from 'react';
import { Camera, MapPin, Clock, User, Download, Eye, FileText } from 'lucide-react';
import api from '../services/api';
import Header from '../components/common/Header';
import AlertBadge from '../components/common/AlertBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, timeAgo } from '../utils/helpers';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports', { params: { limit: 100 } });
      setReports(res.data?.data || res.data || []);
    } catch {
      console.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Service Reports" subtitle={`${reports.length} reports uploaded by operators`} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Camera size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No reports yet</p>
            <p className="text-sm">Reports will appear here when operators upload cleaning photos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Image */}
                {report.file_url ? (
                  <div className="h-48 bg-gray-100 relative">
                    <img
                      src={report.file_url.startsWith('http') ? report.file_url : `https://admin.cobot.qa${report.file_url}`}
                      alt="Report"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute top-2 right-2">
                      <AlertBadge status={report.report_type?.replace('_', ' ') || 'report'} />
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gray-50 flex items-center justify-center">
                    <FileText size={40} className="text-gray-300" />
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {report.Job?.service_type || 'Service Report'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {report.Job?.job_number || ''}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {report.uploader?.first_name || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {timeAgo(report.uploaded_at)}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{report.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Report Details" size="lg">
        {selectedReport && (
          <div className="space-y-4">
            {selectedReport.file_url && (
              <img
                src={selectedReport.file_url.startsWith('http') ? selectedReport.file_url : `https://admin.cobot.qa${selectedReport.file_url}`}
                alt="Report"
                className="w-full rounded-xl max-h-[400px] object-contain bg-gray-50"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <FileText size={15} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Job</p>
                  <p className="text-sm font-medium">{selectedReport.Job?.job_number} — {selectedReport.Job?.service_type}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={15} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Uploaded By</p>
                  <p className="text-sm font-medium">{selectedReport.uploader?.first_name} {selectedReport.uploader?.last_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock size={15} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Uploaded</p>
                  <p className="text-sm font-medium">{selectedReport.uploaded_at ? formatDate(selectedReport.uploaded_at) : '—'}</p>
                  <p className="text-xs text-gray-400">{timeAgo(selectedReport.uploaded_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Camera size={15} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Type</p>
                  <p className="text-sm font-medium capitalize">{selectedReport.report_type?.replace('_', ' ') || 'Report'}</p>
                </div>
              </div>
            </div>

            {selectedReport.description && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700">{selectedReport.description}</p>
              </div>
            )}

            {selectedReport.file_url && (
              <a
                href={selectedReport.file_url.startsWith('http') ? selectedReport.file_url : `https://admin.cobot.qa${selectedReport.file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700"
              >
                <Download size={16} /> Download Original
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
