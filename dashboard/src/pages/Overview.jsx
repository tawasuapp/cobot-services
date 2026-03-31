import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Briefcase,
  Bot,
  Gauge,
  Clock,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import DataTable from '../components/common/DataTable';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/helpers';

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [jobsWeekly, setJobsWeekly] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, revenueRes, jobsAnalyticsRes, jobsRes] =
        await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/revenue'),
          api.get('/analytics/jobs'),
          api.get('/jobs', { params: { status: 'in_progress', limit: 5 } }),
        ]);

      setKpis(overviewRes.data);
      setRevenue(revenueRes.data);
      setJobsWeekly(jobsAnalyticsRes.data.weekly || []);
      setActiveJobs(jobsRes.data.data || jobsRes.data);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpiCards = kpis
    ? [
        {
          title: 'Monthly Revenue',
          value: formatCurrency(kpis.monthlyRevenue),
          icon: DollarSign,
          color: 'green',
          trend: kpis.revenueTrend,
        },
        {
          title: 'Active Jobs',
          value: kpis.activeJobs,
          icon: Briefcase,
          color: 'blue',
          trend: kpis.activeJobsTrend,
        },
        {
          title: 'Robots in Use',
          value: kpis.robotsInUse,
          icon: Bot,
          color: 'purple',
          trend: kpis.robotsTrend,
        },
        {
          title: 'Fleet Utilization',
          value: `${kpis.fleetUtilization}%`,
          icon: Gauge,
          color: 'cyan',
          trend: kpis.utilizationTrend,
        },
        {
          title: 'Avg Job Duration',
          value: kpis.avgJobDuration,
          icon: Clock,
          color: 'orange',
          trend: kpis.durationTrend,
        },
        {
          title: 'Delays Today',
          value: kpis.delaysToday,
          icon: AlertTriangle,
          color: 'red',
          trend: kpis.delaysTrend,
        },
      ]
    : [];

  const jobColumns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (_val, row) => row.Customer?.company_name || '-',
    },
    { key: 'service_type', label: 'Service Type' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (val) => <AlertBadge status={val} />,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Overview" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              trend={kpi.trend}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Revenue Trend (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Jobs Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Jobs Distribution (Weekly)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={jobsWeekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                />
                <Bar dataKey="jobs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Jobs Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent Active Jobs
          </h3>
          <DataTable
            columns={jobColumns}
            data={activeJobs}
            emptyMessage="No active jobs at the moment"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Quick Actions
          </h3>
          <div className="flex gap-3">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Job
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
