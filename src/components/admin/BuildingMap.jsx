import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../Card.jsx';
import Icon from '../Icon.jsx';
import StatusBadge from '../StatusBadge.jsx';
import { useTenantRegistry } from '../../context/TenantRegistryContext.jsx';
import { formatPhp, formatDate } from '../../utils/format.js';
import { TOWERS, LEVELS, ALL_ROOMS, UNIT_TYPES, RENT_BY_TYPE, levelByKey, roomsOn } from '../../data/buildingData.js';

// Width of one level's row of 10 room blocks (10 x 8px + 9 x 1px gaps), so
// open-plan levels (lobby, parking) can be drawn as a single bar of equal width.
const BAR_WIDTH = 'w-[89px]';

const OPEN_LEVEL_INFO = {
  roof: {
    icon: 'star',
    title: 'Sky Lounge',
    text: 'The rooftop is a single open sky lounge. It has no individual rooms.',
  },
  lobby: {
    icon: 'users',
    title: 'Lobby',
    text: 'The ground-floor lobby is one open common area. It has no individual rooms.',
  },
  parking: {
    icon: 'grid',
    title: 'Parking',
    text: 'This basement level is dedicated to parking. It has no individual rooms.',
  },
};

const OPEN_BAR_COLOR = {
  roof: 'bg-gray-200',
  lobby: 'bg-gray-300',
  parking: 'bg-gray-500',
};

