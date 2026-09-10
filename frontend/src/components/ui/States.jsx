import Button from './Button.jsx';

export const Spinner = ({ className = 'h-6 w-6' }) => (
  <span
    aria-hidden="true"
    className={`inline-block animate-spin rounded-full border-2 border-brand-600 border-r-transparent ${className}`}
  />
);

export const LoadingState = ({ label = 'Loading…', className = '' }) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-slate-500 ${className}`}>
    <Spinner />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
    <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
    {message && <p className="mt-1.5 text-sm text-rose-700">{message}</p>}
    {onRetry && (
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const EmptyState = ({ title, message, action }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
    <h3 className="text-base font-semibold text-slate-800">{title}</h3>
    {message && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{message}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
