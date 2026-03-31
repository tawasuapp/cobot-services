import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Briefcase, Activity, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { customer } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, invoicesRes] = await Promise.all([
          api.get(`/customers/${customer.id}/jobs`),
          api.get(`/customers/${customer.id}/invoices`),
        ]);
        setJobs(jobsRes.data);
        setInvoices(invoicesRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customer.id]);

  const activeJobs = jobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'scheduled'
  );
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue');
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.scheduled_date || b.created_at) - new Date(a.scheduled_date || a.created_at))
    .slice(0, 5);

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome, {customer.company_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Briefcase className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <Activity className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <FileText className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{pendingInvoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {recentJobs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No jobs found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentJobs.map((job) => (
              <div key={job.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {job.job_number} - {job.service_type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.scheduled_date
                      ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                      : 'No date'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    statusColors[job.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {job.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
