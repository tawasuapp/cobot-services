import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Briefcase, Bot, Gauge, Clock, AlertTriangle,
  Plus, ArrowRight, TrendingUp, Users, Truck
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatTime, timeAgo } from '../utils/helpers';

const STATUS_COLORS = {
  scheduled: '#3b82f6',
  assigned: '#6366f1',
  en_route: '#f59e0b',
  arrived: '#a855f7',
  in_progress: '#f97316',
  completed: '#22c55e',
  cancelled: '#9ca3af',
  failed: '#ef4444',
};

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [jobStats, setJobStats] = useState({ by_status: [], weekly: [] });
  const [todaysJobs, setTodaysJobs] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, revenueRes, jobsAnalyticsRes, jobsRes, activityRes] =
        await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/revenue', { params: { months: 12 } }),
          api.get('/analytics/jobs'),
          api.get('/jobs/today'),
          api.get('/activity', { params: { limit: 10 } }),
        ]);

      setKpis(overviewRes.data);
      setRevenue((revenueRes.data || []).map(r => ({
        month: r.month ? new Date(r.month).toLocaleDateString('en', { month: 'short', year: '2-digit' }) : '',
        total: parseFloat(r.total) || 0,
      })));
      setJobStats(jobsAnalyticsRes.data || { by_status: [], weekly: [] });
      setTodaysJobs(jobsRes.data || []);
      setRecentActivity(activityRes.data?.data || activityRes.data || []);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner />;

  const statusData = (jobStats.by_status || []).map(s => ({
    name: s.status,
    value: parseInt(s.count, 10),
    color: STATUS_COLORS[s.status] || '#9ca3af',
  }));

  const weeklyData = (jobStats.weekly || []).map(w => ({
    week: w.week ? new Date(w.week).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
    count: parseInt(w.count, 10),
  }));

  const activeJobs = todaysJobs.filter(j => !['completed', 'cancelled', 'failed'].includes(j.status));
  const completedToday = todaysJobs.filter(j => j.status === 'completed').length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Overview"
        subtitle={new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        actions={
          <Link
            to="/jobs"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Job
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <KPICard
            title="Revenue"
            value={formatCurrency(kpis?.monthly_revenue)}
            icon={DollarSign}
            color="green"
            subtitle="This month"
          />
          <KPICard
            title="Active Jobs"
            value={kpis?.active_jobs ?? 0}
            icon={Briefcase}
            color="blue"
          />
          <KPICard
            title="Robots"
            value={kpis?.robots_in_use || '0'}
            icon={Bot}
            color="purple"
            subtitle="In use / total"
          />
          <KPICard
            title="Fleet Use"
            value={`${kpis?.fleet_utilization ?? 0}%`}
            icon={Gauge}
            color="cyan"
          />
          <KPICard
            title="Avg Duration"
            value={`${kpis?.avg_job_duration ?? 0} min`}
            icon={Clock}
            color="orange"
          />
          <KPICard
            title="Delays"
            value={kpis?.delays_today ?? 0}
            icon={AlertTriangle}
            color="red"
            subtitle="Today"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
              <span className="text-xs text-gray-400">Last 12 months</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }} />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Jobs by Status Pie */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Jobs by Status</h3>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {statusData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-gray-600 capitalize">{s.name.replace('_', ' ')}</span>
                      <span className="font-semibold text-gray-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No job data</div>
            )}
          </div>
        </div>

        {/* Jobs Weekly Bar + Today's Schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Weekly bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Jobs</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Today's jobs */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{todaysJobs.length} total</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">{completedToday} done</span>
              </div>
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {todaysJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No jobs scheduled for today</div>
              ) : (
                todaysJobs.map(job => (
                  <div key={job.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${job.status === 'completed' ? 'bg-gray-50 opacity-60' : 'bg-gray-50/50 hover:bg-gray-100'}`}>
                    <div className={`w-1 h-10 rounded-full ${job.status === 'completed' ? 'bg-green-400' : job.status === 'in_progress' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${job.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {job.Customer?.company_name || job.service_type}
                      </p>
                      <p className="text-xs text-gray-500">{job.service_type} {job.scheduled_time ? `at ${formatTime(job.scheduled_time)}` : ''}</p>
                    </div>
                    <AlertBadge status={job.status} />
                  </div>
                ))
              )}
            </div>
            {todaysJobs.length > 0 && (
              <Link to="/jobs" className="flex items-center justify-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                View all jobs <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link to="/live" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Live feed <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 col-span-2 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.slice(0, 8).map((entry, i) => (
                <div key={entry.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp size={14} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{entry.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500 truncate">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at || entry.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
