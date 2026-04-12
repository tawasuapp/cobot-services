import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Briefcase, Activity, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { customer } = useAuth();
  const navigate = useNavigate();
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
        setJobs(jobsRes.data?.data || jobsRes.data || []);
        setInvoices(invoicesRes.data?.data || invoicesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customer.id]);

  const activeJobs = jobs.filter(
    (j) => j.status === 'in_progress' || j.status === 'scheduled' || j.status === 'assigned' || j.status === 'en_route' || j.status === 'arrived'
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

  const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, onClick }) => (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-300 transition group w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${iconBg} rounded-lg`}>
            <Icon className={iconColor} size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
        <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition" size={20} />
      </div>
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome, {customer.company_name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Briefcase} iconBg="bg-blue-50" iconColor="text-blue-600"
          label="Total Jobs" value={jobs.length}
          onClick={() => navigate('/reports')}
        />
        <StatCard
          icon={Activity} iconBg="bg-yellow-50" iconColor="text-yellow-600"
          label="Pending Jobs"
          value={jobs.filter((j) => j.status === 'scheduled' || j.status === 'assigned').length}
          onClick={() => navigate('/reports?status=pending')}
        />
        <StatCard
          icon={Activity} iconBg="bg-green-50" iconColor="text-green-600"
          label="Active Jobs" value={activeJobs.length}
          onClick={() => navigate('/reports?status=active')}
        />
        <StatCard
          icon={FileText} iconBg="bg-orange-50" iconColor="text-orange-600"
          label="Pending Invoices" value={pendingInvoices.length}
          onClick={() => navigate('/invoices?status=pending')}
        />
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
              <button
                key={job.id}
                onClick={() => navigate(`/reports?job=${encodeURIComponent(job.job_number)}`)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-blue-50 transition group"
              >
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-700">
                    {job.job_number} - {job.service_type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.scheduled_date
                      ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                      : 'No date'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusColors[job.status] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {job.status?.replace('_', ' ')}
                  </span>
                  <ChevronRight className="text-gray-300 group-hover:text-blue-500" size={18} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
