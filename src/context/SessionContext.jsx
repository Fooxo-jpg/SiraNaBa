import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { endpoints } from '../api/endpoints.js';

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
