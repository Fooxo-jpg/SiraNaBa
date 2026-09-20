import React, { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }) {
  const dialogRef = useRef(null);
  // Keep the latest onClose in a ref. Callers usually pass an inline function,
  // which changes every render; if it were an effect dependency, the effect
  // would re-run on every keystroke and re-focus the dialog, stealing focus
  // from the input being typed in.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    // Focus the dialog once on open, but don't override an autofocused field.
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full ${maxWidth} rounded-card bg-white p-6 shadow-xl outline-none`}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-1 text-ink-700/60 hover:bg-sand-100"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="text-sm text-ink-900">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
