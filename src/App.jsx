import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import TenantFinancial from './pages/admin/TenantFinancial.jsx';
import Configuration from './pages/admin/Configuration.jsx';
import IoTEmergency from './pages/admin/IoTEmergency.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/tickets" element={<Navigate to="/maintenance" replace />} />
      <Route path="/maintenance/new" element={<SubmitRequest />} />
      <Route path="/maintenance/:id" element={<TicketDetail />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<CommandCenter />} />
      <Route path="/admin/triage" element={<TriageDispatch />} />
      <Route path="/admin/financial" element={<TenantFinancial />} />
      <Route path="/admin/config" element={<Configuration />} />
      <Route path="/admin/iot" element={<IoTEmergency />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
