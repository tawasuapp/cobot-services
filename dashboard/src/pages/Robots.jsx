import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Bot,
  Battery,
  Wrench,
  QrCode,
  Clock,
  Cpu,
  Truck,
  Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import AlertBadge from '../components/common/AlertBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';

const EMPTY_FORM = {
  serial_number: '',
  name: '',
  model: '',
  firmware_version: '',
  status: 'idle',
  battery_level: 100,
  health_status: 'good',
  notes: '',
};

function BatteryBar({ level }) {
  const pct = level ?? 0;
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

export default function Robots() {
  const [robots, setRobots] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);

  const fetchRobots = useCallback(async () => {
    try {
      const res = await api.get('/robots');
      const list = res.data.data || res.data;
      setRobots(list);
    } catch (err) {
      console.error('Failed to load robots', err);
      toast.error('Failed to load robots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRobots();
  }, [fetchRobots]);

  useEffect(() => {
    let result = robots;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.serial_number?.toLowerCase().includes(q) ||
          r.model?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, statusFilter, robots]);

  const selectRobot = (robot) => setSelected(robot);

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selected) return;
    setForm({
      serial_number: selected.serial_number || '',
      name: selected.name || '',
      model: selected.model || '',
      firmware_version: selected.firmware_version || '',
      status: selected.status || 'idle',
      battery_level: selected.battery_level ?? 100,
      health_status: selected.health_status || 'good',
      notes: selected.notes || '',
    });
    setEditing(true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await api.put(`/robots/${selected.id}`, form);
        toast.success('Robot updated');
        setSelected(res.data.data || res.data || { ...selected, ...form });
      } else {
        await api.post('/robots', form);
        toast.success('Robot created');
      }
      setModalOpen(false);
      fetchRobots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save robot');
    }
  };

  const handleGenerateQR = async () => {
    if (!selected) return;
    try {
      const res = await api.post(`/robots/${selected.id}/qr`);
      toast.success('QR code generated');
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch (err) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleScheduleMaintenance = () => {
    if (!selected) return;
    toast.success('Maintenance scheduling coming soon');
  };

  const statuses = [...new Set(robots.map((r) => r.status).filter(Boolean))];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Robots" />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Robot list */}
        <div className="w-[300px] border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search robots..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              onClick={openAddModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus size={16} /> Add Robot
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map((robot) => (
              <div
                key={robot.id}
                onClick={() => selectRobot(robot)}
                className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selected?.id === robot.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{robot.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{robot.serial_number}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <AlertBadge status={robot.status} />
                </div>
                <div className="mt-1.5 w-24">
                  <BatteryBar level={robot.battery_level} />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No robots found</p>
            )}
          </div>
        </div>

        {/* Right panel - Robot details */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a robot to view details
            </div>
          ) : (
            <div className="space-y-6">
              {/* Robot info header */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{selected.serial_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openEditModal}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleScheduleMaintenance}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg flex items-center gap-1"
                    >
                      <Wrench size={14} /> Schedule Maintenance
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Model:</span>{' '}
                    <span className="text-gray-700">{selected.model || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Firmware:</span>{' '}
                    <span className="text-gray-700">{selected.firmware_version || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Status:</span>{' '}
                    <AlertBadge status={selected.status} />
                  </div>
                </div>
              </div>

              {/* Battery & Health */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Battery size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Battery Level</span>
                  </div>
                  <BatteryBar level={selected.battery_level} />
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Health Status</span>
                  </div>
                  <AlertBadge status={selected.health_status} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Total Operational Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {selected.total_operational_hours ?? 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Jobs Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {selected.jobs_completed ?? 'N/A'}
                  </p>
                </div>
              </div>

              {/* Maintenance dates */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Maintenance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Last Maintenance:</span>{' '}
                    <span className="text-gray-700">
                      {selected.last_maintenance_date
                        ? formatDate(selected.last_maintenance_date)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Next Maintenance:</span>{' '}
                    <span className="text-gray-700">
                      {selected.next_maintenance_date
                        ? formatDate(selected.next_maintenance_date)
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">QR Code</h3>
                  <button
                    onClick={handleGenerateQR}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-1"
                  >
                    <QrCode size={14} /> Generate QR
                  </button>
                </div>
                {selected.qr_code_url && (
                  <div className="mt-3">
                    <img
                      src={selected.qr_code_url}
                      alt="Robot QR Code"
                      className="w-32 h-32 border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Assigned vehicle */}
              {selected.vehicle && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={16} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">Assigned Vehicle</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    {selected.vehicle.plate_number} - {selected.vehicle.name || selected.vehicle.model}
                  </p>
                </div>
              )}

              {/* Current job */}
              {selected.current_job && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={16} className="text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-900">Current Job</h3>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p>
                      Job #{selected.current_job.job_number} -{' '}
                      {selected.current_job.service_type}
                    </p>
                    <AlertBadge status={selected.current_job.status} className="mt-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Robot Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Robot' : 'Add Robot'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number *</label>
              <input
                type="text"
                required
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firmware Version</label>
              <input
                type="text"
                value={form.firmware_version}
                onChange={(e) => setForm({ ...form, firmware_version: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="idle">Idle</option>
                <option value="active">Active</option>
                <option value="charging">Charging</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Battery Level</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.battery_level}
                onChange={(e) => setForm({ ...form, battery_level: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Status</label>
            <select
              value={form.health_status}
              onChange={(e) => setForm({ ...form, health_status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="good">Good</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
