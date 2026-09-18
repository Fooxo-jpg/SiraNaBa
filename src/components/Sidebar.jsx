import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useSession } from '../context/SessionContext.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/maintenance', label: 'Maintenance', icon: 'wrench' },
  { to: '/billing', label: 'Payments', icon: 'card' },
  { to: '/notifications', label: 'Notifications', icon: 'bell' },
];

function NavItem({ to, label, icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-forest-100 text-forest-700'
            : 'text-ink-700/70 hover:bg-sand-100 hover:text-ink-900'
        }`
      }
    >
      <Icon name={icon} size={18} />
      {label}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { tenant } = useSession();
  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-2 pb-8 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forest-500 text-white">
            <Icon name="grid" size={16} />
          </div>
          <span className="text-base font-bold text-ink-900">SiraNaBa</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mb-3 flex items-center gap-3 rounded-lg border-t border-black/5 px-2 py-3 transition-colors ${
              isActive ? 'bg-forest-100' : 'hover:bg-sand-100'
            }`
          }
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
            {tenant ? `${tenant.firstName[0]}${tenant.lastName[0]}` : '··'}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="truncate text-sm font-semibold text-ink-900 leading-tight">
              {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Loading…'}
            </p>
            <p className="truncate text-xs text-ink-700/60 leading-tight">
              {tenant ? `Unit ${tenant.unit}, ${tenant.building}` : ''}
            </p>
          </div>
        </NavLink>
        <div className="flex flex-col gap-1">
          <NavItem to="/login" label="Sign Out" icon="logout" onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-black/5 bg-white p-4 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={onCloseMobile} />
          <div className="relative z-50 h-full w-72 bg-white p-4 shadow-xl">
            <button
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="absolute right-4 top-4 rounded-full p-1 text-ink-700/60 hover:bg-sand-100"
            >
              <Icon name="close" size={18} />
            </button>
            <SidebarContent onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
