const baseControl =
  'block w-full rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ' +
  'placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-50';

/** Label + control + help/error text, shared by every form in the app. */
export const Field = ({ label, htmlFor, error, hint, required, children, className = '' }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
      {label}
      {required && <span className="ml-0.5 text-rose-600">*</span>}
    </label>
    <div className="mt-1.5">{children}</div>
    {error ? (
      <p className="mt-1.5 text-xs text-rose-600">{error}</p>
    ) : (
      hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    )}
  </div>
);

export const TextInput = ({ error, className = '', ...props }) => (
  <input
    className={`${baseControl} ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  />
);

export const TextArea = ({ error, className = '', ...props }) => (
  <textarea
    className={`${baseControl} ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  />
);

export const Select = ({ error, className = '', children, ...props }) => (
  <select
    className={`${baseControl} bg-white ${error ? 'ring-rose-400' : 'ring-slate-300'} ${className}`}
    {...props}
  >
    {children}
  </select>
);

export default Field;
