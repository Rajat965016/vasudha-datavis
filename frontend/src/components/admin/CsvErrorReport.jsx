/**
 * Renders the structured validation feedback the API returns for a rejected
 * CSV — missing columns and, per offending row, the exact column and reason.
 */
const CsvErrorReport = ({ error }) => {
  if (!error) return null;

  const { message, rowErrors = [], missingColumns = [], foundColumns = [], fieldErrors = [] } = error;

  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
    >
      <p className="font-semibold">{message}</p>

      {missingColumns.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Missing columns
          </p>
          <ul className="space-y-1">
            {missingColumns.map((column) => (
              <li key={column.key} className="text-xs">
                <b>{column.label}</b> — accepted headers: {column.aliases.join(', ')}
              </li>
            ))}
          </ul>
          {foundColumns.length > 0 && (
            <p className="text-xs text-rose-700">
              Your file has: {foundColumns.join(', ')}
            </p>
          )}
        </div>
      )}

      {fieldErrors.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {fieldErrors.map((issue) => (
            <li key={`${issue.field}-${issue.message}`}>
              <b>{issue.field}</b>: {issue.message}
            </li>
          ))}
        </ul>
      )}

      {rowErrors.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Row-level problems
          </p>
          <div className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-white ring-1 ring-rose-200">
            <table className="min-w-full divide-y divide-rose-100 text-xs">
              <thead className="bg-rose-50/70">
                <tr>
                  <th scope="col" className="px-3 py-1.5 text-left font-semibold text-rose-800">Row</th>
                  <th scope="col" className="px-3 py-1.5 text-left font-semibold text-rose-800">Column</th>
                  <th scope="col" className="px-3 py-1.5 text-left font-semibold text-rose-800">Problem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {rowErrors.map((issue, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={index}>
                    <td className="px-3 py-1.5 text-rose-900">{issue.row ?? '—'}</td>
                    <td className="px-3 py-1.5 text-rose-900">{issue.column ?? '—'}</td>
                    <td className="px-3 py-1.5 text-rose-700">{issue.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvErrorReport;
