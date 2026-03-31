import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">{children}</main>
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
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
