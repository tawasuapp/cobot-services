import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Briefcase, Users, Bot, Truck,
  DollarSign, BarChart3, Bell, Settings, LogOut, FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/live', icon: Radio, label: 'Live Ops Center' },
  { to: '/jobs', icon: Briefcase, label: 'All Jobs' },
  { to: '/jobs/contracts', icon: FileText, label: 'Contracts' },
  { to: '/jobs/templates', icon: FileText, label: 'Templates' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/robots', icon: Bot, label: 'Robots' },
  { to: '/vehicles', icon: Truck, label: 'Vehicles' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen fixed left-0 top-0 bottom-0 z-40">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Cobot Services</h1>
        <p className="text-xs text-gray-400 mt-1">Fleet Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
