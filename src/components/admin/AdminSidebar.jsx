import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../Icon.jsx';
import { adminUser } from '../../data/adminMockDb.js';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/triage', label: 'Triage & Dispatch', icon: 'ticket' },
  { to: '/admin/iot', label: 'IoT & Emergency', icon: 'wifi' },
  { to: '/admin/financial', label: 'Tenant & Financial', icon: 'card' },
  { to: '/admin/staff', label: 'Staff Management', icon: 'users' },
  { to: '/admin/config', label: 'Configuration', icon: 'settings' },
];

function NavItem({ to, label, icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-forest-100 text-forest-700'
            : 'text-ink-700/70 hover:bg-sand-100 hover:text-ink-900'
        }`
      }
    >
      <span className="flex items-center gap-3">
        <Icon name={icon} size={18} />
        {label}
      </span>
      <Icon name="chevronRight" size={14} className="text-ink-700/30" />
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-2 pb-8 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-forest-500 text-white">
            <Icon name="shield" size={16} />
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
        <div className="mb-3 flex items-center gap-3 rounded-lg border-t border-black/5 px-2 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sand-100 text-ink-700/50">
            <Icon name="eye" size={16} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <p className="truncate text-sm font-semibold text-ink-900 leading-tight">{adminUser.name}</p>
            <p className="truncate text-xs text-ink-700/60 leading-tight">{adminUser.role}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <NavItem to="/login" label="Sign Out" icon="logout" onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar({ mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className="hidden w-64 flex-shrink-0 border-r border-black/5 bg-white p-4 lg:flex">
        <SidebarContent />
      </aside>

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
