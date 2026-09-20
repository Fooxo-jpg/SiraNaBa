import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints } from '../api/endpoints.js';
import { ROOM_BY_ID } from '../data/buildingData.js';
import { useSession } from './SessionContext.jsx';
import { useAutoRefresh } from '../utils/useAutoRefresh.js';

// The admin tenant registry. The tenants themselves come from the database
// (GET /api/admin/tenants) - the very same records the tenant portal reads and
// edits - so a change made on either side shows up on the other. Nothing about
// a tenant is stored in the browser any more.
//
// Both the Tenant Management page and the Building Map read from here, so
// assigning a tenant to a room shows up on the map immediately and removing
// one frees the room.
//
// The only thing still kept in localStorage is the admin's "Recent Account
// Activity" feed, which is a local UI log rather than tenant data.

const ACTIVITY_KEY = 'siranaba.admin.activity.v1';
const LEGACY_KEY = 'siranaba.admin.tenants.v2'; // older versions stored tenants here too
const ACTIVITY_LIMIT = 5;

const TenantRegistryContext = createContext(null);

function loadActivity() {
  try {
    const own = localStorage.getItem(ACTIVITY_KEY);
    if (own) return JSON.parse(own);
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return JSON.parse(legacy).activity || [];
  } catch {
    /* storage unavailable or corrupt - start with an empty feed */
  }
  return [];
}

// API record -> the shape the admin pages use. `id` is the human-friendly
// registry ID (T-0001) shown in the UI; `accountId` is the database id that
// every API call takes.
function toRegistryTenant(r) {
  return {
    accountId: r.id,
    id: r.code || r.id,
    name: r.name || '',
    firstName: r.firstName || '',
    lastName: r.lastName || '',
    email: r.email || '',
    phone: r.phone || '',
    roomId: r.roomId || '',
    levelKey: ROOM_BY_ID.get(r.roomId)?.levelKey,
    tower: r.tower || 0,
    building: r.building || '',
    unit: r.unit || '',
    type: r.unitType || '',
    occupancy: r.occupancy,
    leaseStart: r.leaseStart || '',
    rent: r.monthlyRent || 0,
    balance: r.currentBalance || 0,
    payment: r.payment,
    dueDate: r.dueDate || '',
    account: r.account,
  };
}

export function TenantRegistryProvider({ children }) {
  const { user } = useSession();
  const isAdmin = user?.role === 'ADMIN';

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [activity, setActivity] = useState(loadActivity);

  // Fetch the latest tenants. Safe to call any time (after an edit, on a timer,
  // when the tab regains focus); only swaps state if something actually changed.
  const reload = useCallback(async () => {
    try {
      const rows = await endpoints.getAdminTenants();
      const next = rows.map(toRegistryTenant);
      setTenants((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setSyncError('');
    } catch (err) {
      setSyncError(err.message || "Couldn't load tenants.");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setTenants((prev) => (prev.length ? [] : prev)); // signed out / not an admin: drop any previous session's data
      return;
    }
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [isAdmin, reload]);

  // Pick up edits tenants make in their Account Settings without a manual reload.
  useAutoRefresh(reload, { enabled: isAdmin });

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [activity]);

  const pushActivity = useCallback(
    (entry) =>
      setActivity((a) => [{ ...entry, at: new Date().toISOString() }, ...a].slice(0, ACTIVITY_LIMIT)),
    []
  );

  const value = useMemo(() => {
    // Only tenants assigned to a real room appear on the map. (The demo tenant
    // seeded before rooms existed has no room, but still shows in the table.)
    const byRoomId = new Map(tenants.filter((t) => ROOM_BY_ID.has(t.roomId)).map((t) => [t.roomId, t]));
    return {
      tenants,
      activity,
      loading,
      syncError,
      tenantByRoomId: byRoomId,
      occupiedIds: new Set(byRoomId.keys()),
      reload,
      pushActivity,
    };
  }, [tenants, activity, loading, syncError, reload, pushActivity]);

  return <TenantRegistryContext.Provider value={value}>{children}</TenantRegistryContext.Provider>;
}

export function useTenantRegistry() {
  const ctx = useContext(TenantRegistryContext);
  if (!ctx) throw new Error('useTenantRegistry must be used inside <TenantRegistryProvider>');
  return ctx;
}
