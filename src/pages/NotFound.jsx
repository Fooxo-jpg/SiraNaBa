import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50 p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-forest-600">404</p>
      <h1 className="text-2xl font-bold text-ink-900">This page doesn't exist.</h1>
      <p className="text-sm text-ink-700/60">The page you're looking for may have moved.</p>
      <Link
        to="/"
        className="mt-2 rounded-md bg-forest-500 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-600"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
