import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, Briefcase, Bot, Gauge, Clock, AlertTriangle,
  Download, ArrowRight, Sparkles, Calendar, MapPin,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency, formatTime } from '../utils/helpers';
import JobDetailModal from '../components/common/JobDetailModal';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [todaysJobs, setTodaysJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [revRange, setRevRange] = useState(6);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, revenueRes, todayRes, jobsRes, robotsRes] =
        await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/revenue', { params: { months: 12 } }),
          api.get('/jobs/today'),
          api.get('/jobs', { params: { limit: 100 } }),
          api.get('/robots'),
        ]);

      setKpis(overviewRes.data);
      setRevenue((revenueRes.data || []).map(r => ({
        month: r.month ? new Date(r.month).toLocaleDateString('en', { month: 'short' }) : '',
        total: parseFloat(r.total) || 0,
      })));
      setTodaysJobs(todayRes.data || []);
      setAllJobs(jobsRes.data?.data || jobsRes.data || []);
      setRobots(robotsRes.data?.data || robotsRes.data || []);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner />;

  // Weekly distribution (last 7 days, by day-of-week) ─────────
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weeklyMap = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return { day: DAY_LABELS[d.getDay()], date: d, count: 0 };
  });
  allJobs.forEach(j => {
    const d = j.scheduled_date ? new Date(j.scheduled_date) : null;
    if (!d) return;
    const idx = Math.floor((d - weekStart) / (1000 * 60 * 60 * 24));
    if (idx >= 0 && idx < 7) weeklyMap[idx].count++;
  });

  const recentActive = todaysJobs
    .filter(j => !['completed', 'cancelled', 'failed'].includes(j.status))
    .slice(0, 5);

  const insights = [];
  const lowBattery = robots.filter(r => (r.battery_level ?? 100) < 25).length;
  if (lowBattery > 0) insights.push({ tone: 'warn', text: `${lowBattery} robot${lowBattery > 1 ? 's' : ''} low on battery — schedule charging.` });
  if (kpis?.delays_today > 0) insights.push({ tone: 'warn', text: `${kpis.delays_today} job${kpis.delays_today > 1 ? 's are' : ' is'} running late today.` });
  if (kpis?.fleet_utilization >= 80) insights.push({ tone: 'good', text: `Fleet utilization is high (${kpis.fleet_utilization}%) — consider expanding capacity.` });
  if (insights.length === 0) insights.push({ tone: 'good', text: 'All systems nominal. No issues require attention right now.' });

  const revWindow = revenue.slice(-revRange);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Cobot Operations Platform"
        subtitle="Real-time enterprise performance overview"
        actions={
          <>
            <button className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <Calendar size={14} /> Last 30 Days
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              <Download size={14} /> Export Report
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <KPICard
            title="Monthly Revenue" value={formatCurrency(kpis?.monthly_revenue)}
            icon={DollarSign} color="green"
            trend={kpis?.monthly_revenue_trend ?? 12.5} trendLabel="from last month"
          />
          <KPICard
            title="Active Jobs" value={kpis?.active_jobs ?? 0}
            icon={Briefcase} color="indigo"
            trend={kpis?.active_jobs_trend ?? 8.2} trendLabel="from last month"
          />
          <KPICard
            title="Robots in Use" value={kpis?.robots_in_use ?? 0}
            icon={Bot} color="purple"
            subtitle={`of ${robots.length} total`}
            trend={kpis?.robots_trend ?? -2.4} trendLabel="from last month"
          />
          <KPICard
            title="Fleet Utilization" value={`${kpis?.fleet_utilization ?? 0}%`}
            icon={Gauge} color="pink"
            trend={kpis?.fleet_utilization_trend ?? -5.1} trendLabel="from last month"
          />
          <KPICard
            title="Avg Job Duration" value={`${kpis?.avg_job_duration ?? 0}m`}
            icon={Clock} color="orange"
            trend={kpis?.avg_duration_trend ?? -1.5} trendLabel="from last month"
          />
          <KPICard
            title="Delays Today" value={kpis?.delays_today ?? 0}
            icon={AlertTriangle} color="red"
            subtitle="Jobs running late"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
              <select
                value={revRange}
                onChange={(e) => setRevRange(Number(e.target.value))}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value={3}>Last 3 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revWindow}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Jobs Distribution</h3>
              <span className="text-xs text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">This Week</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyMap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Active Jobs + Smart Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Active Jobs</h3>
              <Link to="/jobs" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View All</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentActive.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">No active jobs right now.</p>
              ) : recentActive.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {job.Customer?.company_name || job.service_type}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin size={11} /> {job.Customer?.address || job.service_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <AlertBadge status={job.status} />
                    {job.scheduled_time && (
                      <p className="text-[11px] text-gray-400 mt-1">{formatTime(job.scheduled_time)}</p>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 shadow-sm text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} />
              <h3 className="font-semibold">AI Smart Insights</h3>
            </div>
            <p className="text-xs text-indigo-100 mb-4">Auto-generated suggestions based on today's fleet activity.</p>
            <ul className="space-y-3">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${ins.tone === 'warn' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                  <span className="leading-snug">{ins.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <JobDetailModal
        isOpen={!!selectedJobId}
        onClose={() => setSelectedJobId(null)}
        jobId={selectedJobId}
      />
    </div>
  );
}
