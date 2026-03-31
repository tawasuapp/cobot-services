import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Bell,
  Cog,
  Plus,
  Pencil,
  Trash2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import Header from '../components/common/Header';
import DataTable from '../components/common/DataTable';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';

const TABS = [
  { key: 'team', label: 'Team Management', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'system', label: 'System Settings', icon: Cog },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'robot_operator', label: 'Robot Operator' },
  { value: 'driver', label: 'Driver' },
];

const DEFAULT_NOTIFICATIONS = {
  email_job_assigned: true,
  email_job_completed: true,
  email_payment_received: true,
  email_maintenance_due: false,
  push_new_alert: true,
  push_late_arrival: true,
  push_system_updates: false,
  sms_critical_alerts: true,
  sms_payment_overdue: false,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('team');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'driver',
  });
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [systemSettings, setSystemSettings] = useState({
    arrival_radius: 100,
    location_update_interval: 30,
    late_arrival_threshold: 15,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', userForm);
      toast.success('User created successfully');
      setShowUserModal(false);
      setUserForm({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'driver' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const handleSaveSystem = () => {
    toast.success('System settings saved');
  };

  const userColumns = [
    {
      key: 'name',
      label: 'Name',
      render: (_val, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-',
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (val) => <AlertBadge status={val} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <AlertBadge status={val || 'active'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteUser(row); }}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const notificationGroups = [
    {
      title: 'Email Notifications',
      items: [
        { key: 'email_job_assigned', label: 'Job assigned to your team' },
        { key: 'email_job_completed', label: 'Job completed' },
        { key: 'email_payment_received', label: 'Payment received' },
        { key: 'email_maintenance_due', label: 'Maintenance reminders' },
      ],
    },
    {
      title: 'Push Notifications',
      items: [
        { key: 'push_new_alert', label: 'New alerts' },
        { key: 'push_late_arrival', label: 'Late arrival warnings' },
        { key: 'push_system_updates', label: 'System updates' },
      ],
    },
    {
      title: 'SMS Notifications',
      items: [
        { key: 'sms_critical_alerts', label: 'Critical alerts' },
        { key: 'sms_payment_overdue', label: 'Payment overdue notices' },
      ],
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Team Members</h3>
              <button
                onClick={() => setShowUserModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add User
              </button>
            </div>
            <DataTable
              columns={userColumns}
              data={users}
              emptyMessage="No team members found"
            />
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {notificationGroups.map((group) => (
              <div key={group.title} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <label key={item.key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [item.key]: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-6">System Configuration</h3>
            <div className="space-y-5 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Radius (meters)
                </label>
                <input
                  type="number"
                  value={systemSettings.arrival_radius}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, arrival_radius: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Distance threshold to consider a robot/vehicle as arrived at location.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Update Interval (seconds)
                </label>
                <input
                  type="number"
                  value={systemSettings.location_update_interval}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, location_update_interval: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How often fleet units report their GPS position.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Late Arrival Threshold (minutes)
                </label>
                <input
                  type="number"
                  value={systemSettings.late_arrival_threshold}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, late_arrival_threshold: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Minutes past the scheduled time before an alert is triggered.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSystem}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Add User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={userForm.first_name}
                onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={userForm.last_name}
                onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
