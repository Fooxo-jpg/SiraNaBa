import React from 'react';

/**
 * columns: [{ key, header, align?, render?(row) }]
 * rows: array of records, must include a stable `id`
 */
export default function DataTable({ columns, rows, emptyLabel = 'No records yet.' }) {
  if (!rows?.length) {
    return (
      <div className="py-10 text-center text-sm text-ink-700/60">{emptyLabel}</div>
    );
  }

  return (
    <div className="overflow-x-auto thin-scrollbar">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-ink-700/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap py-3 font-medium ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/5 last:border-0">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap py-3.5 pr-4 text-ink-900 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
