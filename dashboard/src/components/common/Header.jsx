import { Bell, Search, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Page header used at the top of every dashboard page.
 * Renders a sticky white bar with a global search field, dark-mode toggle,
 * notifications bell, and the current user avatar — matching the new design.
 *
 * Props:
 *  - title: page title
 *  - subtitle: optional secondary line
 *  - actions: optional ReactNode rendered between the title and the toolbar
 *             (e.g. "Export Report", "Last 30 Days" buttons)
 */
export default function Header({ title, subtitle, actions }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api.get('/alerts/unread').then(({ data }) => setUnreadCount(data.count || 0)).catch(() => {});
  }, []);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Global search — sits on the left, fixed width so the rest of
            the toolbar can hug the far right rather than clustering beside it. */}
        <div className="hidden md:flex items-center gap-2 w-full max-w-md">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search everything..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="md:hidden flex-1" />

        {/* Right toolbar — pinned to far right via ml-auto. */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" title="Toggle theme">
            <Moon size={18} />
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-xs font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{user?.role || 'admin'}</p>
            </div>
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {initials || 'U'}
            </button>
          </div>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-end justify-between mt-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
