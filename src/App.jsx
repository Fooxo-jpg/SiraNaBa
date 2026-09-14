import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Maintenance from './pages/Maintenance.jsx';
import SubmitRequest from './pages/SubmitRequest.jsx';
import Billing from './pages/Billing.jsx';
import Notifications from './pages/Notifications.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/tickets" element={<Navigate to="/maintenance" replace />} />
      <Route path="/maintenance/new" element={<SubmitRequest />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
