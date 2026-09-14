import React from 'react';
import Icon from './Icon.jsx';
import { useSession } from '../context/SessionContext.jsx';

export default function Topbar({ crumb, onOpenMenu, unreadCount = 0 }) {
  const { tenant } = useSession();

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
        Dashboard <span className="mx-1.5">/</span>
        <span className="font-medium text-ink-900">{crumb}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <label className="relative hidden w-56 md:block">
          <span className="sr-only">Search tickets, bills</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40"
          />
          <input
            type="search"
            placeholder="Search tickets, bills..."
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
        <button aria-label="Messages" className="rounded-full p-2 text-ink-700/70 hover:bg-sand-100">
          <Icon name="chat" size={19} />
        </button>

        <div className="h-8 w-8 rounded-full bg-forest-100 text-center text-xs font-semibold leading-8 text-forest-700">
          {tenant ? `${tenant.firstName[0]}${tenant.lastName[0]}` : '··'}
        </div>
      </div>
    </header>
  );
}
