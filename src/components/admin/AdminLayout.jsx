import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminTopbar from './AdminTopbar.jsx';

export default function AdminLayout({ crumb, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-sand-50">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar crumb={crumb} onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto thin-scrollbar px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
