export const TOWERS = [
  { id: 1, name: 'Main Building' },
];

export const TOP_FLOOR = 12;
export const UNITS_PER_FLOOR = 10;

export const UNIT_TYPES = ['Studio', 'One-Bedroom', 'Two-Bedroom'];
export const UNIT_LAYOUT = [
  ...Array(4).fill('Studio'),
  ...Array(4).fill('One-Bedroom'),
  ...Array(2).fill('Two-Bedroom'),
];

export const RENT_BY_TYPE = {
  Studio: 15000,
  'One-Bedroom': 25000,
  'Two-Bedroom': 40000,
};

const pad2 = (n) => String(n).padStart(2, '0');

export const LEVELS = [
  { key: 'RF', label: 'Rooftop · Sky Lounge', short: 'RF', kind: 'roof', hasRooms: false },
  ...Array.from({ length: TOP_FLOOR - 1 }, (_, i) => {
    const n = TOP_FLOOR - i; // 12 down to 2
    return {
      key: pad2(n),
      label: `Floor ${n}`,
      short: String(n),
      kind: 'floor',
      number: n,
      hasRooms: true,
    };
  }),
  { key: '01', label: 'Floor 1 · Lobby', short: '1', kind: 'lobby', hasRooms: false },
  { key: 'B1', label: 'Basement 1 · Parking', short: 'B1', kind: 'parking', hasRooms: false },
  { key: 'B2', label: 'Basement 2 · Parking', short: 'B2', kind: 'parking', hasRooms: false },
];

export function levelByKey(key) {
  return LEVELS.find((l) => l.key === key);
}

function buildLevelRooms(tower, level) {
  if (!level.hasRooms) return [];
  const count = UNITS_PER_FLOOR;
  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const base = { id: `T${tower}-${level.key}-${pad2(idx)}`, tower, levelKey: level.key, index: idx, count };
    // Floor 3, room 4 -> "304"; floor 12, room 10 -> "1210".
    const number = `${level.number}${pad2(idx)}`;
    return { ...base, number, name: `Unit ${number}`, type: UNIT_LAYOUT[i] };
  });
}

const BY_LEVEL = new Map();
export const ALL_ROOMS = [];
for (const tower of TOWERS) {
  for (const level of LEVELS) {
    const rooms = buildLevelRooms(tower.id, level);
    BY_LEVEL.set(`${tower.id}:${level.key}`, rooms);
    ALL_ROOMS.push(...rooms);
  }
}

export function roomsOn(tower, levelKey) {
  return BY_LEVEL.get(`${tower}:${levelKey}`) || [];
}

export const ROOM_BY_ID = new Map(ALL_ROOMS.map((r) => [r.id, r]));

export function roomById(id) {
  return ROOM_BY_ID.get(id) || null;
}

export function vacantRooms({ type, tower, occupiedIds }) {
  return ALL_ROOMS.filter(
    (r) => (!type || r.type === type) && (!tower || r.tower === tower) && !occupiedIds.has(r.id)
  );
}
