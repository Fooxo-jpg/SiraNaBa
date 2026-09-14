import React from 'react';
import Layout from '../components/Layout.jsx';
import Card from '../components/Card.jsx';
import { useSession } from '../context/SessionContext.jsx';

export default function Settings() {
  const { tenant } = useSession();

  return (
    <Layout crumb="Account Settings">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Account Settings</h1>
          <p className="text-sm text-ink-700/60">Update your profile and notification preferences.</p>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 font-semibold text-ink-900">Profile</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-900">First name</label>
              <input
                defaultValue={tenant?.firstName}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-900">Last name</label>
              <input
                defaultValue={tenant?.lastName}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-forest-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-900">Unit</label>
              <input
                defaultValue={tenant?.unit}
                disabled
                className="w-full rounded-lg border border-black/10 bg-sand-50 px-3 py-2.5 text-sm text-ink-700/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-900">Building</label>
              <input
                defaultValue={tenant?.building}
                disabled
                className="w-full rounded-lg border border-black/10 bg-sand-50 px-3 py-2.5 text-sm text-ink-700/60"
              />
            </div>
          </div>
          <button className="mt-5 rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600">
            Save Changes
          </button>
        </Card>
      </div>
    </Layout>
  );
}
