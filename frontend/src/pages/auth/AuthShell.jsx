import { Link } from 'react-router-dom';

/** Shared centred card used by login, forgot password and reset password. */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
          aria-hidden="true"
        >
          V
        </span>
        <span className="text-sm font-bold text-slate-900">Vasudha Data Platform</span>
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>}
    </div>
  </div>
);

export default AuthShell;
