import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { endpoints } from '../api/endpoints.js';
import { useAutoRefresh } from '../utils/useAutoRefresh.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  // `user` is who is signed in ({ email, role }); `tenant` is only loaded
  // for TENANT accounts. ADMIN accounts have no tenant.
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Re-checks the session cookie against the backend. Called once on
  // mount, and again right after a successful login so the app doesn't
  // need a full page reload to pick up the new session.
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return endpoints
      .getMe()
      .then(async (me) => {
        setUser(me);
        if (me.role === 'ADMIN') {
          setTenant(null);
        } else {
          setTenant(await endpoints.getTenant());
        }
        return me;
      })
      .catch((err) => {
        setUser(null);
        setTenant(null);
        setError(err.message);
        throw err;
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // Expected when there's no session yet - the route guards in App.jsx
      // handle redirecting to /login, nothing to do here.
    });
  }, [refresh]);

  // Clears local session state immediately (e.g. after sign out) without
  // waiting on a round trip to the server.
  const clearSession = useCallback(() => {
    setUser(null);
    setTenant(null);
    setError('Signed out');
  }, []);

  // The admin can edit this tenant's record (name, email, phone, balance...) or
  // remove the account. Quietly re-read it now and then so the portal reflects
  // that without a reload. Unlike refresh(), this never flips `loading`, so it
  // won't blank the page the tenant is on.
  const syncTenant = useCallback(async () => {
    try {
      const fresh = await endpoints.getTenant();
      setTenant((prev) => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh));
    } catch (err) {
      // Account removed by an admin, or the session ended: send them to sign-in.
      // Anything else (offline, server hiccup) is ignored and retried next tick.
      if ([401, 403, 404].includes(err.status)) {
        endpoints.logout().catch(() => {});
        clearSession();
      }
    }
  }, [clearSession]);

  useAutoRefresh(syncTenant, { enabled: !!user && user.role !== 'ADMIN' && !!tenant });

  return (
    <SessionContext.Provider value={{ user, tenant, loading, error, refresh, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
