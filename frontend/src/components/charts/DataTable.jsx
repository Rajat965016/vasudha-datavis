import { useState } from 'react';

import { formatNumber, stripExtraPrefix } from '@/utils/format.js';

const PAGE_SIZE = 25;

const renderCell = (value, type) => {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'number') return formatNumber(value);
  return String(value);
};

/**
 * Renders the rows behind a visualisation. Columns come from the dataset's own
 * metadata, so any CSV shape displays correctly without special-casing.
 */
const DataTable = ({ columns = [], rows = [] }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // `periodSort` is an internal sorting helper, never shown to users.
  const displayColumns = columns.filter((column) => column.key !== 'periodSort');
  const visibleRows = rows.slice(0, visibleCount);

  return (
    <div className="space-y-2">
      <div className="max-h-80 overflow-auto rounded-lg ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {displayColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {stripExtraPrefix(column.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleRows.map((row, index) => (
              // Row objects have no stable id; index is safe here because the
              // list is read-only and never reordered.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index} className="even:bg-slate-50/60">
                {displayColumns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {renderCell(row[column.key], column.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {visibleRows.length} of {rows.length} rows
        </span>
        {visibleCount < rows.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
};

export default DataTable;
