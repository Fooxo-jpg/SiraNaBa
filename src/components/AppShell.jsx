import React from 'react';
import SideNav from './nav/SideNav.jsx';

// Shared page frame: sidebar (desktop) / bottom nav (mobile) + scrollable
// content area. There is no top bar; each Layout renders <PageHeader> as the
// first thing inside `children`.
export default function AppShell({ navItems, brandIcon, children }) {
  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden bg-sand-100">
      <SideNav items={navItems} brandIcon={brandIcon} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain thin-scrollbar px-4 pb-28 pt-5 lg:px-8 lg:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
