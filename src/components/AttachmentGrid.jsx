import React, { useRef } from 'react';
import Icon from './Icon.jsx';

export const MAX_ATTACHMENTS = 5;

// Turns a FileList into serializable attachment records. previewUrl is a
// blob: URL, so it only lasts for the current browser session - good enough
// for this in-memory mock, but a real backend integration should replace it
// with an uploaded file URL.
export async function filesToAttachments(fileList) {
  return Promise.all(Array.from(fileList).map(async (file, i) => ({
    id: `att_${Date.now()}_${i}`,
    name: file.name,
    type: file.type,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    // Persist the media with the ticket so queued server-side Gemini triage can
    // inspect it after the browser's temporary blob URL has expired.
    dataUrl: await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }),
  })));
}

export default function AttachmentGrid({ attachments = [], onAdd, onRemove, max = MAX_ATTACHMENTS }) {
  const inputRef = useRef(null);
  const atLimit = attachments.length >= max;

  const handleChange = async (e) => {
    const remaining = Math.max(0, max - attachments.length);
    const picked = Array.from(e.target.files).slice(0, remaining);
    if (picked.length) onAdd(await filesToAttachments(picked));
    e.target.value = '';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-sand-100"
        >
          {a.previewUrl ? (
            <img src={a.previewUrl} alt={a.name || a.label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-ink-700/40">
              <Icon name="fileText" size={16} />
              <span className="w-full truncate text-center text-[8px] uppercase leading-tight">
                {a.name || a.label || 'File'}
              </span>
            </div>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              aria-label={`Remove ${a.name || a.label}`}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon name="close" size={10} />
            </button>
          )}
        </div>
      ))}
      {onAdd && !atLimit && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/15 text-ink-700/40 hover:bg-sand-50"
        >
          <Icon name="plus" size={16} />
          <span className="text-[10px]">Add</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
