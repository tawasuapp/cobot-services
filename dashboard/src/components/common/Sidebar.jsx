import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Briefcase, Users, Bot, Truck,
  DollarSign, BarChart3, Bell, Settings, LogOut, FileText, X, ChevronRight, Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Overview' },
      { to: '/live', icon: Radio, label: 'Live Ops Center' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/jobs', icon: Briefcase, label: 'Jobs & Tasks' },
      { to: '/jobs/contracts', icon: FileText, label: 'Contracts' },
      { to: '/jobs/templates', icon: FileText, label: 'Templates' },
    ],
  },
  {
    label: 'Assets',
    items: [
      { to: '/customers', icon: Users, label: 'Customers' },
      { to: '/robots', icon: Bot, label: 'Robots' },
      { to: '/vehicles', icon: Truck, label: 'Vehicles' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/finance', icon: DollarSign, label: 'Finance & Invoicing' },
      { to: '/reports', icon: Camera, label: 'Reports' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <img src="/cobot-logo.png" alt="Cobot" className="h-9 w-auto object-contain" />
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-scroll-light flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  {to === '/alerts' && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-gray-100">
        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </NavLink>
        <button
          onClick={logout}
          className="mt-1 flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors w-full px-3 py-1.5"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
