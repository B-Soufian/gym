import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import Queue from './pages/Queue';
import Personnel from './pages/Personnel';
import Gyms from './pages/Gyms';
import AuditLogs from './pages/AuditLogs';
import Layout from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'STAFF' ? "/members" : "/dashboard"} replace />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <ProtectedRoute>
                {useAuthStore.getState().user?.role === 'STAFF' ? 
                  <Navigate to="/members" replace /> : 
                  <Navigate to="/dashboard" replace />
                }
              </ProtectedRoute>
            } />
            <Route path="dashboard" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Staff & Admin Routes */}
            <Route path="members" element={<Members />} />
            <Route path="payments" element={<Payments />} />
            
            {/* Super Admin Routes */}
            <Route path="queue" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Queue />
              </ProtectedRoute>
            } />

            <Route path="admin/gyms" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Gyms />
              </ProtectedRoute>
            } />
            <Route path="admin/staff" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Personnel />
              </ProtectedRoute>
            } />
            <Route path="admin/subscriptions" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <Subscriptions />
              </ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute roles={['SUPER_ADMIN']}>
                <AuditLogs />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={
            <ProtectedRoute>
              {useAuthStore.getState().user?.role === 'STAFF' ? 
                <Navigate to="/members" replace /> : 
                <Navigate to="/dashboard" replace />
              }
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
