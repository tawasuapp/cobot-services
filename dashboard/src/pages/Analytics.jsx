import { useState, useEffect, useCallback } from 'react';
import {
  Gauge,
  Zap,
  Clock,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/helpers';

const STATUS_COLORS = {
  active: '#10b981',
  idle: '#f59e0b',
  maintenance: '#ef4444',
  offline: '#6b7280',
  available: '#3b82f6',
  in_use: '#8b5cf6',
  charging: '#06b6d4',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6b7280'];

export default function Analytics() {
  const [fleet, setFleet] = useState(null);
  const [jobsAnalytics, setJobsAnalytics] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [fleetRes, jobsRes, customersRes] = await Promise.all([
        api.get('/analytics/fleet'),
        api.get('/analytics/jobs'),
        api.get('/customers', { params: { limit: 10, sort: 'revenue' } }),
      ]);

      setFleet(fleetRes.data);
      setJobsAnalytics(jobsRes.data);
      setCustomers(customersRes.data.data || customersRes.data);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build fleet utilization data for stacked bar chart
  const fleetChartData = [];
  if (fleet) {
    if (fleet.robots) {
      const robotEntry = { category: 'Robots' };
      Object.entries(fleet.robots).forEach(([status, count]) => {
        robotEntry[status] = count;
      });
      fleetChartData.push(robotEntry);
    }
    if (fleet.vehicles) {
      const vehicleEntry = { category: 'Vehicles' };
      Object.entries(fleet.vehicles).forEach(([status, count]) => {
        vehicleEntry[status] = count;
      });
      fleetChartData.push(vehicleEntry);
    }
  }

  // Gather all unique statuses for the stacked bars
  const allStatuses = [...new Set(fleetChartData.flatMap((d) => Object.keys(d).filter((k) => k !== 'category')))];

  // Jobs by status pie data
  const jobsByStatus = jobsAnalytics?.by_status
    ? Object.entries(jobsAnalytics.by_status).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
      }))
    : [];

  // Top customers by revenue
  const topCustomers = customers
    .filter((c) => c.total_revenue || c.revenue)
    .sort((a, b) => (b.total_revenue || b.revenue || 0) - (a.total_revenue || a.revenue || 0))
    .slice(0, 10);

  const kpiCards = [
    {
      title: 'Efficiency Score',
      value: '87%',
      icon: Gauge,
      color: 'green',
    },
    {
      title: 'Energy Consumption',
      value: '1,240 kWh',
      icon: Zap,
      color: 'orange',
    },
    {
      title: 'Avg Response Time',
      value: jobsAnalytics?.avg_response_time || '12 min',
      icon: Clock,
      color: 'blue',
    },
    {
      title: 'Client Retention',
      value: '94%',
      icon: Users,
      color: 'purple',
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <KPICard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} color={kpi.color} />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fleet Utilization */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Fleet Utilization</h3>
            {fleetChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fleetChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12, fill: '#6b7280' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  {allStatuses.map((status) => (
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="fleet"
                      fill={STATUS_COLORS[status] || '#6b7280'}
                      name={status.replace(/_/g, ' ')}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                No fleet data available
              </div>
            )}
          </div>

          {/* Jobs by Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Jobs by Status</h3>
            {jobsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={jobsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {jobsByStatus.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
                No job data available
              </div>
            )}
          </div>
        </div>

        {/* Top Customers by Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top Customers by Revenue</h3>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => {
                const rev = customer.total_revenue || customer.revenue || 0;
                const maxRev = topCustomers[0]?.total_revenue || topCustomers[0]?.revenue || 1;
                const pct = (rev / maxRev) * 100;

                return (
                  <div key={customer.id} className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 w-6 text-right">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {customer.company_name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 ml-4">
                          {formatCurrency(rev)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">No customer revenue data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
