import { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Wrench,
  UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import KPICard from '../components/common/KPICard';
import DataTable from '../components/common/DataTable';
import AlertBadge from '../components/common/AlertBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/helpers';

const EMPTY_FORM = {
  plate_number: '',
  name: '',
  model: '',
  status: 'active',
  fuel_level: 100,
  robot_capacity: 1,
  assigned_driver_id: '',
  notes: '',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewVehicle, setViewVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);

  const fetchVehicles = useCallback(async (p = 1) => {
    try {
      const res = await api.get('/vehicles', { params: { page: p, limit: 20 } });
      setVehicles(res.data.data || res.data);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load vehicles', err);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await api.get('/users/drivers');
      setDrivers(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to load drivers', err);
    }
  }, []);

  useEffect(() => {
    fetchVehicles(page);
    fetchDrivers();
  }, [fetchVehicles, fetchDrivers, page]);

  const handlePageChange = (newPage) => setPage(newPage);

  // KPI derivations
  const totalFleet = vehicles.length;
  const activeOnRoad = vehicles.filter((v) => v.status === 'active' || v.status === 'on_road').length;
  const inMaintenance = vehicles.filter((v) => v.status === 'maintenance').length;
  const unassigned = vehicles.filter((v) => !v.driver && !v.assigned_driver_id).length;

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setForm({
      plate_number: vehicle.plate_number || '',
      name: vehicle.name || '',
      model: vehicle.model || '',
      status: vehicle.status || 'active',
      fuel_level: vehicle.fuel_level ?? 100,
      robot_capacity: vehicle.robot_capacity ?? 1,
      assigned_driver_id: vehicle.assigned_driver_id || vehicle.driver?.id || '',
      notes: vehicle.notes || '',
    });
    setEditing(true);
    setViewVehicle(vehicle);
    setModalOpen(true);
  };

  const openViewModal = (vehicle) => {
    setViewVehicle(vehicle);
    setViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        assigned_driver_id: form.assigned_driver_id || null,
      };
      if (editing && viewVehicle) {
        await api.put(`/vehicles/${viewVehicle.id}`, payload);
        toast.success('Vehicle updated');
      } else {
        await api.post('/vehicles', payload);
        toast.success('Vehicle created');
      }
      setModalOpen(false);
      fetchVehicles(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vehicle');
    }
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete vehicle ${vehicle.plate_number}?`)) return;
    try {
      await api.delete(`/vehicles/${vehicle.id}`);
      toast.success('Vehicle deleted');
      fetchVehicles(page);
    } catch (err) {
      toast.error('Failed to delete vehicle');
    }
  };

  const columns = [
    { key: 'plate_number', label: 'Plate Number' },
    { key: 'name', label: 'Name' },
    { key: 'model', label: 'Model' },
    {
      key: 'driver',
      label: 'Assigned Driver',
      render: (val, row) => {
        const d = val || row.driver;
        return d ? `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Assigned' : (
          <span className="text-gray-400">Unassigned</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'robots',
      label: 'Robots Carried',
      render: (val) => (
        <span className="text-sm font-medium">{Array.isArray(val) ? val.length : 0}</span>
      ),
    },
    {
      key: 'fuel_level',
      label: 'Fuel Level',
      render: (val) => {
        const pct = val ?? 0;
        const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
        return (
          <div className="flex items-center gap-2 w-28">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-600">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'last_service_date',
      label: 'Last Service',
      render: (val) => (val ? formatDate(val) : 'N/A'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_val, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openViewModal(row); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600"
            title="View"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-orange-600"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Vehicles" />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <KPICard title="Total Fleet" value={totalFleet} icon={Truck} color="blue" />
          <KPICard title="Active on Road" value={activeOnRoad} icon={Truck} color="green" />
          <KPICard title="In Maintenance" value={inMaintenance} icon={Wrench} color="orange" />
          <KPICard title="Unassigned" value={unassigned} icon={UserX} color="red" />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Fleet Vehicles</h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>

        {/* Data table */}
        <DataTable
          columns={columns}
          data={vehicles}
          pagination={pagination}
          onPageChange={handlePageChange}
          emptyMessage="No vehicles found"
        />
      </div>

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number *</label>
              <input
                type="text"
                required
                value={form.plate_number}
                onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="on_road">On Road</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.fuel_level}
                onChange={(e) => setForm({ ...form, fuel_level: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Robot Capacity</label>
              <input
                type="number"
                min="0"
                value={form.robot_capacity}
                onChange={(e) => setForm({ ...form, robot_capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
            <select
              value={form.assigned_driver_id}
              onChange={(e) => setForm({ ...form, assigned_driver_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Driver --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name} {d.last_name}
                </option>
              ))}
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

      {/* View Vehicle Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Vehicle Details"
        size="md"
      >
        {viewVehicle && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Plate Number:</span>
                <p className="font-medium text-gray-900">{viewVehicle.plate_number}</p>
              </div>
              <div>
                <span className="text-gray-400">Name:</span>
                <p className="font-medium text-gray-900">{viewVehicle.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Model:</span>
                <p className="font-medium text-gray-900">{viewVehicle.model || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <div className="mt-0.5"><AlertBadge status={viewVehicle.status} /></div>
              </div>
              <div>
                <span className="text-gray-400">Fuel Level:</span>
                <p className="font-medium text-gray-900">{viewVehicle.fuel_level ?? 0}%</p>
              </div>
              <div>
                <span className="text-gray-400">Robot Capacity:</span>
                <p className="font-medium text-gray-900">{viewVehicle.robot_capacity ?? 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-400">Assigned Driver:</span>
                <p className="font-medium text-gray-900">
                  {viewVehicle.driver
                    ? `${viewVehicle.driver.first_name || ''} ${viewVehicle.driver.last_name || ''}`.trim()
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Robots Carried:</span>
                <p className="font-medium text-gray-900">
                  {Array.isArray(viewVehicle.robots) ? viewVehicle.robots.length : 0}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Last Service:</span>
                <p className="font-medium text-gray-900">
                  {viewVehicle.last_service_date ? formatDate(viewVehicle.last_service_date) : 'N/A'}
                </p>
              </div>
            </div>
            {viewVehicle.notes && (
              <div className="text-sm">
                <span className="text-gray-400">Notes:</span>
                <p className="text-gray-700 mt-1">{viewVehicle.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
