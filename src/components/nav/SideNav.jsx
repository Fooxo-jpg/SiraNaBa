import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../Icon.jsx';
import useSignOut from './useSignOut.js';

const STORAGE_KEY = 'siranaba.sidebar.collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function Badge({ count, floating = false }) {
  if (!count) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-high px-1 text-[10px] font-bold leading-none text-white ${
        floating ? 'absolute -right-1 -top-1' : ''
      }`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function DesktopItem({ to, label, icon, end, badge, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center rounded-xl text-[13px] font-medium transition-colors ${
          collapsed ? 'h-11 w-11 justify-center self-center' : 'gap-3.5 px-4 py-3'
        } ${isActive ? 'bg-ink-900 text-white' : 'text-ink-700/60 hover:bg-black/5 hover:text-ink-900'}`
      }
    >
      <Icon name={icon} size={18} className="flex-shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && <Badge count={badge} />}
      {collapsed && <Badge count={badge} floating />}
    </NavLink>
  );
}

function DesktopSidebar({ brand, items, collapsed, onToggle }) {
  const signOut = useSignOut();

  return (
    <aside
      className={`hidden flex-shrink-0 p-3 pr-0 transition-[width] duration-200 lg:block ${
        collapsed ? 'w-[92px]' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col rounded-3xl bg-white p-3 shadow-card">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`mb-8 mt-2 flex items-center rounded-xl text-left transition-colors hover:bg-sand-100 ${
            collapsed ? 'h-11 w-11 justify-center self-center' : 'gap-2.5 px-3 py-2'
          }`}
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
            <Icon name={brand.icon} size={16} />
          </span>
          {!collapsed && <span className="text-base font-bold text-ink-900">SiraNaBa</span>}
        </button>

        <nav className="flex flex-col gap-1.5" aria-label="Main">
          {items.map((item) => (
            <DesktopItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="mt-auto pt-4">
          <button
            type="button"
            onClick={signOut}
            title={collapsed ? 'Sign Out' : undefined}
            aria-label={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center rounded-xl text-[13px] font-medium text-ink-700/60 transition-colors hover:bg-black/5 hover:text-ink-900 ${
              collapsed ? 'h-11 w-11 justify-center self-center' : 'w-full gap-3.5 px-4 py-3'
            }`}
          >
            <Icon name="logout" size={18} className="flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ items }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 lg:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      {/* Full-width pill (capped on larger phones/tablets). Items spread evenly,
          so 5 or 6 icons fit on any screen width down to 320px. */}
      <ul className="flex w-full max-w-md items-center justify-between rounded-full bg-ink-900 p-1.5 shadow-xl shadow-black/25">
        {items.map(({ to, label, icon, end, badge }) => (
          <li key={to} className="flex flex-1 justify-center">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-white text-ink-900' : 'text-white/75 hover:text-white'
                }`
              }
            >
              <Icon name={icon} size={19} />
              <Badge count={badge} floating />
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Desktop: floating rounded sidebar (click the logo to collapse to icons).
// Mobile: floating dark pill bottom navigation.
export default function SideNav({ items, brandIcon = 'grid' }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Ignore storage failures (private mode etc.).
    }
  }, [collapsed]);

  return (
    <>
      <DesktopSidebar
        brand={{ icon: brandIcon }}
        items={items}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
      />
      <MobileBottomNav items={items} />
    </>
  );
}
