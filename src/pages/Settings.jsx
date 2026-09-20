import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { endpoints } from '../api/endpoints.js';
import { formatDate } from '../utils/format.js';

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

const profileFromTenant = (tenant) => ({
  firstName: tenant?.firstName || '',
  lastName: tenant?.lastName || '',
  email: tenant?.email || '',
  phone: tenant?.phone || '',
});

function PasswordField({ label, value, onChange, show, onToggleShow, autoComplete }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-900">{label}</label>
      <div className="relative">
        <Icon
          name="lock"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
        />
        <input
          type={show ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-forest-400"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/40 hover:text-ink-900"
        >
          <Icon name="eye" size={16} />
        </button>
      </div>
    </div>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const reset = () => {
    setForm(EMPTY_PASSWORD_FORM);
    setShowPasswords(false);
    setError('');
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await endpoints.changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      close();
    } catch (err) {
      setError(err.message || 'Could not change your password. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Update Password"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="change-password-form"
            disabled={submitting}
            className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            {submitting ? 'Updating…' : 'Update Password'}
          </button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-ink-700/60">
          Enter your current password, then choose a new one for your tenant portal login.
        </p>

        <PasswordField
          label="Current password"
          value={form.currentPassword}
          onChange={setField('currentPassword')}
          show={showPasswords}
          onToggleShow={() => setShowPasswords((v) => !v)}
          autoComplete="current-password"
        />
        <PasswordField
          label="New password"
          value={form.newPassword}
          onChange={setField('newPassword')}
          show={showPasswords}
          onToggleShow={() => setShowPasswords((v) => !v)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm new password"
          value={form.confirmPassword}
          onChange={setField('confirmPassword')}
          show={showPasswords}
          onToggleShow={() => setShowPasswords((v) => !v)}
          autoComplete="new-password"
        />

        <p className="text-xs text-ink-700/50">Must be at least 8 characters.</p>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-status-high">
            <Icon name="alert" size={13} /> {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function ProfileCard() {
  const { tenant, refresh } = useSession();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profileFromTenant(tenant));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Keep the form in sync with the loaded/refreshed tenant, as long as the
  // tenant isn't mid-edit (don't clobber what they're typing).
  useEffect(() => {
    if (!editing) setForm(profileFromTenant(tenant));
  }, [tenant, editing]);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const startEditing = () => {
    setForm(profileFromTenant(tenant));
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(profileFromTenant(tenant));
    setError('');
    setEditing(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }

    setSaving(true);
    try {
      // Persists to the tenant's record in the database, so Tenant
      // Management on the admin side reflects the same contact info.
      await endpoints.updateTenantProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      await refresh();
      setEditing(false);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message || 'Could not save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = (disabled) =>
    `w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400 ${
      disabled ? 'bg-sand-50 text-ink-700/60' : ''
    }`;

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink-900">Profile</h2>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="rounded-md border border-black/10 px-3.5 py-2 text-sm font-medium hover:bg-sand-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-forest-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              disabled={!tenant}
              className="flex items-center gap-1.5 rounded-md border border-black/10 px-3.5 py-2 text-sm font-semibold text-ink-900 hover:bg-sand-100 disabled:opacity-60"
            >
              <Icon name="pencil" size={14} /> Edit Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">First name</label>
            <input
              value={form.firstName}
              onChange={setField('firstName')}
              disabled={!editing}
              className={fieldCls(!editing)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">Last name</label>
            <input
              value={form.lastName}
              onChange={setField('lastName')}
              disabled={!editing}
              className={fieldCls(!editing)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={setField('email')}
              disabled={!editing}
              className={fieldCls(!editing)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">Phone</label>
            <input
              value={form.phone}
              onChange={setField('phone')}
              disabled={!editing}
              placeholder={editing ? '(555) 000-0000' : ''}
              className={fieldCls(!editing)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">Unit</label>
            <input
              value={tenant?.unit || ''}
              disabled
              className="w-full rounded-lg border border-black/10 bg-sand-50 px-3 py-2.5 text-sm text-ink-700/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-900">Building</label>
            <input
              value={tenant?.building || ''}
              disabled
              className="w-full rounded-lg border border-black/10 bg-sand-50 px-3 py-2.5 text-sm text-ink-700/60"
            />
          </div>
        </div>

        {editing && (
          <p className="mt-3 text-xs text-ink-700/50">
            Changing your email updates the address you sign in with.
          </p>
        )}
        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-status-high">
            <Icon name="alert" size={13} /> {error}
          </p>
        )}
        {success && !editing && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-status-success">
            <Icon name="check" size={13} /> {success}
          </p>
        )}
      </form>
    </Card>
  );
}

export default function Settings() {
  const { tenant } = useSession();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  return (
    <Layout crumb="Account Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Account Settings</h1>
          <p className="text-sm text-ink-700/60">Update your profile and notification preferences.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <ProfileCard />

            <Card className="p-6">
              <h2 className="mb-1 font-semibold text-ink-900">Security</h2>
              <p className="mb-4 text-sm text-ink-700/60">
                Manage the password you use to sign in to your tenant portal.
              </p>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-black/5 bg-sand-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                    <Icon name="lock" size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-900">Password</p>
                    <p className="text-xs text-ink-700/50">••••••••••••</p>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex-shrink-0 rounded-md border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-ink-900 hover:bg-sand-100"
                >
                  Update Password
                </button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-lg font-semibold text-forest-700">
                {tenant ? `${tenant.firstName[0]}${tenant.lastName[0]}` : '··'}
              </div>
              <p className="font-semibold text-ink-900">
                {tenant ? `${tenant.firstName} ${tenant.lastName}` : '—'}
              </p>
              <p className="text-sm text-ink-700/50">{tenant?.email}</p>

              <div className="mt-5 space-y-3 border-t border-black/5 pt-4 text-left text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-700/50">Unit</span>
                  <span className="font-medium text-ink-900">{tenant?.unit || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-700/50">Building</span>
                  <span className="font-medium text-ink-900">{tenant?.building || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-700/50">Phone</span>
                  <span className="font-medium text-ink-900">{tenant?.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-700/50">Lease start</span>
                  <span className="font-medium text-ink-900">
                    {tenant?.leaseStart ? formatDate(tenant.leaseStart) : '—'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </Layout>
  );
}
