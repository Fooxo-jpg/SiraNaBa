import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const notify = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, tone: options.tone || 'success', action: options.action }]);
    window.setTimeout(() => dismiss(id), options.duration || 5000);
    return id;
  }, [dismiss]);
  return <ToastContext.Provider value={{ notify, dismiss }}>{children}<div className="fixed bottom-20 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-4" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`flex items-center gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg ${toast.tone === 'error' ? 'border-status-high/30 text-status-high' : 'border-forest-200 text-ink-900'}`}><span className="flex-1">{toast.message}</span>{toast.action && <button type="button" onClick={() => { toast.action.onClick(); dismiss(toast.id); }} className="font-semibold text-forest-700 underline">{toast.action.label}</button>}<button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="text-lg leading-none text-ink-700/40">×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
