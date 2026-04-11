import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Briefcase, Users, Bot, Truck,
  DollarSign, BarChart3, Bell, Settings, LogOut, FileText, X, ChevronRight, Camera
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
      { to: '/jobs', icon: Briefcase, label: 'All Jobs' },
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
      { to: '/finance', icon: DollarSign, label: 'Finance' },
      { to: '/reports', icon: Camera, label: 'Reports' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const { logout, user } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="" className="h-9 w-9 object-contain" />
          <div>
            <span className="text-base font-bold tracking-tight text-white">Cobot<span className="font-normal">Services</span></span>
            <p className="text-[8px] uppercase tracking-[0.2em] text-gray-500 -mt-0.5">Enhanced Autonomous Services</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/10">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
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
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
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
      <div className="p-4 border-t border-white/10">
        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 mb-3 p-1.5 -mx-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <ChevronRight size={14} className="text-gray-500" />
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors w-full px-1"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
