import React from 'react';
import Icon from '../Icon.jsx';
import { adminUser } from '../../data/adminMockDb.js';

export default function AdminTopbar({ crumb, onOpenMenu, unreadCount = 2 }) {
  return (
    <header className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 lg:px-6">
      <button
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="rounded-md p-1.5 text-ink-700/70 hover:bg-sand-100 lg:hidden"
      >
        <Icon name="menu" size={20} />
      </button>

      <nav aria-label="Breadcrumb" className="hidden text-sm text-ink-700/60 sm:block">
        Dashboard
        {crumb && (
          <>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-ink-900">{crumb}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <label className="relative hidden w-56 md:block">
          <span className="sr-only">Search systems, tenants</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
          />
          <input
            type="search"
            placeholder="Search systems, tenants..."
            className="w-full rounded-lg border border-black/10 bg-sand-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-400"
          />
        </label>

        <button
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className="relative rounded-full p-2 text-ink-700/70 hover:bg-sand-100"
        >
          <Icon name="bell" size={19} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-high" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-ink-700/50">
            <Icon name="eye" size={15} />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold text-ink-900">{adminUser.name}</p>
            <p className="text-xs text-ink-700/50">Admin Portal</p>
          </div>
        </div>
      </div>
    </header>
  );
}