export default function BuildingMap() {
  const [sel, setSel] = useState({ tower: 1, levelKey: '02', roomId: null });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null);
  const navigate = useNavigate();
  const { tenantByRoomId } = useTenantRegistry();
  // Only tenants assigned to a room on this map (the registry can also hold tenants with no room yet).
  const tenants = useMemo(() => [...tenantByRoomId.values()], [tenantByRoomId]);

  const level = levelByKey(sel.levelKey);
  const tower = TOWERS.find((t) => t.id === sel.tower);
  const rooms = roomsOn(sel.tower, sel.levelKey);
  const selRoom = rooms.find((r) => r.id === sel.roomId) || null;
  const selTenant = selRoom ? tenantByRoomId.get(selRoom.id) : null;
  const levelIdx = LEVELS.findIndex((l) => l.key === sel.levelKey);

  // Search matches rooms (by number/name) and open levels (lobby, parking).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const levelHits = TOWERS.flatMap((t) =>
      LEVELS.filter((l) => !l.hasRooms && l.label.toLowerCase().includes(q)).map((l) => ({
        key: `${t.id}-${l.key}`,
        title: l.label,
        where: t.name,
        go: { tower: t.id, levelKey: l.key, roomId: null },
      }))
    );
    const roomHits = ALL_ROOMS.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    ).map((r) => ({
      key: r.id,
      title: r.name,
      where: `T${r.tower} · ${levelByKey(r.levelKey).short}`,
      go: { tower: r.tower, levelKey: r.levelKey, roomId: r.id },
    }));
    const tenantHits = tenants
      .filter((t) => [t.name, t.id].some((v) => v.toLowerCase().includes(q)))
      .map((t) => ({
        key: `tenant-${t.id}`,
        title: `${t.name} · ${t.unit}`,
        where: `T${t.tower} · ${levelByKey(t.levelKey).short}`,
        go: { tower: t.tower, levelKey: t.levelKey, roomId: t.roomId },
      }));
    // A room can match both by number and by tenant name; list it once.
    const taken = new Set(tenantHits.map((h) => h.go.roomId));
    return [...levelHits, ...tenantHits, ...roomHits.filter((h) => !taken.has(h.go.roomId))].slice(0, 8);
  }, [query, tenants]);

  // Per-type totals and how many of each are occupied by a tenant.
  const typeCounts = useMemo(() => {
    const c = {};
    ALL_ROOMS.forEach((r) => {
      c[r.type] = c[r.type] || { total: 0, occupied: 0 };
      c[r.type].total += 1;
      if (tenantByRoomId.has(r.id)) c[r.type].occupied += 1;
    });
    return c;
  }, [tenantByRoomId]);

  const dimmed = (r) => typeFilter && r.type !== typeFilter;

  const goTo = (target) => {
    setSel(target);
    setQuery('');
    setSearchOpen(false);
  };

  const goToLevel = (idx) => {
    if (idx < 0 || idx >= LEVELS.length) return;
    setSel((s) => ({ ...s, levelKey: LEVELS[idx].key, roomId: null }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: search + summary */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) goTo(results[0].go);
              }}
              placeholder="Find a room (e.g. 1204, studio, lobby)"
              className="w-full rounded-lg border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
            />
            {searchOpen && query.trim() && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-black/10 bg-white py-1 shadow-lg">
                {results.length === 0 && <p className="px-3 py-2 text-xs text-ink-700/50">Nothing matches.</p>}
                {results.map((r) => (
                  <button
                    key={r.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo(r.go)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-sand-100"
                  >
                    <span className="truncate text-ink-900">{r.title}</span>
                    <span className="flex-shrink-0 font-mono text-[11px] text-ink-700/50">{r.where}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-700/60">
            <span><b className="font-mono text-ink-900">{TOWERS.length}</b> towers</span>
            <span><b className="font-mono text-ink-900">{LEVELS.length}</b> levels each</span>
            <span><b className="font-mono text-ink-900">{ALL_ROOMS.length}</b> rooms</span>
            <span><b className="font-mono text-forest-600">{tenants.length}</b> occupied</span>
            <span><b className="font-mono text-ink-900">{ALL_ROOMS.length - tenants.length}</b> vacant</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-700/40">Unit type</span>
          <span className="sr-only">Counts show occupied over total units</span>
          {UNIT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter((f) => (f === t ? null : t))}
              aria-pressed={typeFilter === t}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                typeFilter === t ? 'border-ink-700 bg-gray-100 text-ink-900' : 'border-black/10 text-ink-700/70 hover:bg-sand-100'
              }`}
            >
              {t === 'Penthouse' && <span className="h-2 w-2 rounded-full bg-[#E2C7A8]" />}
              {t}
              <span className="font-mono text-ink-700/50">{typeCounts[t].occupied}/{typeCounts[t].total}</span>
            </button>
          ))}
          {typeFilter && (
            <button onClick={() => setTypeFilter(null)} className="text-xs font-medium text-ink-700/60 hover:underline">
              Clear
            </button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[auto_1fr]">
        {/* Elevation: both towers, every level */}
        <Card className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-700/40">
            Building Elevation · click a level
          </p>
          <div className="flex justify-center gap-5 overflow-x-auto thin-scrollbar">
            {TOWERS.map((t) => (
              <div key={t.id}>
                <button
                  onClick={() => setSel((s) => ({ ...s, tower: t.id, roomId: null }))}
                  className={`mb-2 w-full rounded-md px-2 py-1 text-xs font-semibold ${
                    sel.tower === t.id ? 'bg-ink-700 text-white' : 'bg-sand-100 text-ink-700/70 hover:bg-sand-100/70'
                  }`}
                >
                  {t.name}
                </button>
                <div className="rounded-md border border-black/10 p-1">
                  {LEVELS.map((l) => {
                    const isSel = sel.tower === t.id && sel.levelKey === l.key;
                    return (
                      <React.Fragment key={l.key}>
                        {l.key === 'B1' && (
                          <div className="my-0.5 flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider text-ink-700/30">
                            <span className="h-px flex-1 bg-ink-700/20" /> Ground <span className="h-px flex-1 bg-ink-700/20" />
                          </div>
                        )}
                        <button
                          onClick={() => setSel({ tower: t.id, levelKey: l.key, roomId: null })}
                          title={`${t.name} · ${l.label}`}
                          className={`flex h-[18px] w-full items-center gap-1.5 rounded px-1 ${
                            isSel ? 'bg-gray-100 ring-1 ring-gray-400' : 'hover:bg-sand-100'
                          }`}
                        >
                          <span className="w-5 text-right font-mono text-[9px] text-ink-700/50">{l.short}</span>
                          {l.hasRooms ? (
                            <span className={`flex gap-px ${BAR_WIDTH}`}>
                              {roomsOn(t.id, l.key).map((r) => (
                                <span
                                  key={r.id}
                                  title={`${r.name} · ${r.type} · ${tenantByRoomId.get(r.id)?.name ?? 'Vacant'}`}
                                  className={`h-3 flex-1 rounded-[2px] ${dimmed(r) ? 'opacity-20' : ''} ${
                                    sel.roomId === r.id
                                      ? 'bg-ink-900'
                                      : tenantByRoomId.has(r.id)
                                        ? 'bg-forest-500'
                                        : l.kind === 'penthouse'
                                          ? 'bg-[#E2C7A8]'
                                          : 'bg-gray-300'
                                  }`}
                                />
                              ))}
                            </span>
                          ) : (
                            <span className={`h-3 ${BAR_WIDTH} rounded-[2px] ${OPEN_BAR_COLOR[l.kind]}`} />
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-ink-700/50">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-forest-500" /> Occupied</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gray-300" /> Vacant</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-[#E2C7A8]" /> Vacant penthouse</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gray-200" /> Sky lounge</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gray-300" /> Lobby</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-gray-500" /> Parking</span>
          </div>
        </Card>

        {/* Level detail */}
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/60">{tower.name}</p>
                <h2 className="text-lg font-bold text-ink-900">{level.label}</h2>
                <p className="text-xs text-ink-700/50">
                  {level.hasRooms
                    ? level.kind === 'penthouse'
                      ? `${rooms.length} ${rooms.length === 1 ? 'penthouse' : 'penthouses'}`
                      : `${rooms.length} rooms`
                    : 'Open area · no rooms'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToLevel(levelIdx - 1)}
                  disabled={levelIdx === 0}
                  aria-label="Level above"
                  className="rounded-md border border-black/10 p-1.5 text-ink-700/60 hover:bg-sand-100 disabled:opacity-30"
                >
                  <Icon name="chevronDown" size={15} className="rotate-180" />
                </button>
                <button
                  onClick={() => goToLevel(levelIdx + 1)}
                  disabled={levelIdx === LEVELS.length - 1}
                  aria-label="Level below"
                  className="rounded-md border border-black/10 p-1.5 text-ink-700/60 hover:bg-sand-100 disabled:opacity-30"
                >
                  <Icon name="chevronDown" size={15} />
                </button>
              </div>
            </div>

            {level.hasRooms ? (
              <div className={`grid gap-2.5 ${rooms.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-5'}`}>
                {rooms.map((r) => {
                  const isSel = selRoom?.id === r.id;
                  const isPenthouse = r.type === 'Penthouse';
                  const occupant = tenantByRoomId.get(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSel((s) => ({ ...s, roomId: r.id }))}
                      title={`${r.name} · ${r.type} · ${occupant ? occupant.name : 'Vacant'}`}
                      className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${dimmed(r) ? 'opacity-25' : ''} ${
                        occupant
                          ? `border-forest-200 bg-forest-50 text-forest-800 ${isPenthouse ? 'py-6' : ''}`
                          : isPenthouse
                            ? 'border-[#EBDAC6] bg-[#FBF5EE] py-6 text-[#8A6238]'
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                      } ${isSel ? 'ring-2 ring-ink-700 ring-offset-1' : 'hover:shadow-card'}`}
                    >
                      <span className="font-mono text-sm font-bold leading-tight">{r.number}</span>
                      <span className="mt-0.5 w-full truncate text-[11px] opacity-80">
                        {r.type}
                      </span>
                      <span className={`w-full truncate text-[10px] ${occupant ? 'font-semibold' : 'opacity-50'}`}>
                        {occupant ? occupant.name : 'Vacant'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-black/10 bg-sand-50 px-6 py-10 text-center">
                <Icon name={OPEN_LEVEL_INFO[level.kind].icon} size={22} className="text-ink-700/40" />
                <p className="text-sm font-semibold text-ink-900">{OPEN_LEVEL_INFO[level.kind].title}</p>
                <p className="max-w-sm text-xs text-ink-700/50">{OPEN_LEVEL_INFO[level.kind].text}</p>
              </div>
            )}
          </Card>

          {level.hasRooms && (
            <Card className="p-5">
              {!selRoom ? (
                <p className="py-4 text-center text-sm text-ink-700/50">Select a room to see its details.</p>
              ) : (
                <div>
                  <h3 className="text-base font-bold text-ink-900">{selRoom.name}</h3>
                  <p className="mb-3 flex items-center gap-1 text-xs text-ink-700/50">
                    <Icon name="mapPin" size={12} />
                    {tower.name} · {level.label}
                  </p>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-ink-700/50">Room ID</dt>
                      <dd className="font-mono font-semibold text-ink-900">{selRoom.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-700/50">Unit type</dt>
                      <dd className="font-semibold text-ink-900">{selRoom.type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-700/50">Level</dt>
                      <dd className="font-semibold text-ink-900">{level.short}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-700/50">Position</dt>
                      <dd className="font-semibold text-ink-900">
                        {selRoom.index} of {selRoom.count}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 border-t border-black/5 pt-4">
                    {selTenant ? (
                      <>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Current tenant</p>
                          <div className="flex gap-1.5">
                            <StatusBadge label={selTenant.occupancy} />
                            <StatusBadge label={selTenant.payment} />
                          </div>
                        </div>
                        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                          <div>
                            <dt className="text-xs text-ink-700/50">Name</dt>
                            <dd className="font-semibold text-ink-900">{selTenant.name}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-700/50">Tenant ID</dt>
                            <dd className="font-mono font-semibold text-ink-900">{selTenant.id}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-700/50">Monthly rent</dt>
                            <dd className="font-semibold text-ink-900">{formatPhp(selTenant.rent)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-700/50">Lease start</dt>
                            <dd className="font-semibold text-ink-900">{formatDate(selTenant.leaseStart + 'T00:00:00')}</dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-xs text-ink-700/50">Contact</dt>
                            <dd className="truncate font-semibold text-ink-900" title={selTenant.email}>{selTenant.email}</dd>
                          </div>
                        </dl>
                        <button
                          onClick={() => navigate('/admin/financial', { state: { query: selTenant.id } })}
                          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-forest-600 hover:underline"
                        >
                          <Icon name="external" size={12} /> View in Tenant Management
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink-700/60">
                          This {selRoom.type.toLowerCase()} unit is vacant · {formatPhp(RENT_BY_TYPE[selRoom.type])}/month
                        </p>
                        <button
                          onClick={() => navigate('/admin/financial', { state: { assignRoomId: selRoom.id } })}
                          className="flex items-center gap-1.5 rounded-md bg-forest-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-600"
                        >
                          <Icon name="plus" size={13} /> Assign tenant
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
