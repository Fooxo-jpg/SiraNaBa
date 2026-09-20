import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../Icon.jsx';
import useSignOut from './useSignOut.js';

// Replaces the old top bar: lives inside the page content and scrolls with it.
export default function PageHeader({
  crumb,
  user,
  searchPlaceholder,
  unreadCount = 0,
  showMessages = false,
  profileTo,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const signOut = useSignOut();
  const { pathname } = useLocation();
  // No unread dot on the tenant dashboard itself.
  const showDot = unreadCount > 0 && pathname !== '/';

  const avatar = (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-semibold text-forest-700">
      {user.initials ? user.initials : <Icon name="eye" size={15} />}
    </span>
  );

  return (
    <header className="mb-6 flex items-center gap-x-4">
      <nav aria-label="Breadcrumb" className="min-w-0 truncate text-sm text-ink-700/60">
        <span className={crumb ? 'hidden sm:inline' : ''}>Dashboard</span>
        {crumb && (
          <>
            <span className="mx-1.5 hidden sm:inline">/</span>
            <span className="font-medium text-ink-900">{crumb}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
        <label className="relative hidden w-56 md:block">
          <span className="sr-only">{searchPlaceholder}</span>
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-700/40"
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-black/10 bg-white py-2 pl-4 pr-9 text-sm outline-none focus:border-forest-400"
          />
        </label>

        <button
          aria-label={`Notifications${showDot ? `, ${unreadCount} unread` : ''}`}
          className="relative rounded-full bg-white p-2 text-ink-700/70 shadow-card hover:bg-sand-100"
        >
          <Icon name="bell" size={19} />
          {showDot && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-high" />
          )}
        </button>
        {showMessages && (
          <button aria-label="Messages" className="rounded-full bg-white p-2 text-ink-700/70 shadow-card hover:bg-sand-100">
            <Icon name="chat" size={19} />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full bg-white p-1 shadow-card hover:bg-sand-100 sm:pr-3"
          >
            {avatar}
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-semibold text-ink-900">{user.name}</span>
              <span className="block text-xs text-ink-700/50">{user.sub}</span>
            </span>
          </button>

          {menuOpen && (
            <>
              <button aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-12 z-40 w-52 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
                <div className="border-b border-black/5 px-3 py-2.5 sm:hidden">
                  <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-700/50">{user.sub}</p>
                </div>
                {profileTo && (
                  <Link
                    to={profileTo}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-sand-100"
                  >
                    <Icon name="settings" size={15} /> Account Settings
                  </Link>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-sand-100"
                >
                  <Icon name="logout" size={15} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
