import { useRef, useState } from 'react';

/** Splits a CSV line on commas that are not inside double quotes. */
const splitCsvLine = (line) =>
  line
    .match(/("([^"]|"")*"|[^,]*)(,|$)/g)
    ?.slice(0, -1)
    .map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? [];

const PREVIEW_ROWS = 5;

/**
 * File picker with drag-and-drop and a local preview of the first few rows, so
 * an Admin can sanity-check the file before submitting it for validation.
 */
const CsvDropzone = ({ file, onFileSelected, helpText }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);

  const readPreview = (selected) => {
    if (!selected) {
      setPreview(null);
      return;
    }
    // Only the head of the file is needed for a preview.
    selected
      .slice(0, 64 * 1024)
      .text()
      .then((text) => {
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        if (lines.length === 0) {
          setPreview(null);
          return;
        }
        setPreview({
          headers: splitCsvLine(lines[0]),
          rows: lines.slice(1, PREVIEW_ROWS + 1).map(splitCsvLine),
        });
      })
      .catch(() => setPreview(null));
  };

  const handleSelect = (selected) => {
    onFileSelected(selected);
    readPreview(selected);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) handleSelect(dropped);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Choose a different file
              </button>
              <span className="text-xs text-slate-300" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Drag a <b>.csv</b> file here, or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-semibold text-brand-700 underline hover:text-brand-800"
              >
                browse
              </button>
            </p>
            {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
          </div>
        )}
      </div>

      {preview && (
        <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
          <p className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            File preview — first {preview.rows.length} row{preview.rows.length === 1 ? '' : 's'}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-white">
                <tr>
                  {preview.headers.map((header, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <th key={index} scope="col" className="px-3 py-1.5 text-left font-semibold text-slate-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {preview.rows.map((row, rowIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={rowIndex}>
                    {preview.headers.map((_, cellIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <td key={cellIndex} className="whitespace-nowrap px-3 py-1.5 text-slate-600">
                        {row[cellIndex] ?? ''}
                      </td>
                    ))}
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

export default CsvDropzone;
