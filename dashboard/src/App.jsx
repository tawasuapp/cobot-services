import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';
import { Menu } from 'lucide-react';
import Login from './pages/Login';
import Overview from './pages/Overview';
import LiveOpsCenter from './pages/LiveOpsCenter';
import AllJobs from './pages/jobs/AllJobs';
import Contracts from './pages/jobs/Contracts';
import Templates from './pages/jobs/Templates';
import Customers from './pages/Customers';
import Robots from './pages/Robots';
import Vehicles from './pages/Vehicles';
import Finance from './pages/Finance';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Reports from './pages/Reports';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — always fixed */}
      <div className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content — offset by sidebar width on desktop */}
      <main className="flex-1 min-w-0 lg:ml-64">
        {/* Mobile header bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={22} className="text-gray-700" />
          </button>
          <span className="font-semibold text-gray-900">Cobot Services</span>
        </div>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/live" element={<LiveOpsCenter />} />
                <Route path="/jobs" element={<AllJobs />} />
                <Route path="/jobs/contracts" element={<Contracts />} />
                <Route path="/jobs/templates" element={<Templates />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/robots" element={<Robots />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
