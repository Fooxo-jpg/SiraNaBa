import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { endpoints } from '../api/endpoints.js';
import { useSession } from '../context/SessionContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Where to go after signing in: admins always land on the admin side,
  // tenants go back to where they were headed (or the dashboard).
  const destinationFor = (role) => {
    if (role === 'ADMIN') return '/admin';
    return location.state?.from
      ? `${location.state.from.pathname}${location.state.from.search || ''}`
      : '/';
  };

  // Already signed in (e.g. came back to /login manually)? Just continue on.
  useEffect(() => {
    if (user) navigate(destinationFor(user.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await endpoints.login(email, password, remember);
      const me = await refresh();
      navigate(destinationFor(me.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-forest-700 via-forest-500 to-forest-400 p-4">
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-6 grid grid-cols-5 gap-1.5 opacity-30"
      >
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-white" />
        ))}
      </div>

      <div className="relative w-full max-w-sm rounded-card bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-forest-500 text-white">
            <Icon name="grid" size={20} />
          </div>
          <h1 className="text-lg font-bold text-ink-900">SiraNaBa</h1>
          <p className="text-xs font-semibold tracking-wide text-ink-700/40">
            TENANT PORTAL
          </p>
          <h2 className="mt-4 text-xl font-bold text-ink-900">Sign In</h2>
          <p className="mt-1 text-sm text-ink-700/60">
            Enter your credentials to access your tenant portal.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-700/50">
              Email Address
            </label>
            <div className="relative">
              <Icon
                name="mail"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-forest-400"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">
                Password
              </label>
              <button type="button" className="text-xs font-medium text-forest-600 hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Icon
                name="lock"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-black/10 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-forest-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/40 hover:text-ink-900"
              >
                <Icon name="eye" size={16} />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-status-high">{error}</p>}

          <label className="flex items-center gap-2 text-sm text-ink-700/70">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-forest-500"
            />
            Remember this device for 30 days
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-forest-500 py-2.5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign In'} <Icon name="chevronRight" size={15} />
          </button>
        </form>

        <div className="mt-6 border-t border-black/5 pt-4">
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">
            Security
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-1.5 rounded-md bg-sand-50 py-2 text-xs font-medium text-ink-700/60">
              <Icon name="check" size={13} className="text-forest-600" /> AES-256 Encrypted
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-md bg-sand-50 py-2 text-xs font-medium text-ink-700/60">
              <Icon name="shield" size={13} className="text-forest-600" /> MFA Supported
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
