import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './context/SessionContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Maintenance from './pages/Maintenance.jsx';
import SubmitRequest from './pages/SubmitRequest.jsx';
import TicketDetail from './pages/TicketDetail.jsx';
import Billing from './pages/Billing.jsx';
import Notifications from './pages/Notifications.jsx';
import Login from './pages/Login.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';
import CommandCenter from './pages/admin/CommandCenter.jsx';
import TriageDispatch from './pages/admin/TriageDispatch.jsx';
import TenantManagement from './pages/admin/TenantManagement.jsx';
import StaffManagement from './pages/admin/StaffManagement.jsx';
import Configuration from './pages/admin/Configuration.jsx';
import IoTEmergency from './pages/admin/IoTEmergency.jsx';

// Gates the tenant portal behind a valid session. SessionContext already
// calls GET /api/tenant on mount; if that fails (no/expired cookie) `error`
// is set and we bounce to /login, remembering where the tenant was headed
// so Login can send them back after signing in.
function RequireAuth({ children }) {
  const { user, tenant, loading, error } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-700/60">
        Loading…
      </div>
    );
  }

  if (!user || error) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Admins belong on the admin side, not the tenant portal.
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (!tenant) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

// Gates the admin portal: must be signed in AND have the ADMIN role.
function RequireAdmin({ children }) {
  const { user, loading, error } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-700/60">
        Loading…
      </div>
    );
  }

  if (!user || error) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/maintenance" element={<RequireAuth><Maintenance /></RequireAuth>} />
      <Route path="/tickets" element={<Navigate to="/maintenance" replace />} />
      <Route path="/maintenance/new" element={<RequireAuth><SubmitRequest /></RequireAuth>} />
      <Route path="/maintenance/:id" element={<RequireAuth><TicketDetail /></RequireAuth>} />
      <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/login" element={<Login />} />

      {/* Admin portal: still runs on its own local mock data (adminMockDb.js),
          but now only reachable by accounts with the ADMIN role. */}
      <Route path="/admin" element={<RequireAdmin><CommandCenter /></RequireAdmin>} />
      <Route path="/admin/triage" element={<RequireAdmin><TriageDispatch /></RequireAdmin>} />
      <Route path="/admin/financial" element={<RequireAdmin><TenantManagement /></RequireAdmin>} />
      <Route path="/admin/staff" element={<RequireAdmin><StaffManagement /></RequireAdmin>} />
      <Route path="/admin/config" element={<RequireAdmin><Configuration /></RequireAdmin>} />
      <Route path="/admin/iot" element={<RequireAdmin><IoTEmergency /></RequireAdmin>} />

      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
