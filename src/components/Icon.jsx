import React from 'react';

// A small hand-picked icon set (stroke-based, 20x20) so the app has no
// external icon dependency. Add more paths here as new screens need them.
const paths = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  wrench:
    'M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l-1-1 5.3-5.3a4 4 0 0 1 5.4-5.4l-2.2 2.2 1 1 2.2-2.2z',
  ticket:
    'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5a1.5 1.5 0 0 0 0-3V8z',
  card: 'M3 6h18v3H3zM3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  bell: 'M6 10a6 6 0 1 1 12 0v4l1.5 3h-15L6 14z M10 19a2 2 0 0 0 4 0',
  history: 'M4 12a8 8 0 1 0 3-6.2M4 12V6M4 12h6',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  chat: 'M4 5h16v11H8l-4 4z',
  chevronRight: 'M9 5l7 7-7 7',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V19a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  drop: 'M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z',
  droplet: 'M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  wifi: 'M2 8.5a16 16 0 0 1 20 0M5.5 12a11 11 0 0 1 13 0M9 15.5a6 6 0 0 1 6 0M12 19h.01',
  check: 'M5 12l5 5L20 7',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 7v5l3 3 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  calendar: 'M7 3v3M17 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  alert: 'M12 9v4M12 17h.01M10.3 4l-8 14a1 1 0 0 0 .9 1.5h17.6a1 1 0 0 0 .9-1.5l-8-14a1 1 0 0 0-1.7 0z',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  trend: 'M3 17l6-6 4 4 8-8M21 7h-6v6',
  dots: 'M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  lock: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v9H5z',
  mail: 'M4 5h16v14H4zM4 5l8 7 8-7',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 21h16',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M10 11v6M14 11v6',
  star: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z',
  pencil: 'M4 20h4l10.5-10.5a2 2 0 0 0-3-3L5 17v3z M13 6.5l4 4',
  fileText: 'M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h8M8 9h2',
  help: 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7v.5M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  phone: 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.2 2.2z',
  chevronLeft: 'M15 5l-7 7 7 7',
  flame: 'M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-1-2.5.8.2 2 1.3 2 4a5 5 0 0 1-10 0c0-3.5 2-5 3-6.5.6-.9 1-2 1-3z',
  database: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  sort: 'M7 16V4M7 4L4 7M7 4l3 3M17 8v12M17 20l3-3M17 20l-3-3',
  chevronDown: 'M5 8l7 7 7-7',
  external: 'M14 4h6v6M20 4l-9 9M6 5h4a1 1 0 0 1 0 2H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4a1 1 0 0 1 2 0v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z',
  refresh: 'M4 4v6h6M20 20v-6h-6M4.5 15a8 8 0 0 0 14.3 3.4M19.5 9A8 8 0 0 0 5.2 5.6',
  upload: 'M12 21V9m0 0l-4 4m4-4l4 4M4 21h16',
  users: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M14.5 15.2c.5-.1 1-.2 1.5-.2 3 0 6 2 6 5',
  mapPin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  dollar: 'M12 3v18M16 7.5C15 6.5 13.7 6 12 6c-2 0-3.5 1-3.5 2.5S10 11 12 11.5s3.5 1 3.5 2.5S14 17 12 17c-1.7 0-3-.5-4-1.5',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
