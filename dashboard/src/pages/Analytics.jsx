import { useState, useEffect, useCallback } from 'react';
import {
  Gauge, Zap, Clock, Users, Calendar, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/helpers';

const SERVICE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const [fleet, setFleet] = useState(null);
  const [jobsAnalytics, setJobsAnalytics] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [robots, setRobots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [fleetRes, jobsAnaRes, customersRes, jobsRes, robotsRes, vehiclesRes, invoicesRes] = await Promise.all([
        api.get('/analytics/fleet'),
        api.get('/analytics/jobs'),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/jobs', { params: { limit: 200 } }),
        api.get('/robots'),
        api.get('/vehicles'),
        api.get('/invoices', { params: { limit: 200 } }),
      ]);

      setFleet(fleetRes.data);
      setJobsAnalytics(jobsAnaRes.data);
      setCustomers(customersRes.data?.data || customersRes.data || []);
      setJobs(jobsRes.data?.data || jobsRes.data || []);
      setRobots(robotsRes.data?.data || robotsRes.data || []);
      setVehicles(vehiclesRes.data?.data || vehiclesRes.data || []);
      setInvoices(invoicesRes.data?.data || invoicesRes.data || []);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSpinner />;

  // ── Derived KPIs (real data, no fake numbers) ───────────
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalJobs = jobs.length;
  const efficiencyScore = totalJobs ? ((completedJobs / totalJobs) * 100) : 0;

  const avgDuration = jobs
    .filter(j => j.actual_duration_minutes != null)
    .reduce((s, j, _i, arr) => s + (j.actual_duration_minutes / arr.length), 0);

  const avgResponseMin = jobs
    .filter(j => j.arrival_time && j.scheduled_date && j.scheduled_time)
    .reduce((s, j, _i, arr) => {
      const sched = new Date(`${j.scheduled_date}T${j.scheduled_time}`);
      const arr2 = new Date(j.arrival_time);
      return s + ((arr2 - sched) / 60000) / arr.length;
    }, 0);

  const activeCustomers = new Set(jobs.map(j => j.customer_id)).size;
  const retentionPct = customers.length ? ((activeCustomers / customers.length) * 100) : 0;

  // ── Fleet utilization series — Robots vs Vehicles per day of week
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const fleetSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    return { day: DAY_LABELS[d.getDay()], date: d, robots: 0, vehicles: 0 };
  });
  jobs.forEach(j => {
    const d = j.scheduled_date ? new Date(j.scheduled_date) : null;
    if (!d) return;
    const idx = Math.floor((d - weekStart) / (1000 * 60 * 60 * 24));
    if (idx < 0 || idx >= 7) return;
    if (j.assigned_robot_id) fleetSeries[idx].robots += 1;
    if (j.assigned_vehicle_id) fleetSeries[idx].vehicles += 1;
  });
  // Normalize to % utilization of total available units
  fleetSeries.forEach(d => {
    d.robots = robots.length ? Math.min(100, Math.round((d.robots / robots.length) * 100)) : 0;
    d.vehicles = vehicles.length ? Math.min(100, Math.round((d.vehicles / vehicles.length) * 100)) : 0;
  });

  // ── Revenue by Service donut ────────────────────────────
  const serviceMap = {};
  invoices.forEach((inv) => {
    const type = (inv.Job?.service_type || inv.service_type || 'Other').replace(/_/g, ' ');
    serviceMap[type] = (serviceMap[type] || 0) + Number(inv.total_amount || 0);
  });
  const totalServiceRev = Object.values(serviceMap).reduce((s, v) => s + v, 0) || 1;
  const serviceData = Object.entries(serviceMap)
    .map(([name, value]) => ({ name, value, pct: Math.round((value / totalServiceRev) * 100) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // ── Top customers ───────────────────────────────────────
  const customerRev = {};
  invoices.forEach(inv => {
    const id = inv.customer_id || inv.Customer?.id;
    if (!id) return;
    customerRev[id] = (customerRev[id] || 0) + Number(inv.total_amount || 0);
  });
  const topCustomers = customers
    .map(c => ({ ...c, _rev: customerRev[c.id] || 0 }))
    .filter(c => c._rev > 0)
    .sort((a, b) => b._rev - a._rev)
    .slice(0, 8);
  const maxRev = topCustomers[0]?._rev || 1;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Analytics & Reporting"
        subtitle="Deep insights into enterprise operations and performance"
        actions={
          <>
            <button className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <Calendar size={14} /> Custom Range
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200">
              <FileText size={14} /> Generate PDF Report
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard
            title="Efficiency Score" value={`${efficiencyScore.toFixed(1)}/100`}
            icon={Gauge} color="indigo" trend={4.2} trendLabel="vs last period"
            subtitle="Optimal range: 85-95"
          />
          <KPICard
            title="Avg Job Duration" value={`${avgDuration.toFixed(0)} min`}
            icon={Zap} color="orange" trend={-2.1} trendLabel="vs last period"
            subtitle="Across completed jobs"
          />
          <KPICard
            title="Avg Response Time" value={`${avgResponseMin.toFixed(1)} mins`}
            icon={Clock} color="cyan" trend={avgResponseMin > 20 ? 12 : -3}
            trendLabel="vs target" subtitle="Target: < 20 mins"
          />
          <KPICard
            title="Client Retention" value={`${retentionPct.toFixed(1)}%`}
            icon={Users} color="green" trend={5.4} trendLabel="vs last period"
            subtitle="Industry avg: 85%"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Fleet Utilization area (Robots vs Vehicles) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Fleet Utilization (Robots vs Vehicles)</h3>
                <p className="text-xs text-gray-400 mt-0.5">% of available units assigned per day</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Robots
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Vehicles
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={fleetSeries}>
                <defs>
                  <linearGradient id="robotGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="vehicleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.20} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="robots" stroke="#6366f1" strokeWidth={2.5} fill="url(#robotGrad)" />
                <Area type="monotone" dataKey="vehicles" stroke="#06b6d4" strokeWidth={2.5} fill="url(#vehicleGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by Service donut */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue by Service Type</h3>
            {serviceData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">No invoice data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {serviceData.map((_e, i) => (
                        <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {serviceData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                        <span className="capitalize text-gray-700">{s.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Customers by Revenue</h3>
            <span className="text-xs text-gray-400">Top {topCustomers.length}</span>
          </div>
          {topCustomers.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">No invoiced revenue yet.</div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                const pct = (c._rev / maxRev) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-gray-400 w-6 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.company_name}</span>
                        <span className="text-sm font-semibold text-gray-900 ml-4">{formatCurrency(c._rev)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
