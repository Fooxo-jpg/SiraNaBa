import React, { useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { endpoints } from '../api/endpoints.js';
import { useSession } from '../context/SessionContext.jsx';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ForcedPasswordChangeModal() {
  const { user, refresh } = useSession();
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const required = user?.role === 'TENANT' && user.mustChangePassword;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('New password and confirmation do not match.');
    setSubmitting(true);
    try {
      await endpoints.changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      await refresh();
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || 'Could not change your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, key, autoComplete) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-900">{label}</span>
      <div className="relative">
        <Icon name="lock" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
        <input
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={form[key]}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
          className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest-400"
        />
      </div>
    </label>
  );

  return (
    <Modal
      open={required}
      onClose={() => {}}
      dismissible={false}
      title="Create Your New Password"
      footer={
        <button type="submit" form="forced-password-change" disabled={submitting} className="rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60">
          {submitting ? 'Updating…' : 'Change Password and Continue'}
        </button>
      }
    >
      <form id="forced-password-change" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-700/60">For your security, you must replace the generated initial password before using the tenant portal.</p>
        {field('Current generated password', 'currentPassword', 'current-password')}
        {field('New password', 'newPassword', 'new-password')}
        {field('Confirm new password', 'confirmPassword', 'new-password')}
        <label className="flex items-center gap-2 text-xs text-ink-700/60">
          <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="accent-forest-500" /> Show passwords
        </label>
        <p className="text-xs text-ink-700/50">Your new password must contain at least 8 characters and differ from the generated password.</p>
        {error && <p role="alert" className="flex items-center gap-1.5 text-xs text-status-high"><Icon name="alert" size={13} /> {error}</p>}
      </form>
    </Modal>
  );
}
